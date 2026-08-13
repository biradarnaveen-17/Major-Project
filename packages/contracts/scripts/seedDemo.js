const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const LAND_ID = 9002;

async function seedBase(contract, registrar, buyer, buyerAddress) {
  await (await contract.connect(registrar).registerLand(LAND_ID, registrar.address, "DEMO-9001", "Bengaluru, Karnataka", 1200)).wait();
  await (await contract.connect(registrar).requestTransfer(LAND_ID, buyerAddress)).wait();
  await (await contract.connect(registrar).approveTransfer(LAND_ID)).wait();
  await (await contract.connect(buyer).transferOwnership(LAND_ID)).wait();
}

async function seedOptimized(contract, registrar, buyer, buyerAddress) {
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("DEMO-9001|Bengaluru, Karnataka|1200"));
  await (await contract.connect(registrar).registerLand(LAND_ID, registrar.address, metadataHash, 1200)).wait();
  await (await contract.connect(registrar).requestTransfer(LAND_ID, buyerAddress)).wait();
  await (await contract.connect(registrar).approveTransfer(LAND_ID)).wait();
  await (await contract.connect(buyer).transferOwnership(LAND_ID)).wait();
}

async function main() {
  const deploymentPath = process.env.DEPLOYMENT_PATH || path.resolve(__dirname, "../../../docs/deployment-local.json");
  if (!fs.existsSync(deploymentPath)) throw new Error("Deploy contracts first: npm run deploy:local --workspace packages/contracts");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [registrar, buyer] = await ethers.getSigners();
  const buyerAddress = await buyer.getAddress();
  await seedBase(await ethers.getContractAt("BaseLandRegistry", deployment.contracts.base), registrar, buyer, buyerAddress);
  await seedOptimized(await ethers.getContractAt("OptimizedLandRegistry", deployment.contracts.optimized), registrar, buyer, buyerAddress);
  console.log(`Seeded completed transfer for land ${LAND_ID} in both contracts. Current owner: ${buyerAddress}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
