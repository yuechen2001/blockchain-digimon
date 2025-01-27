import pkg from 'hardhat';
const { ethers, run } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Deploying DigimonMarketplace contract...");

    // Get the network
    const network = await ethers.provider.getNetwork();
    console.log(`Deploying to network: ${network.name} (chainId: ${network.chainId})`);

    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Deploy the contract
    const DigimonMarketplace = await ethers.getContractFactory("DigimonMarketplace");
    const digimonMarketplace = await DigimonMarketplace.deploy(deployer.address);
    await digimonMarketplace.waitForDeployment();

    const address = await digimonMarketplace.getAddress();
    console.log(`DigimonMarketplace deployed to: ${address}`);

    // Update the contract address in .env file
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('NEXT_PUBLIC_CONTRACT_ADDRESS=')) {
        envContent = envContent.replace(
            /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
            `NEXT_PUBLIC_CONTRACT_ADDRESS='${address}'`
        );
    } else {
        envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS='${address}'`;
    }    
    fs.writeFileSync(envPath, envContent);
    console.log(`Contract address updated in .env file`);

    // Update the contract ABI in the ABI folder
    const abiFileContent = `export const DIGIMON_MARKETPLACE_ABI = ${JSON.stringify(DigimonMarketplace.interface.format('json'), null, 2)};`;
    
    // Ensure the abi directory exists
    const abiDir = path.join(__dirname, '..', 'data', 'abi');
    if (!fs.existsSync(abiDir)){
        fs.mkdirSync(abiDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(abiDir, 'DigimonMarketplace.ts'), abiFileContent);
    console.log(`Contract ABI updated in ABI folder`);

    // Verify the contract if we're on a testnet or mainnet
    if (network.name !== 'hardhat' && network.name !== 'localhost') {
        console.log('Waiting for block confirmations...');
        const deploymentReceipt = await digimonMarketplace.deploymentTransaction().wait(5);
        
        console.log('Verifying contract...');
        try {
            await run('verify:verify', {
                address: address,
                constructorArguments: [deployer.address],
            });
            console.log('Contract verified successfully');
        } catch (error) {
            console.log('Error verifying contract:', error.message);
        }
    }

    return digimonMarketplace;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
