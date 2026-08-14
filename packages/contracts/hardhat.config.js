const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");

const { RPC_URL, DEPLOYER_PRIVATE_KEY, GANACHE_MNEMONIC, REPORT_GAS, COINMARKETCAP_API_KEY } = process.env;
const localDemoMnemonic = GANACHE_MNEMONIC || "test test test test test test test test test test test junk";
const ganacheAccounts = {
  mnemonic: localDemoMnemonic,
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10
};

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: RPC_URL || "http://127.0.0.1:8545",
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : ganacheAccounts
    },
    ganache: {
      url: RPC_URL || "http://ganache:8545",
      accounts: ganacheAccounts
    },
polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : ganacheAccounts
}
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY || undefined,
    outputFile: "gas-report.txt",
    noColors: true
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
