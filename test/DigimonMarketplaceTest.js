import hardhatPkg from 'hardhat';
const { ethers } = hardhatPkg;

import chaiPkg from 'chai';
const { expect } = chaiPkg;

describe('DigimonMarketplace', function () {
  let digimonMarketplace;
  let owner;
  let user; 
  let seller;
  let buyer;
  let contractConnectedToUser;
  let metadataURI;
  let newlyMintedDigimon;
  let newlyListedDigimon;

  beforeEach(async function () {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    user = accounts[1];
    seller = accounts[2];
    buyer = accounts[3];

    // Test variables
    metadataURI = '../data/Agumon.json';
    newlyMintedDigimon = {
      id: 1,
      tokenURI: metadataURI,
      owner: user.address
    };
    newlyListedDigimon = {
      id: 1,
      digimonId: 1,
      seller: user.address,
      price: ethers.parseEther('0.02')
    }

    // Deploy DigimonMarketplace
    const DigimonMarketplace = await ethers.getContractFactory('DigimonMarketplace');
    digimonMarketplace = await DigimonMarketplace.deploy(owner.address);
    await digimonMarketplace.waitForDeployment();
    contractConnectedToUser = digimonMarketplace.connect(user);

    // Mint a Digimon/NFT to user
    const mintTx = await digimonMarketplace.connect(user).payToMint(user.address, metadataURI, {
      value: ethers.parseEther('0.05')
    });
    await mintTx.wait();
  });

  it('should be deployed successfully', async function () {
    expect(digimonMarketplace.target).to.not.equal(undefined);
    expect(await digimonMarketplace.owner()).to.equal(owner.address);
  });

  it('should allow user to mint a Digimon', async function () {
    // Test the event emission of payToMint function
    await expect(digimonMarketplace.connect(user).payToMint(user.address, newlyMintedDigimon.tokenURI, {
      value: ethers.parseEther('0.05')
    }))
      .to.emit(digimonMarketplace, 'DigimonMinted')
      .withArgs(user.address, newlyMintedDigimon.id, newlyMintedDigimon.tokenURI);

    // Test the minting process for the payToMint function
    const mintTx = await digimonMarketplace.connect(user).payToMint(user.address, newlyMintedDigimon.tokenURI, {
      value: ethers.parseEther('0.05')
    });
    const mintReceipt = await mintTx.wait();

    // Extract tokenId from the Transfer event and verify owner of the minted Digimon
    const mintEvent = mintReceipt.logs.find(e => e.fragment.name === 'DigimonMinted');
    const mintedTokenId = mintEvent.args.tokenId;

    expect(await digimonMarketplace.ownerOf(mintedTokenId)).to.equal(user.address);
  });

  it('should allow user to list a minted Digimon', async function () {

    // Test the event emission of listDigimon function
    await expect(contractConnectedToUser.listDigimon(newlyMintedDigimon.id, ethers.parseEther('0.05'), {
      value: ethers.parseEther('0.05')
    }))
      .to.emit(digimonMarketplace, 'DigimonListed')
      .withArgs(newlyMintedDigimon.id, user.address, ethers.parseEther('0.05'));

    // Test the listing process for the listDigimon function
    const listTx = await contractConnectedToUser.listDigimon(newlyMintedDigimon.id, ethers.parseEther('0.05'), {
      value: ethers.parseEther('0.05')
    });
    const listReceipt = await listTx.wait();

    // Extract tokenId from the Transfer event and verify owner of the minted Digimon
    const listEvent = listReceipt.logs.find(e => e.fragment.name === 'DigimonListed');
    const listedTokenId = listEvent.args.tokenId;

    expect(await digimonMarketplace.ownerOf(listedTokenId)).to.equal(user.address);
  });

  
  it.only('should allow user to buy a listed Digimon', async function () {
    const contractconnectedToBuyer = digimonMarketplace.connect(buyer);

    // Test the event emission of buyDigimon function
    await expect(contractconnectedToBuyer.buyDigimon(newlyListedDigimon.id, {
      value: ethers.parseEther('0.05')
    }))
      .to.emit(digimonMarketplace, 'DigimonBought')
      .withArgs(newlyListedDigimon.id, user.address, ethers.parseEther('0.05'));

    // Test the buying process for the buyDigimon function
    const buyTx = await contractConnectedToUser.buyDigimon(1, {
      value: ethers.parseEther('0.05')
    });
    const buyReceipt = await buyTx.wait();

    // Extract tokenId from the Transfer event and verify owner of the minted Digimon
    const buyEvent = buyReceipt.logs.find(e => e.fragment.name === 'DigimonBought');
    const boughtTokenId = buyEvent.args.tokenId;

    // Verify owner of the bought Digimon
    expect(await digimonMarketplace.ownerOf(boughtTokenId)).to.equal(buyer.address);
  });
});

