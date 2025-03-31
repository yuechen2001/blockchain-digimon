/**
 * Comprehensive deployment script for DigimonToken and DigimonMarketplace contracts
 * Handles deployment to different environments (development, test, production)
 * Combines environment-specific configuration with ABI saving functionality
 */
const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");
const deployConfig = require("../deploy-config.cjs");

// Get the environment from command line args or default to development
const environment = process.env.DEPLOY_ENV || "development";
const config = deployConfig[environment];

// Verify contract on Etherscan (only for test and production)
async function verify(contractAddress, args) {
  if (!config.verifyContracts) return;
  
  console.log(`\nVerifying contract at ${contractAddress}...`);
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
    console.log("✅ Contract verified on Etherscan");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("Contract already verified");
    } else {
      console.error("Error verifying contract:", error);
    }
  }
}

// Save deployment information to JSON files
function saveDeploymentInfo(contractAddresses) {
  // Save to deployments directory (for infrastructure tracking)
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentInfo = {
    ...contractAddresses,
    deployedAt: new Date().toISOString(),
    environment
  };
  
  const filePath = path.join(deploymentsDir, `${environment}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to ${filePath}`);
  
  // Save to src/config for frontend use
  const srcConfigDir = path.join(__dirname, '../src/config');
  if (!fs.existsSync(srcConfigDir)) {
    fs.mkdirSync(srcConfigDir, { recursive: true });
  }
  
  const addressesPath = path.join(srcConfigDir, 'addresses.json');
  fs.writeFileSync(addressesPath, JSON.stringify(contractAddresses, null, 2));
  console.log(`Contract addresses saved to ${addressesPath}`);
}

// Save ABIs to src/abis directory
function saveContractAbis(DigimonToken, DigimonMarketplace) {
  const abisDir = path.join(__dirname, '../src/abis');
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }
  
  // Match the format from deployContract.js by using the format method
  fs.writeFileSync(
    path.join(abisDir, 'DigimonMarketplace.json'), 
    JSON.stringify(DigimonMarketplace.interface.format('json'), null, 2)
  );
  
  fs.writeFileSync(
    path.join(abisDir, 'Token.json'), 
    JSON.stringify(DigimonToken.interface.format('json'), null, 2)
  );
  
  console.log(`ABIs saved to ${abisDir}`);
}

async function main() {
  console.log(`\n🚀 Deploying Digimon contracts to ${environment} (${config.networkName}) environment...\n`);

  // Get deployer account and network info
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  const network = await ethers.provider.getNetwork();
  
  // Deploy DigimonToken
  console.log("\nDeploying DigimonToken...");
  const DigimonToken = await ethers.getContractFactory("DigimonToken");
  const digimonToken = await DigimonToken.deploy("DigimonToken", "DIGI");
  await digimonToken.waitForDeployment();
  const tokenAddress = await digimonToken.getAddress();
  console.log(`DigimonToken deployed to: ${tokenAddress}`);

  // Deploy DigimonMarketplace
  console.log("\nDeploying DigimonMarketplace...");
  const DigimonMarketplace = await ethers.getContractFactory("DigimonMarketplace");
  const digimonMarketplace = await DigimonMarketplace.deploy(deployer.address, tokenAddress);
  await digimonMarketplace.waitForDeployment();
  const marketplaceAddress = await digimonMarketplace.getAddress();
  console.log(`DigimonMarketplace deployed to: ${marketplaceAddress}`);

  // Grant MINTER_ROLE to Marketplace
  console.log(`\nSetting up roles...`);
  const MINTER_ROLE = await digimonToken.MINTER_ROLE();
  await digimonToken.grantRole(MINTER_ROLE, marketplaceAddress);
  console.log(`✅ Granted MINTER_ROLE to DigimonMarketplace`);
  console.log(`✅ Deployer (${deployer.address}) retains admin privileges`);
  
  // Save contract addresses
  const contractAddresses = {
    DigimonToken: tokenAddress,
    DigimonMarketplace: marketplaceAddress,
    networkName: network.name,
    deployedAt: new Date().toISOString()
  };
  
  // Save deployment info and ABIs
  saveDeploymentInfo(contractAddresses);
  saveContractAbis(DigimonToken, DigimonMarketplace);

  // Verify contracts on non-local networks
  if (config.verifyContracts && network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log("\nWaiting for transaction confirmations before verification...");
    // Wait to ensure contracts are deployed before verification
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      await verify(tokenAddress, ["DigimonToken", "DIGI"]);
      await verify(marketplaceAddress, [deployer.address, tokenAddress]);
      console.log('Contracts verified successfully');
    } catch (error) {
      console.log('Error verifying contracts:', error.message);
    }
  }
  
  console.log("\n✨ Deployment complete! ✨");
  
  return { digimonToken, digimonMarketplace };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
