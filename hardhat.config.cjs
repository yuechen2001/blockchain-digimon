/** @type import('hardhat/config').HardhatUserConfig */

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { MORALIS_NODE_URL, PRIVATE_KEY } = process.env;

module.exports = {
    solidity: "0.8.22",
    defaultNetwork: "hardhat",
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
    },
    networks: {
        hardhat: {
            gasPrice: 0,
            initialBaseFeePerGas: 0,
        },
        sepolia: {
            url: MORALIS_NODE_URL,
            accounts: [
                PRIVATE_KEY,
            ],
        },
    },
    logger: {
        showLogs: true
    }
}
