import pkg from 'hardhat';
const { ethers, run } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Deploying Digimon contracts...");
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    // Deploy DigimonToken
    const DigimonToken = await ethers.getContractFactory("DigimonToken");
    const digimonToken = await DigimonToken.deploy("DigimonToken", "DIGI");
    await digimonToken.waitForDeployment();
    const tokenAddress = await digimonToken.getAddress();
    console.log(`DigimonToken deployed to: ${tokenAddress}`);

    // Deploy DigimonMarketplace
    const DigimonMarketplace = await ethers.getContractFactory("DigimonMarketplace");
    const digimonMarketplace = await DigimonMarketplace.deploy(deployer.address, tokenAddress);
    await digimonMarketplace.waitForDeployment();
    const marketplaceAddress = await digimonMarketplace.getAddress();
    console.log(`DigimonMarketplace deployed to: ${marketplaceAddress}`);

    // Grant MINTER_ROLE to Marketplace
    const MINTER_ROLE = await digimonToken.MINTER_ROLE();
    await digimonToken.grantRole(MINTER_ROLE, marketplaceAddress);

    // Save contract addresses
    const contractAddresses = {
        DigimonToken: tokenAddress,
        DigimonMarketplace: marketplaceAddress,
        networkName: network.name,
        deployedAt: new Date().toISOString()
    };
    
    const srcConfigDir = path.join(__dirname, '../src/config');
    if (!fs.existsSync(srcConfigDir)) {
        fs.mkdirSync(srcConfigDir, { recursive: true });
    }
    
    const addressesPath = path.join(srcConfigDir, 'addresses.json');
    fs.writeFileSync(addressesPath, JSON.stringify(contractAddresses, null, 2));
    
    // Save ABIs
    const abisDir = path.join(__dirname, '../src/abis');
    if (!fs.existsSync(abisDir)) {
        fs.mkdirSync(abisDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(abisDir, 'DigimonMarketplace.json'), 
        JSON.stringify(DigimonMarketplace.interface.format('json'), null, 2)
    );
    
    fs.writeFileSync(
        path.join(abisDir, 'Token.json'), 
        JSON.stringify(DigimonToken.interface.format('json'), null, 2)
    );

    // Verify contracts on non-local networks
    if (network.name !== 'hardhat' && network.name !== 'localhost') {
        await digimonMarketplace.deploymentTransaction().wait(5);
        
        try {
            await run('verify:verify', {
                address: tokenAddress,
                constructorArguments: ["DigimonToken", "DIGI"],
            });
            
            await run('verify:verify', {
                address: marketplaceAddress,
                constructorArguments: [deployer.address, tokenAddress],
            });
            console.log('Contracts verified successfully');
        } catch (error) {
            console.log('Error verifying contracts:', error.message);
        }
    }

    return { digimonToken, digimonMarketplace };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
