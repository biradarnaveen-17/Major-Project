const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const LOADS = (process.env.BENCHMARK_LOADS || "10,100,500").split(",").map(Number).filter((value) => value > 0);

async function deploy(name) {
  const Factory = await ethers.getContractFactory(name);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

async function execute(items, concurrent) {
  const started = performance.now();
  const settled = concurrent
    ? await Promise.allSettled(items.map((item) => item()))
    : await items.reduce(async (previous, item) => [...(await previous), await item().then(value => ({ status: "fulfilled", value })).catch(reason => ({ status: "rejected", reason }))], Promise.resolve([]));
  const receipts = await Promise.all(settled.filter((item) => item.status === "fulfilled").map((item) => item.value.wait()));
  return {
    gas: receipts.reduce((total, receipt) => total + Number(receipt.gasUsed), 0),
    failures: settled.filter((item) => item.status === "rejected").length,
    elapsedMs: Number((performance.now() - started).toFixed(2))
  };
}

async function scenario(contractName, count, mode, signers) {
  const [admin, registrar, owner, buyer] = signers;
  const contract = await deploy(contractName);
  await (await contract.connect(admin).setRegistrar(registrar.address, true)).wait();
  const ids = Array.from({ length: count }, (_, index) => BigInt(100000 + index));
  const concurrent = mode === "concurrent";
  const metadata = ethers.keccak256(ethers.toUtf8Bytes("BENCHMARK|MYSURU|2400"));
  const registration = await execute(ids.map((id) => () => contractName === "BaseLandRegistry"
    ? contract.connect(registrar).registerLand(id, owner.address, `SUR-${id}`, "Mysuru", 2400)
    : contract.connect(registrar).registerLand(id, owner.address, metadata, 2400)), concurrent);
  const request = await execute(ids.map((id) => () => contract.connect(owner).requestTransfer(id, buyer.address)), concurrent);
  const approval = await execute(ids.map((id) => () => contract.connect(registrar).approveTransfer(id)), concurrent);
  const transfer = await execute(ids.map((id) => () => contract.connect(buyer).transferOwnership(id)), concurrent);
  const stages = { registerLand: registration, requestTransfer: request, approveTransfer: approval, transferOwnership: transfer };
  const totalGas = Object.values(stages).reduce((total, stage) => total + stage.gas, 0);
  const totalFailures = Object.values(stages).reduce((total, stage) => total + stage.failures, 0);
  const elapsedMs = Object.values(stages).reduce((total, stage) => total + stage.elapsedMs, 0);
  return { contract: contractName, mode, load: count, stages, totalGas, gasPerLifecycle: Math.round(totalGas / count), failureRate: Number(((totalFailures / (count * 4)) * 100).toFixed(2)), elapsedMs: Number(elapsedMs.toFixed(2)) };
}

async function main() {
  const signers = await ethers.getSigners();
  const results = [];
  for (const load of LOADS) for (const mode of ["sequential", "concurrent"]) for (const contract of ["BaseLandRegistry", "OptimizedLandRegistry"]) {
    results.push(await scenario(contract, load, mode, signers));
  }
  const output = { generatedAt: new Date().toISOString(), loads: LOADS, results };
  const destination = path.resolve(__dirname, "../../../docs/experiments/load-benchmark-latest.json");
  fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`);
  console.table(results.map(({ contract, mode, load, totalGas, gasPerLifecycle, failureRate, elapsedMs }) => ({ contract, mode, load, totalGas, gasPerLifecycle, failureRate, elapsedMs })));
  console.log(`Report written to ${destination}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
