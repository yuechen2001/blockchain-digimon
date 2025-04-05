/** @type import('hardhat/config').HardhatUserConfig */

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Environment variable handling with validation and fallbacks
const MORALIS_NODE_URL = process.env.MORALIS_NODE_URL || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const REPORT_GAS = process.env.REPORT_GAS === 'true';
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || '';

// Validation for production networks
function validateConfig() {
  const currentNetwork = process.env.HARDHAT_NETWORK;
  
  // Only validate when targeting external networks (not hardhat or localhost)
  if (currentNetwork && !['hardhat', 'localhost'].includes(currentNetwork)) {
    if (!MORALIS_NODE_URL) {
      console.error("❌ MORALIS_NODE_URL is required for network:", currentNetwork);
      process.exit(1);
    }
    
    if (!PRIVATE_KEY) {
      console.error("❌ PRIVATE_KEY is required for network:", currentNetwork);
      process.exit(1);
    }

    if (!ETHERSCAN_API_KEY) {
      console.warn("⚠️ Warning: ETHERSCAN_API_KEY is not set. Contract verification will not work.");
    }
  }
}

// Run validation
validateConfig();

module.exports = {
    solidity: {
        version: "0.8.22",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,  // Higher value optimizes for runtime gas cost over deployment cost
            },
            viaIR: true,  // Enable the new Solidity IR-based compiler pipeline
            evmVersion: "paris",  // Using Paris EVM version for stability
        }
    },
    defaultNetwork: "hardhat",
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
    },
    networks: {
        hardhat: {
            gasPrice: 0,
            initialBaseFeePerGas: 0,
            chainId: 31337,
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        sepolia: {
            url: MORALIS_NODE_URL,
            accounts: PRIVATE_KEY,
            gasMultiplier: 1.2,  // Add buffer to estimated gas
            gasPrice: "auto",
        },
        mainnet: {
            url: MORALIS_NODE_URL,
            accounts: PRIVATE_KEY,
            gasPrice: "auto",
            gasMultiplier: 1.1,
        }
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: "ETH",
        gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
        excludeContracts: [],
        src: "./contracts",
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    logger: {
        showLogs: true
    },
    mocha: {
        timeout: 40000
    }
}
