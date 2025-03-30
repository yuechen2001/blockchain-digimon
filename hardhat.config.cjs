/** @type import('hardhat/config').HardhatUserConfig */

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { MORALIS_NODE_URL, PRIVATE_KEY, COINMARKETCAP_API_KEY } = process.env;

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
            accounts: [PRIVATE_KEY],
            gasMultiplier: 1.2,  // Add buffer to estimated gas
            gasPrice: "auto",
        },
        mainnet: {
            url: MORALIS_NODE_URL,
            accounts: process.env.PRIVATE_KEY ? [PRIVATE_KEY] : [],
            gasPrice: "auto",
            gasMultiplier: 1.1,
        }
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS ? true : false,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: "ETH",
        gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
        excludeContracts: [],
        src: "./contracts",
    },
    logger: {
        showLogs: true
    },
    mocha: {
        timeout: 40000
    }
}
