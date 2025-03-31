/**
 * Deployment configuration for different environments
 * This file contains network-specific configurations and deployment parameters
 */
require('dotenv').config();
const { ethers } = require("hardhat");

const config = {
  // Development environment
  development: {
    networkName: 'localhost',
    verifyContracts: false,
    gasPrice: 'auto',
  },
  
  // Test environment (e.g., Sepolia)
  test: {
    networkName: 'sepolia',
    verifyContracts: true,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    gasPrice: 'auto',
    gasMultiplier: 1.2,
  },
  
  // Production environment (Mainnet)
  production: {
    networkName: 'mainnet',
    verifyContracts: true,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    gasPrice: 'auto',
    gasMultiplier: 1.1,
    priorityFee: 2, // Base priority fee in gwei
  },
};

module.exports = config;
