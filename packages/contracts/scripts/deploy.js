const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function deploy(name) {
  const Factory = await ethers.getContractFactory(name);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  return await contract.getAddress();
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployment = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      base: await deploy("BaseLandRegistry"),
      optimized: await deploy("OptimizedLandRegistry")
    }
  };
  const destination = process.env.DEPLOYMENT_PATH || path.resolve(__dirname, "../../../docs/deployment-local.json");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
