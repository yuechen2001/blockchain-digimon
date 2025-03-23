import pkg from 'hardhat';
const { ethers } = pkg;
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper functions
function loadJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function loadContract(abiPath, address, signer) {
  const contractABI = loadJsonFile(path.join(__dirname, abiPath));
  return await ethers.getContractAt(contractABI, address, signer);
}

async function createListing(marketplace, tokenContract, tokenId) {
  try {
    const listingPrice = ethers.parseEther('0.1');
    const durationInDays = 7;
    const durationInSeconds = durationInDays * 24 * 60 * 60;
    
    // Approve marketplace first
    console.log(`[APPROVAL] Approving marketplace for token ${tokenId}...`);
    const approveTx = await tokenContract.approve(marketplace.target, tokenId);
    await approveTx.wait();
    console.log(`[APPROVAL] Successfully approved marketplace for token ${tokenId}`);
    
    // Wait a moment after approval
    await sleep(1000);
    
    // Proceed with listing
    console.log(`[LIST] Listing token ${tokenId} for ${ethers.formatEther(listingPrice)} ETH...`);
    const listTx = await marketplace.listDigimon(tokenId, listingPrice, durationInSeconds, { 
      value: ethers.parseEther('0.05')
    });
    
    const listingId = await getListingId(listTx, marketplace);
    if (listingId) {
      console.log(`[LIST] Success! New listing ID: ${listingId}`);
    }
    return true;
  } catch (error) {
    console.log(`[LIST] Failed: ${error.message.split('\n')[0]}`);
    return false;
  }
}

async function getListingId(transaction, contract) {
  try {
    const receipt = await transaction.wait();
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        
        if (parsedLog && parsedLog.name === 'DigimonListed') {
          return parsedLog.args[0].toString();
        }
      } catch {
        // Skip logs that can't be parsed
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function checkTokenExists(contract, tokenId) {
  try {
    await contract.getDigimon(tokenId);
    return true;
  } catch {
    return false;
  }
}

async function mintToken(marketplace, tokenId, tokenURI, name, mintedItems) {
  try {
    console.log(`[MINT] Minting token with URI: ${tokenURI}`);
    
    // The contract's mintDigimon function only takes the tokenURI parameter and requires payment
    const tx = await marketplace.mintDigimon(tokenURI, {
      value: ethers.parseEther('0.05') // Add the minting fee
    });
    const receipt = await tx.wait();
    
    // Try to get the actual token ID from the event
    let mintedTokenId = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = marketplace.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        
        if (parsedLog && parsedLog.name === 'DigimonMinted') {
          mintedTokenId = parsedLog.args[0];
          break;
        }
      } catch {
        // Skip logs that aren't our event
        continue;
      }
    }
    
    if (receipt.status === 1) {
      if (mintedTokenId) {
        console.log(`[MINT] Successfully minted token with ID: ${mintedTokenId}`);
        mintedItems.set(mintedTokenId.toString(), name);
      } else {
        console.log(`[MINT] Successfully minted token but couldn't retrieve ID`);
        mintedItems.set(tokenId.toString(), name); // Use the expected tokenId as fallback
      }
      return true;
    } else {
      console.log(`[MINT] Failed to mint token`);
      return false;
    }
  } catch (error) {
    console.log(`[MINT] Error: ${error.message.split('\n')[0]}`);
    return false;
  }
}

async function checkExistingListing(marketplace, tokenId) {
  try {
    const [_, hasListing] = await marketplace.getTokenListing(tokenId);
    if (hasListing) {
      console.log(`[LIST] Token ${tokenId} already has a listing`);
    }
    return hasListing;
  } catch {
    return false;
  }
}

async function listStoredDigimons() {
  try {
    console.log('[INIT] Starting Digimon listing process...');
    
    // Load configuration files
    const ipfsHashes = loadJsonFile(path.join(__dirname, '../data/stored_hashes/ipfsHashes.json'));
    const addresses = loadJsonFile(path.join(__dirname, '../src/config/addresses.json'));
    const tokenContractAddress = addresses.DigimonToken;
    const marketplaceContractAddress = addresses.DigimonMarketplace;
    
    // Initialize contracts
    const [signer] = await ethers.getSigners();
    const marketplace = await loadContract('../src/abis/DigimonMarketplace.json', marketplaceContractAddress, signer);
    const tokenContract = await loadContract('../src/abis/Token.json', tokenContractAddress, signer);
    
    // Log initialization info
    console.log(`[INIT] Marketplace contract: ${marketplaceContractAddress}`);
    console.log(`[INIT] Token contract: ${tokenContractAddress}`);
    console.log(`[INIT] Signer: ${signer.address}`);
    console.log(`[INIT] Processing ${Object.keys(ipfsHashes).length} Digimons`);
    
    // Process each Digimon
    let currentTokenId = 0;
    const mintedItems = new Map();
    
    for (const [name, hash] of Object.entries(ipfsHashes)) {
      console.log(`\n[PROCESS] ${name} (ID: ${currentTokenId})`);
      const tokenURI = `ipfs://${hash}`;
      
      // Step 1: Check if token exists and mint if needed
      const tokenExists = await checkTokenExists(marketplace, currentTokenId);
      if (!tokenExists) {
        console.log(`[MINT] Token ${currentTokenId} needs to be minted`);
        const mintSuccess = await mintToken(marketplace, currentTokenId, tokenURI, name, mintedItems);
        if (!mintSuccess) {
          currentTokenId++;
          continue;
        }
        await sleep(1000); // Wait after minting
      } else {
        console.log(`[CHECK] Token ${currentTokenId} already exists`);
      }
      
      // Step 2: Check if listing exists and create if needed
      const hasListing = await checkExistingListing(marketplace, currentTokenId);
      if (!hasListing) {
        await createListing(marketplace, tokenContract, currentTokenId);
      }
      
      currentTokenId++;
    }
    
    console.log('\n[DONE] Finished processing all Digimons');
    console.log(`[DONE] Minted ${mintedItems.size} new Digimons`);
  } catch (error) {
    console.error('[ERROR]', error.message.split('\n')[0]);
  }
}
async function main() {
  if (process.env.IS_RUNNING) return;
  await listStoredDigimons();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

export { listStoredDigimons };
