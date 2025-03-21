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

async function getMintedTokenId(transaction, contract) {
  try {
    const receipt = await transaction.wait();
    // In ethers v6, logs need to be parsed manually
    for (const log of receipt.logs) {
      try {
        // Try to find the DigimonMinted event
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'DigimonMinted') {
          return parsedLog.args[0].toString();
        }
      } catch (e) {
        // Skip logs that can't be parsed as our event
        continue;
      }
    }
    console.log('[MINT] No DigimonMinted event found in transaction');
    return null;
  } catch (error) {
    console.log(`[MINT] Error parsing transaction: ${error.message}`);
    return null;
  }
}

async function getListingId(transaction, contract) {
  try {
    const receipt = await transaction.wait();
    // In ethers v6, logs need to be parsed manually
    for (const log of receipt.logs) {
      try {
        // Try to find the DigimonListed event
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'DigimonListed') {
          return parsedLog.args[0].toString();
        }
      } catch (e) {
        // Skip logs that can't be parsed as our event
        continue;
      }
    }
    console.log('[LIST] No DigimonListed event found in transaction');
    return null;
  } catch (error) {
    console.log(`[LIST] Error parsing transaction: ${error.message}`);
    return null;
  }
}

async function getContractAddress() {
  try {
    // Read from src/config/addresses.json
    const addressesPath = path.join(__dirname, '../src/config/addresses.json');
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    console.log(`[INIT] Found contract address in src/config/addresses.json: ${addresses.DigimonMarketplace}`);
    return addresses.DigimonMarketplace;
  } catch (error) {
    console.error('[ERROR] Failed to read contract address:', error.message);
    throw new Error('Contract address not found. Make sure to deploy the contract first by running "npx hardhat run scripts/deployContract.js --network localhost"');
  }
}

async function checkTokenExists(contract, tokenId) {
  try {
    await contract.getDigimon(tokenId);
    return true;
  } catch (err) {
    return false;
  }
}

async function mintToken(contract, tokenId, tokenURI, name, mintedItems) {
  try {
    console.log(`[MINT] Minting ${name} (ID: ${tokenId})...`);
    const mintTx = await contract.mintDigimon(tokenURI, {
      value: ethers.parseEther('0.05')
    });
    
    const newTokenId = await getMintedTokenId(mintTx, contract);
    if (newTokenId) {
      console.log(`[MINT] Success! New token ID: ${newTokenId}`);
      mintedItems.set(tokenId, {
        name,
        tokenId: newTokenId,
        uri: tokenURI
      });
    } else {
      console.log(`[MINT] Success! Using original token ID: ${tokenId}`);
      mintedItems.set(tokenId, {
        name,
        tokenId: tokenId.toString(),
        uri: tokenURI
      });
    }
    return true;
  } catch (error) {
    console.log(`[MINT] Failed: ${error.message.substring(0, 100)}...`);
    return false;
  }
}

async function checkExistingListing(contract, tokenId) {
  try {
    const [listingInfo, hasListing] = await contract.getTokenListing(tokenId);
    if (hasListing) {
      console.log(`[LIST] Token ${tokenId} already has a listing`);
    }
    return hasListing;
  } catch (error) {
    return false;
  }
}

async function listToken(contract, tokenId, listingPrice, durationInSeconds) {
  try {
    console.log(`[LIST] Listing token ${tokenId} for ${ethers.formatEther(listingPrice)} ETH...`);
    const listTx = await contract.listDigimon(tokenId, listingPrice, durationInSeconds, { 
      value: ethers.parseEther('0.05')
    });
    
    const listingId = await getListingId(listTx, contract);
    if (listingId) {
      console.log(`[LIST] Success! New listing ID: ${listingId}`);
    } else {
      console.log(`[LIST] Success! No listing ID found`);
    }
    return true;
  } catch (error) {
    console.log(`[LIST] Failed: ${error.message.substring(0, 100)}...`);
    return false;
  }
}

async function listStoredDigimons(contractAddress) {
  try {
    console.log('[INIT] Loading contract and configuration...');
    const abiPath = path.join(__dirname, '../src/abis/DigimonMarketplace.json');
    const contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    contractAddress = contractAddress || await getContractAddress();
    const ipfsHashesPath = path.join(__dirname, '../data/stored_hashes/ipfsHashes.json');
    const ipfsHashes = JSON.parse(fs.readFileSync(ipfsHashesPath, 'utf8'));
    
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt(contractABI, contractAddress, signer);
    
    console.log(`[INIT] Using contract: ${contractAddress}`);
    console.log(`[INIT] Signer address: ${signer.address}`);
    console.log(`[INIT] Processing ${Object.keys(ipfsHashes).length} Digimons`);
    
    let currentTokenId = 0;
    const mintedItems = new Map();
    
    for (const [name, hash] of Object.entries(ipfsHashes)) {
      console.log(`\n[PROCESS] ${name} (ID: ${currentTokenId})`);
      const tokenURI = `ipfs://${hash}`;
      
      // Check if token exists
      const tokenExists = await checkTokenExists(contract, currentTokenId);
      if (tokenExists) {
        console.log(`[CHECK] Token ${currentTokenId} already exists`);
      } else {
        console.log(`[CHECK] Token ${currentTokenId} needs to be minted`);
      }
      
      // Mint token if needed
      if (!tokenExists) {
        const mintSuccess = await mintToken(contract, currentTokenId, tokenURI, name, mintedItems);
        if (!mintSuccess) {
          currentTokenId++;
          continue;
        }
      }
      
      // Wait before listing
      await sleep(1000);
      
      // Check if listing exists
      const listingPrice = ethers.parseEther('0.1');
      const durationInDays = 7;
      const durationInSeconds = durationInDays * 24 * 60 * 60;
      
      const hasListing = await checkExistingListing(contract, currentTokenId);
      
      // Create listing if needed
      if (!hasListing) {
        await listToken(contract, currentTokenId, listingPrice, durationInSeconds);
      }
      
      currentTokenId++;
    }
    
    console.log('\n[DONE] Finished processing all Digimons');
    console.log(`[DONE] Minted ${mintedItems.size} new Digimons`);
  } catch (error) {
    console.error('[ERROR]', error.message);
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
