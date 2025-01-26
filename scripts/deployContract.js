import { ethers } from "ethers";

async function main() {
    const DigimonMarketplace = await ethers.getContractFactory("DigimonMarketplace");
    const digimonMarketplace = await DigimonMarketplace.deploy();
    await digimonMarketplace.deployed();
    console.log("DigimonMarketplace deployed to:", digimonMarketplace.address);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
