const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

function toNumber(value) {
  return Number(value.toString());
}

async function deployAndMeasure(contractName) {
  const Factory = await ethers.getContractFactory(contractName);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const deploymentReceipt = await contract.deploymentTransaction().wait();

  return {
    contract,
    deploymentGas: toNumber(deploymentReceipt.gasUsed)
  };
}

async function measure(label, txPromise) {
  const tx = await txPromise;
  const receipt = await tx.wait();

  return {
    operation: label,
    gasUsed: toNumber(receipt.gasUsed)
  };
}

async function runBaseScenario(signers) {
  const [, registrar, owner, newOwner] = signers;
  const { contract, deploymentGas } = await deployAndMeasure("BaseLandRegistry");

  await contract.setRegistrar(registrar.address, true);

  const operations = [
    await measure(
      "registerLand",
      contract.connect(registrar).registerLand(101, owner.address, "TS-SUR-101", "Hyderabad", 2400)
    ),
    await measure("requestTransfer", contract.connect(owner).requestTransfer(101, newOwner.address)),
    await measure("approveTransfer", contract.connect(registrar).approveTransfer(101)),
    await measure("transferOwnership", contract.connect(newOwner).transferOwnership(101)),
    await measure("getLandDetails", contract.getLandDetails(101))
  ];

  return {
    contract: "BaseLandRegistry",
    deploymentGas,
    operations
  };
}

async function runOptimizedScenario(signers) {
  const [, registrar, owner, newOwner] = signers;
  const { contract, deploymentGas } = await deployAndMeasure("OptimizedLandRegistry");
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("TS-SUR-101|Hyderabad|2400"));

  await contract.setRegistrar(registrar.address, true);

  const operations = [
    await measure("registerLand", contract.connect(registrar).registerLand(101, owner.address, metadataHash, 2400)),
    await measure("requestTransfer", contract.connect(owner).requestTransfer(101, newOwner.address)),
    await measure("approveTransfer", contract.connect(registrar).approveTransfer(101)),
    await measure("transferOwnership", contract.connect(newOwner).transferOwnership(101)),
    await measure("getLandDetails", contract.getLandDetails(101))
  ];

  return {
    contract: "OptimizedLandRegistry",
    deploymentGas,
    operations
  };
}

function buildComparison(base, optimized) {
  const rows = [
    {
      operation: "deployment",
      baseGas: base.deploymentGas,
      optimizedGas: optimized.deploymentGas
    }
  ];

  for (const baseOperation of base.operations) {
    const optimizedOperation = optimized.operations.find((item) => item.operation === baseOperation.operation);
    rows.push({
      operation: baseOperation.operation,
      baseGas: baseOperation.gasUsed,
      optimizedGas: optimizedOperation.gasUsed
    });
  }

  return rows.map((row) => {
    const delta = row.baseGas - row.optimizedGas;
    const reductionPercent = row.baseGas === 0 ? 0 : (delta / row.baseGas) * 100;

    return {
      ...row,
      delta,
      reductionPercent: Number(reductionPercent.toFixed(2))
    };
  });
}

function buildMarkdown(comparison) {
  const lines = [
    "# Gas Comparison Report",
    "",
    "This report compares the basic land registry contract against the optimized contract using the same registration and transfer lifecycle.",
    "",
    "| Operation | Base Gas | Optimized Gas | Gas Saved | Reduction |",
    "| --- | ---: | ---: | ---: | ---: |"
  ];

  for (const row of comparison) {
    lines.push(
      `| ${row.operation} | ${row.baseGas} | ${row.optimizedGas} | ${row.delta} | ${row.reductionPercent}% |`
    );
  }

  lines.push(
    "",
    "Notes:",
    "",
    "- BaseLandRegistry stores human-readable strings directly on-chain for easier inspection.",
    "- OptimizedLandRegistry stores a metadata hash, packs smaller values, uses custom errors, and avoids unnecessary default writes.",
    "- Gas values depend on compiler version, optimizer settings, EVM target, and local Hardhat configuration."
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const signers = await ethers.getSigners();
  const base = await runBaseScenario(signers);
  const optimized = await runOptimizedScenario(signers);
  const comparison = buildComparison(base, optimized);

  const outputDir = path.resolve(__dirname, "../../../docs/experiments");
  fs.mkdirSync(outputDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    compiler: "0.8.28",
    optimizer: {
      enabled: true,
      runs: 200
    },
    base,
    optimized,
    comparison
  };

  fs.writeFileSync(path.join(outputDir, "gas-comparison-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "gas-comparison-latest.md"), buildMarkdown(comparison));

  console.table(comparison);
  console.log(`\nReports written to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
