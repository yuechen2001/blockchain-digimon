describe("DigimonMarketplace", function () {
  it("Should mint and list a Digimon", async function () {
    // const [owner, addr1, addr2] = await ethers.getSigners();

    const DigimonMarketplace = await ethers.getContractFactory("DigimonMarketplace");
    const digimonMarketplace = await DigimonMarketplace.deploy();

    await digimonMarketplace.deployed();

    const digimon = await digimonMarketplace.mintDigimon("https://example.com/agumon.json");
    await digimon.wait();

    expect(await digimonMarketplace.ownerOf(0)).to.equal(owner.address);

    await digimonMarketplace.listDigimon(0, ethers.utils.parseEther("1.0"));
    const listing = await digimonMarketplace.getListing(0);
    expect(listing.price).to.equal(ethers.utils.parseEther("1.0"));

    await digimonMarketplace.connect(addr1).buyDigimon(0, { value: ethers.utils.parseEther("1.0") });
    expect(await digimonMarketplace.ownerOf(0)).to.equal(addr1.address);
  });
});
