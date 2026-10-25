const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function deploy(name) {
  const Factory = await ethers.getContractFactory(name);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  return await contract.getAddress();
}

async function existingDeployment(destination, chainId) {
  try {
    const saved = JSON.parse(fs.readFileSync(destination, "utf8"));
    const base = saved?.contracts?.base;
    const optimized = saved?.contracts?.optimized;
    if (Number(saved?.chainId) !== chainId || !ethers.isAddress(base) || !ethers.isAddress(optimized)) return null;

    const [baseCode, optimizedCode] = await Promise.all([ethers.provider.getCode(base), ethers.provider.getCode(optimized)]);
    return baseCode !== "0x" && optimizedCode !== "0x" ? saved : null;
  } catch {
    return null;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const destination = process.env.DEPLOYMENT_PATH || path.resolve(__dirname, "../../../docs/deployment-local.json");
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const existing = await existingDeployment(destination, chainId);
  if (existing) {
    console.log("Reusing existing Ganache contract deployment.");
    return;
  }

  const deployment = {
    network: network.name,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      base: await deploy("BaseLandRegistry"),
      optimized: await deploy("OptimizedLandRegistry")
    }
  };
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
