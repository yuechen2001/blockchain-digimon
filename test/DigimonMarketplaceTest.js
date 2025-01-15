import hardhatPkg from 'hardhat';
const { ethers } = hardhatPkg;

import chaiPkg from 'chai';
const { expect } = chaiPkg;

const owner = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe("DigimonMarketplace", function () {
  it("Should allow user to mint a Digimon", async function () {

    const DigimonMarketplace = await ethers.getContractFactory("DigimonMarketplace");
    const digimonMarketplace = await DigimonMarketplace.deploy(owner);
    await digimonMarketplace.waitForDeployment();

    console.log("DigimonMarketplace deployed to:", digimonMarketplace.address);
    const metadataURI = '../data/Agumon.json';

    let balance = await digimonMarketplace.balanceOf(user);
    expect(balance).to.equal(0);

    const newlyMinted = await digimonMarketplace.payToMint(user, metadataURI, { value: ethers.parseEther('0.05') });
    await newlyMinted.wait();

    balance = await digimonMarketplace.balanceOf(user);
    expect(balance).to.equal(1);

    expect(await digimonMarketplace.isContentOwned(metadataURI)).to.equal(true);
  });
});
