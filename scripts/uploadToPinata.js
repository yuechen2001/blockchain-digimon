import pinataSdk from '@pinata/sdk';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { updateDigimonHash } from './ipfsMetadataHelper.js';

const pinata = new pinataSdk({
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretApiKey: process.env.PINATA_API_SECRET
});

console.log('📌 Connected to Pinata');

// Get all JSON files from the data directory
const dataDir = path.join(process.cwd(), 'data');
const files = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.json'))
    .filter(file => !file.includes('ipfsHashes')) // Exclude ipfsHashes.json
    .filter(file => !file.startsWith('.')); // Exclude hidden files

console.log('All files in data directory:', fs.readdirSync(dataDir));
console.log('Filtered files to upload:', files);
console.log(`Found ${files.length} Digimon data files`);

// Upload each file to Pinata
for (const file of files) {
    try {
        const filePath = path.join(dataDir, file);
        const readableStreamForFile = fs.createReadStream(filePath);
        
        const result = await pinata.pinFileToIPFS(readableStreamForFile, {
            pinataMetadata: {
                name: file
            }
        });

        const digimonName = path.basename(file, '.json');
        console.log(`✅ Uploaded ${file}`);
        console.log(`IPFS Hash: ${result.IpfsHash}`);
        console.log(`Pinata Link: https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
        console.log('------------------------');

        // Update ipfsHashes using helper
        updateDigimonHash(digimonName, result.IpfsHash);

    } catch (error) {
        console.error(`❌ Error uploading ${file}:`, error);
    }
}

console.log('🎉 All Digimon data uploaded successfully!');
