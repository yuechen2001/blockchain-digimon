/**
 * Comprehensive deployment script for DigimonToken and DigimonMarketplace contracts
 * Handles deployment to different environments (development, test, production)
 * Combines environment-specific configuration with ABI saving functionality
 * Also handles minting and listing Digimon NFTs after deployment
 */
const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");
const deployConfig = require("../deploy-config.cjs");
const { spawnSync, spawn, execSync } = require("child_process");

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

// Save deployment information to JSON files and output environment variable information
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
  
  // For development environment, append to history rather than overwriting
  if (environment === 'development') {
    let deploymentHistory = [];
    
    // Read existing file if it exists
    if (fs.existsSync(filePath)) {
      try {
        deploymentHistory = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // If it's not already an array (from old format), convert it
        if (!Array.isArray(deploymentHistory)) {
          deploymentHistory = [deploymentHistory];
        }
      } catch (error) {
        console.log(`Error reading existing deployment history: ${error.message}`);
        deploymentHistory = [];
      }
    }
    
    // Add new deployment to history
    deploymentHistory.push(deploymentInfo);
    
    // Write back the updated history
    fs.writeFileSync(filePath, JSON.stringify(deploymentHistory, null, 2));
    console.log(`\nDeployment info appended to history in ${filePath}`);
  } else {
    // For test and production, maintain single deployment record
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to ${filePath}`);
  }
  
  // Create a copy of .env.example with the current addresses if it doesn't exist
  const envExamplePath = path.join(__dirname, '../.env.example');
  const envContent = `# Contract addresses deployed on ${environment}
    NEXT_PUBLIC_DIGIMON_TOKEN_ADDRESS=${contractAddresses.DigimonToken}
    NEXT_PUBLIC_DIGIMON_MARKETPLACE_ADDRESS=${contractAddresses.DigimonMarketplace}
    NEXT_PUBLIC_NETWORK_NAME=${contractAddresses.networkName}

    # Add other environment variables here
  `;
  
  fs.writeFileSync(envExamplePath, envContent);
  console.log(`Environment variables example saved to ${envExamplePath}`);
  
  // Output instructions for setting up environment variables
  console.log('\n=================================================================');
  console.log('IMPORTANT: For Vercel deployment, add these environment variables:');
  console.log('=================================================================');
  console.log(`NEXT_PUBLIC_DIGIMON_TOKEN_ADDRESS=${contractAddresses.DigimonToken}`);
  console.log(`NEXT_PUBLIC_DIGIMON_MARKETPLACE_ADDRESS=${contractAddresses.DigimonMarketplace}`);
  console.log(`NEXT_PUBLIC_NETWORK_NAME=${contractAddresses.networkName}`);
  console.log('=================================================================\n');
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

// Function to setup the database
function setupDatabase() {
  console.log("Setting up the database...");
  try {
    execSync('node scripts/setup-db.js', { stdio: 'inherit' });
    console.log("Database setup complete.");
  } catch (error) {
    console.error("Error setting up the database:", error);
    process.exit(1);
  }
}

async function main() {
  setupDatabase();
  
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
  
  // Run initial setup (mint and list Digimons) if we're in development or test environment
  if (environment === 'development' || environment === 'test') {
    await injectDigimonNFTs(contractAddresses);
  }
  
  return { digimonToken, digimonMarketplace };
}

/**
 * Runs the listStoredDigimons.js script to mint and list Digimon NFTs
 * This creates an initial marketplace with items for testing
 */
async function injectDigimonNFTs(contractAddresses) {
  console.log("\n📋 Setting up initial marketplace items...");
  try {
    // Set environment variables for the child process
    const env = {
      ...process.env,
      NEXT_PUBLIC_DIGIMON_TOKEN_ADDRESS: contractAddresses.DigimonToken,
      NEXT_PUBLIC_DIGIMON_MARKETPLACE_ADDRESS: contractAddresses.DigimonMarketplace,
      NEXT_PUBLIC_NETWORK_NAME: contractAddresses.networkName,
      IS_DEPLOYED_SETUP: "true"
    };

    // Run listStoredDigimons script
    const scriptPath = path.join(__dirname, "listStoredDigimons.js");
    console.log("\n🔄 Running listStoredDigimons script to mint and list Digimons...");
    
    // Use spawnSync for synchronous execution within deploy script
    const result = spawnSync("node", ["--experimental-modules", scriptPath], {
      env,
      stdio: 'inherit',
      shell: true
    });

    if (result.error) {
      console.error("Error running listStoredDigimons script:", result.error);
      return;
    }
    
    console.log("\n✅ Initial marketplace setup complete!");
  } catch (error) {
    console.error("Failed to set up initial marketplace items:", error);
    console.log("You can manually run the listStoredDigimons.js script later.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
