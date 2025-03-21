import axios from 'axios';
import fs from 'fs';
import path from 'path';
import jsonToDigimon from './jsonToDigimon.js';
import { fileURLToPath } from 'url';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure the data directory exists
function ensureDirectoryExists(directory) {
  const fullPath = path.resolve(__dirname, directory);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
}

// Step 1: Fetch data from the API
async function fetchDigimonData() {
  try {
    // Ensure data directory exists
    ensureDirectoryExists('../data');
    
    // Save each metadata to a separate file
    // Limit i to 50 for testing purposes
    for (let i = 1; i <= 50; i++) {
      try {
        const response = await axios.get(`https://digi-api.com/api/v1/digimon/${i}`);
        const digimon = jsonToDigimon(response.data);
        const metadata = {
          id: digimon.id,
          name: digimon.name,
          images: digimon.images,
          attributes: digimon.attributes,
          fields: digimon.fields,
          releaseDate: digimon.releaseDate,
          descriptions: digimon.descriptions,
          skills: digimon.skills,
          priorEvolutions: digimon.priorEvolutions,
          nextEvolutions: digimon.nextEvolutions
        };

        const filePath = path.resolve(__dirname, `../data/${digimon.name.replace(/[<>:"/\\|?*]/g, '_')}.json`);
        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
        console.log(`Metadata for ${digimon.name} saved.`);
      } catch (error) {
        console.error(`Error fetching Digimon data for id ${i}:`, error.message);
      }
    }
    console.log('Metadata for all Digimon saved.');
  } catch (error) {
    console.error('Error fetching Digimon data:', error.message);
  }
}

// Run the script
fetchDigimonData();
