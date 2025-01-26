import fs from 'fs';
import path from 'path';

const ipfsHashesPath = path.join(process.cwd(), 'data', 'stored_hashes', 'ipfsHashes.json');

/**
 * Get the IPFS URI for a Digimon
 * @param {string} name - The name of the Digimon
 * @returns {string} The full IPFS URI
 */
export function getDigimonURI(name) {
    const hashes = JSON.parse(fs.readFileSync(ipfsHashesPath, 'utf8'));
    const hash = hashes[name];
    if (!hash) {
        throw new Error(`No IPFS hash found for Digimon: ${name}`);
    }
    return `ipfs://${hash}`;
}

/**
 * Get all available Digimon names
 * @returns {string[]} Array of Digimon names
 */
export function getAvailableDigimons() {
    const hashes = JSON.parse(fs.readFileSync(ipfsHashesPath, 'utf8'));
    return Object.keys(hashes);
}

/**
 * Get all Digimon URIs
 * @returns {Object.<string, string>} Object mapping Digimon names to their IPFS URIs
 */
export function getAllDigimonURIs() {
    const hashes = JSON.parse(fs.readFileSync(ipfsHashesPath, 'utf8'));
    const uris = {};
    for (const [name, hash] of Object.entries(hashes)) {
        uris[name] = `ipfs://${hash}`;
    }
    return uris;
}

/**
 * Update the IPFS hash for a Digimon
 * @param {string} name - The name of the Digimon
 * @param {string} hash - The IPFS hash
 */
export function updateDigimonHash(name, hash) {
    const hashes = JSON.parse(fs.readFileSync(ipfsHashesPath, 'utf8'));
    hashes[name] = hash;
    fs.writeFileSync(ipfsHashesPath, JSON.stringify(hashes, null, 2));
}
