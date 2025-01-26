import hardhatPkg from 'hardhat';
const { ethers } = hardhatPkg;

import chaiPkg from 'chai';
const { expect } = chaiPkg;

import { getDigimonURI } from '../scripts/ipfsMetadataHelper.js';

describe('DigimonMarketplace', function () {
  let digimonMarketplace;
  let owner;
  let user;
  let seller;
  let buyer;

  // Constants matching the contract
  const MINT_PRICE = ethers.parseEther('0.05');
  const LISTING_FEE = ethers.parseEther('0.05');
  const MAX_LISTING_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
  const MARKETPLACE_FEE = 250; // 2.5%

  // Test data
  const metadataURI = getDigimonURI('Agumon');

  beforeEach(async function () {
    [owner, user, seller, buyer] = await ethers.getSigners();

    const DigimonMarketplace = await ethers.getContractFactory('DigimonMarketplace');
    digimonMarketplace = await DigimonMarketplace.deploy(owner.address);

    // Mint a Digimon for seller to use in tests
    await digimonMarketplace.connect(seller).mintDigimon(metadataURI, {
      value: MINT_PRICE
    });
  });

  describe('Deployment', function () {
    it('should deploy successfully', async function () {
      expect(await digimonMarketplace.name()).to.equal("DigimonMarketplace");
      expect(await digimonMarketplace.symbol()).to.equal("DGM");
    });
  });

  describe('Minting', function () {
    it('should allow user to mint a Digimon with sufficient payment', async function () {
      const patagonURI = getDigimonURI('Betamon');
      await expect(
        digimonMarketplace.connect(user).mintDigimon(patagonURI, {
          value: MINT_PRICE
        })
      )
        .to.emit(digimonMarketplace, 'DigimonMinted')
        .withArgs(user.address, 1, patagonURI);
    });

    it('should fail to mint with insufficient payment', async function () {
      await expect(
        digimonMarketplace.connect(user).mintDigimon(metadataURI, {
          value: ethers.parseEther('0.01')
        })
      ).to.be.revertedWith('mintDigimon: Insufficient minting fee');
    });
  });

  describe('Listing', function () {
    it('should allow owner to list a Digimon', async function () {
      const price = ethers.parseEther('1');
      const duration = 7 * 24 * 60 * 60; // 7 days

      // Execute the listing
      const tx = await digimonMarketplace.connect(seller).listDigimon(0, price, duration, {
        value: LISTING_FEE
      });
      const receipt = await tx.wait();

      // Get block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block.timestamp) + BigInt(duration);

      // Get listing directly
      const listing = await digimonMarketplace.listings(0);
      
      // Basic checks first
      expect(listing.isActive).to.be.true;
      expect(listing.digimonId).to.equal(0);
      expect(listing.price).to.equal(price);
      expect(listing.seller).to.equal(seller.address);
      
      // Check expiry last
      console.log({
        blockTimestamp: block.timestamp,
        duration,
        expectedExpiry: expectedExpiry.toString(),
        actualExpiry: listing.expiresAt.toString()
      });
      expect(listing.expiresAt).to.equal(expectedExpiry);

      // Also verify the event
      const event = receipt.logs.find(e => e.fragment.name === 'DigimonListed');
      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(0); // tokenId
      expect(event.args[1]).to.equal(seller.address); // seller
      expect(event.args[2]).to.equal(price); // price
      expect(event.args[3]).to.equal(expectedExpiry); // expiresAt
    });

    it('should fail to list with price outside allowed range', async function () {
      const tooLowPrice = ethers.parseEther('0.001');
      await expect(
        digimonMarketplace.connect(seller).listDigimon(0, tooLowPrice, 7 * 24 * 60 * 60, {
          value: LISTING_FEE
        })
      ).to.be.revertedWith('validPrice: Price out of range');
    });

    it('should fail to list with excessive duration', async function () {
      const price = ethers.parseEther('1');
      await expect(
        digimonMarketplace.connect(seller).listDigimon(0, price, MAX_LISTING_DURATION + 1, {
          value: LISTING_FEE
        })
      ).to.be.revertedWith('listDigimon: Duration too long');
    });
  });

  describe('Buying', function () {
    const listingPrice = ethers.parseEther('1');
    const duration = 7 * 24 * 60 * 60; // 7 days

    beforeEach(async function () {
      // List the Digimon
      await digimonMarketplace.connect(seller).listDigimon(0, listingPrice, duration, {
        value: LISTING_FEE
      });
    });

    it('should allow buyer to purchase a listed Digimon', async function () {
      await expect(
        digimonMarketplace.connect(buyer).buyDigimon(0, {
          value: listingPrice
        })
      )
        .to.emit(digimonMarketplace, 'DigimonBought')
        .withArgs(0, buyer.address, listingPrice);

      // Verify ownership transfer
      expect(await digimonMarketplace.ownerOf(0)).to.equal(buyer.address);
    });

    it('should distribute fees correctly after purchase', async function () {
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const initialSellerBalance = await ethers.provider.getBalance(seller.address);

      // Buy the Digimon
      await digimonMarketplace.connect(buyer).buyDigimon(0, {
        value: listingPrice
      });

      // Calculate expected fees (convert all numbers to BigInt)
      const MARKETPLACE_FEE_BN = BigInt(MARKETPLACE_FEE);
      const listingPriceBN = BigInt(listingPrice);
      const marketplaceFee = (listingPriceBN * MARKETPLACE_FEE_BN) / 10000n;
      const sellerAmount = listingPriceBN - marketplaceFee;

      // Check pending withdrawals
      expect(await digimonMarketplace.getPendingWithdrawal(owner.address)).to.equal(marketplaceFee);
      expect(await digimonMarketplace.getPendingWithdrawal(seller.address)).to.equal(sellerAmount);

      // Withdraw funds
      await digimonMarketplace.connect(owner).withdrawFunds();
      await digimonMarketplace.connect(seller).withdrawFunds();

      // Check final balances
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      const finalSellerBalance = await ethers.provider.getBalance(seller.address);

      // Convert to BigInt for comparison
      expect(BigInt(finalOwnerBalance) - BigInt(initialOwnerBalance)).to.equal(marketplaceFee);
      expect(BigInt(finalSellerBalance) - BigInt(initialSellerBalance)).to.equal(sellerAmount);
    });

    it('should fail to buy with insufficient payment', async function () {
      await expect(
        digimonMarketplace.connect(buyer).buyDigimon(0, {
          value: ethers.parseEther('0.5')
        })
      ).to.be.revertedWith('buyDigimon: Insufficient payment');
    });

    it('should fail to buy an expired listing', async function () {
      // Increase time past duration
      await ethers.provider.send('evm_increaseTime', [duration + 1]);
      await ethers.provider.send('evm_mine');

      await expect(
        digimonMarketplace.connect(buyer).buyDigimon(0, {
          value: listingPrice
        })
      ).to.be.revertedWith('buyDigimon: Listing expired');
    });

    it('should handle concurrent buying attempts correctly', async function () {
      const buyer2 = (await ethers.getSigners())[4];

      // Both buyers try to buy simultaneously
      const buyTx1 = digimonMarketplace.connect(buyer).buyDigimon(0, {
        value: listingPrice
      });
      const buyTx2 = digimonMarketplace.connect(buyer2).buyDigimon(0, {
        value: listingPrice
      });

      // Wait for both transactions to complete or fail
      const results = await Promise.allSettled([buyTx1, buyTx2]);
      
      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;
      
      // Exactly one should succeed and one should fail
      expect(successes).to.equal(1, 'Exactly one transaction should succeed');
      expect(failures).to.equal(1, 'Exactly one transaction should fail');
      
      // The failed transaction should have the correct error message
      const failedTx = results.find(r => r.status === 'rejected');
      expect(failedTx.reason.message).to.include('buyDigimon: Listing not active');

      // Verify final state
      const listing = await digimonMarketplace.listings(0);
      expect(listing.isActive).to.be.false;
      
      // Verify ownership - should be transferred to one of the buyers
      const finalOwner = await digimonMarketplace.ownerOf(0);
      expect([buyer.address, buyer2.address]).to.include(finalOwner);
    });
  });

  describe('Admin Functions', function () {
    it('should allow owner to update marketplace fee', async function () {
      const newFee = 500; // 5%
      await expect(digimonMarketplace.connect(owner).setMarketplaceFee(newFee))
        .to.emit(digimonMarketplace, 'MarketplaceFeeUpdated')
        .withArgs(newFee);
    });

    it('should fail to set excessive marketplace fee', async function () {
      await expect(
        digimonMarketplace.connect(owner).setMarketplaceFee(1100)
      ).to.be.revertedWith('setMarketplaceFee: Fee cannot exceed 10%');
    });

    it('should allow owner to pause and unpause', async function () {
      await digimonMarketplace.connect(owner).pause();
      
      // Try to mint while paused
      await expect(
        digimonMarketplace.connect(user).mintDigimon(metadataURI, {
          value: MINT_PRICE
        })
      ).to.be.revertedWithCustomError(digimonMarketplace, 'EnforcedPause');

      // Unpause
      await digimonMarketplace.connect(owner).unpause();

      // Should work after unpausing
      await digimonMarketplace.connect(user).mintDigimon(metadataURI, {
        value: MINT_PRICE
      });
    });
  });
});
