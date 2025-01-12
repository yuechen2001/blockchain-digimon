import get from 'axios';
import * as fs from 'fs';
import mapJsonToDigimon from './jsonToDigimon';

// Step 1: Fetch data from the API
async function fetchDigimonData() {
    try {
        // Save each metadata to a separate file
        // Limit i to 10 for testing purposes. Remember to revert back to 1200
        for (let i = 1; i <= 10; i++) {
            try {
                const response = await get(`https://digi-api.com/api/v1/digimon/${i}`);
                const digimon = mapJsonToDigimon(response.data);
                const metadata = {
                    id: digimon.id,
                    name: digimon.name,
                    images: digimon.images,
                    attributes: digimon.attributes,
                    fields: digimon.fields
                };

                fs.closeSync(fs.openSync(`../data/${digimon.name}.json`, 'w'));
                fs.writeFileSync(`../data/${digimon.name}.json`, JSON.stringify(metadata, null, 2));
                console.log(`Metadata for ${digimon.name} saved.`);
            } catch (error) {
                console.error(`Error fetching Digimon data for id ${i}:`, error);
            }
        }
        console.log('Metadata for all Digimon saved.');
    } catch (error) {
        console.error('Error fetching Digimon data:', error);
    }
}

// Run the script
fetchDigimonData();

