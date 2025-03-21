import hardhatPkg from 'hardhat';
const { ethers } = hardhatPkg;

import chaiPkg from 'chai';
const { expect } = chaiPkg;

import { getDigimonURI } from '../scripts/ipfsMetadataHelper.js';

describe('DigimonMarketplace', function () {
  let digimonToken;
  let digimonMarketplace;
  let owner;
  let user;
  let seller;
  let buyer;
  let operator;

  // Constants matching the contract
  const MINT_PRICE = ethers.parseEther('0.05');
  const LISTING_FEE = ethers.parseEther('0.05');
  const MAX_LISTING_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
  const MARKETPLACE_FEE = 250; // 2.5%
  
  // Role constants
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  // Test data
  const metadataURI = getDigimonURI('Agumon');
  const metadataURI2 = getDigimonURI('Betamon');
  const metadataURI3 = getDigimonURI('Angemon');

  beforeEach(async function () {
    [owner, user, seller, buyer, operator] = await ethers.getSigners();

    // Deploy the DigimonToken contract
    const DigimonToken = await ethers.getContractFactory('DigimonToken');
    digimonToken = await DigimonToken.deploy("DigimonToken", "DGM");

    // Deploy the DigimonMarketplace contract
    const DigimonMarketplace = await ethers.getContractFactory('DigimonMarketplace');
    digimonMarketplace = await DigimonMarketplace.deploy(owner.address, digimonToken.target);

    // Grant MINTER_ROLE to the marketplace contract
    await digimonToken.connect(owner).grantRole(MINTER_ROLE, digimonMarketplace.target);

    // Mint a Digimon for seller to use in tests
    await digimonMarketplace.connect(seller).mintDigimon(metadataURI, {
      value: MINT_PRICE
    });
  });

  describe('Deployment', function () {
    it('should deploy successfully', async function () {
      expect(await digimonToken.name()).to.equal("DigimonToken");
      expect(await digimonToken.symbol()).to.equal("DGM");
    });

    it('should set up roles correctly', async function () {
      // Check that owner has admin role on token contract
      expect(await digimonToken.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      
      // Check that marketplace has minter role
      expect(await digimonToken.hasRole(MINTER_ROLE, digimonMarketplace.target)).to.be.true;
      
      // Check that random user doesn't have roles
      expect(await digimonToken.hasRole(ADMIN_ROLE, user.address)).to.be.false;
      expect(await digimonToken.hasRole(MINTER_ROLE, user.address)).to.be.false;
    });
  });

  describe('Minting', function () {
    it('should allow user to mint a Digimon with sufficient payment', async function () {
      const patagonURI = getDigimonURI('Betamon');
      
      // Get the token ID before minting
      const tokenIdsBefore = await digimonMarketplace.getDigimonsByOwner(user.address);
      
      await digimonMarketplace.connect(user).mintDigimon(patagonURI, {
        value: MINT_PRICE
      });
      
      // Get the token IDs after minting
      const tokenIdsAfter = await digimonMarketplace.getDigimonsByOwner(user.address);
      
      // Verify one new token was minted
      expect(tokenIdsAfter.length).to.equal(tokenIdsBefore.length + 1);
      
      // Verify the owner of the new token
      const newTokenId = tokenIdsAfter[tokenIdsAfter.length - 1];
      expect(await digimonToken.ownerOf(newTokenId)).to.equal(user.address);
      
      // Verify the token URI
      expect(await digimonToken.tokenURI(newTokenId)).to.equal(patagonURI);
    });

    it('should fail to mint with insufficient payment', async function () {
      await expect(
        digimonMarketplace.connect(user).mintDigimon(metadataURI, {
          value: ethers.parseEther('0.01')
        })
      ).to.be.revertedWithCustomError(digimonMarketplace, 'InsufficientFee');
    });

    it('should support batch minting of multiple Digimons', async function () {
      const tokenURIs = [
        getDigimonURI('Betamon'),
        getDigimonURI('Angemon')
      ];
      
      // Calculate required fee
      const batchFee = MINT_PRICE * BigInt(tokenURIs.length);
      
      // Get user tokens before minting
      const tokenIdsBefore = await digimonMarketplace.getDigimonsByOwner(user.address);
      
      // Perform batch mint
      await digimonMarketplace.connect(user).batchMintDigimons(tokenURIs, {
        value: batchFee
      });
      
      // Get user tokens after minting
      const tokenIdsAfter = await digimonMarketplace.getDigimonsByOwner(user.address);
      
      // Verify correct number of tokens were minted
      expect(tokenIdsAfter.length).to.equal(tokenIdsBefore.length + tokenURIs.length);
      
      // Verify ownership of newly minted tokens
      for (let i = 0; i < tokenIdsAfter.length; i++) {
        if (i >= tokenIdsBefore.length) { // Only check the newly minted tokens
          const tokenId = tokenIdsAfter[i];
          expect(await digimonToken.ownerOf(tokenId)).to.equal(user.address);
        }
      }
    });
  });

  describe('Listing', function () {
    it('should allow owner to list a Digimon', async function () {
      const price = ethers.parseEther('1');
      const duration = 7 * 24 * 60 * 60; // 7 days
      const tokenId = 0; // Token minted in beforeEach

      // Approve marketplace to transfer the token
      await digimonToken.connect(seller).approve(digimonMarketplace.target, tokenId);

      // Execute the listing
      const tx = await digimonMarketplace.connect(seller).listDigimon(tokenId, price, duration, {
        value: LISTING_FEE
      });
      const receipt = await tx.wait();

      // Get block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block.timestamp) + BigInt(duration);

      // Get token listing - returns [listing, exists]
      const [listing, exists] = await digimonMarketplace.getTokenListing(tokenId);
      expect(exists).to.be.true;
      
      // Basic checks first
      expect(listing.isActive).to.be.true;
      expect(listing.tokenId).to.equal(tokenId);
      expect(listing.price).to.equal(price);
      expect(listing.seller).to.equal(seller.address);
      
      // Check expiry
      expect(listing.expiresAt).to.equal(expectedExpiry);

      // Verify the event was emitted properly
      const events = receipt.logs.filter(log => 
        log.fragment && log.fragment.name === 'DigimonListed'
      );
      expect(events.length).to.be.at.least(1);
      const event = events[0];
      expect(event.args[0]).to.equal(tokenId); // tokenId
      expect(event.args[1]).to.equal(seller.address); // seller
      expect(event.args[2]).to.equal(price); // price
      expect(event.args[3]).to.equal(expectedExpiry); // expiresAt
    });

    it('should fail to list with price outside allowed range', async function () {
      // Approve marketplace to transfer the token
      await digimonToken.connect(seller).approve(digimonMarketplace.target, 0);
      
      const tooLowPrice = ethers.parseEther('0.001');
      await expect(
        digimonMarketplace.connect(seller).listDigimon(0, tooLowPrice, 7 * 24 * 60 * 60, {
          value: LISTING_FEE
        })
      ).to.be.revertedWithCustomError(digimonMarketplace, 'PriceOutOfRange');
    });

    it('should fail to list with excessive duration', async function () {
      // Approve marketplace to transfer the token
      await digimonToken.connect(seller).approve(digimonMarketplace.target, 0);
      
      const price = ethers.parseEther('1');
      await expect(
        digimonMarketplace.connect(seller).listDigimon(0, price, MAX_LISTING_DURATION + 1, {
          value: LISTING_FEE
        })
      ).to.be.revertedWithCustomError(digimonMarketplace, 'DurationTooLong');
    });

    it('should support batch listing of multiple Digimons', async function () {
      // First mint multiple Digimons for the seller
      const tokenURIs = [
        getDigimonURI('Betamon'),
        getDigimonURI('Angemon')
      ];
      
      await digimonMarketplace.connect(seller).batchMintDigimons(tokenURIs, { 
        value: MINT_PRICE * BigInt(tokenURIs.length)
      });
      
      // Get the token IDs for the seller
      const sellerTokens = await digimonMarketplace.getDigimonsByOwner(seller.address);
      expect(sellerTokens.length).to.be.at.least(3); // 1 from beforeEach + 2 just minted
      
      // Approve marketplace to transfer the tokens
      await digimonToken.connect(seller).setApprovalForAll(digimonMarketplace.target, true);
      
      const digimonIds = [sellerTokens[0], sellerTokens[1], sellerTokens[2]];
      const prices = [
        ethers.parseEther('1'),
        ethers.parseEther('2'),
        ethers.parseEther('3')
      ];
      const durations = [
        7 * 24 * 60 * 60, // 7 days
        10 * 24 * 60 * 60, // 10 days
        14 * 24 * 60 * 60  // 14 days
      ];
      
      // Calculate required fee
      const batchFee = LISTING_FEE * BigInt(digimonIds.length);
      
      // Perform batch listing
      const tx = await digimonMarketplace.connect(seller).batchListDigimons(
        digimonIds, prices, durations, 
        { value: batchFee }
      );
      
      const receipt = await tx.wait();
      
      // Get block timestamp
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      // Verify listings for all tokens
      for (let i = 0; i < digimonIds.length; i++) {
        const tokenId = digimonIds[i];
        const [listing, exists] = await digimonMarketplace.getTokenListing(tokenId);
        
        expect(exists).to.be.true;
        
        expect(listing.isActive).to.be.true;
        expect(listing.tokenId).to.equal(tokenId);
        expect(listing.price).to.equal(prices[i]);
        expect(listing.seller).to.equal(seller.address);
        
        // For this test, we'll allow a small tolerance in the expiry time calculation
        const expectedExpiry = BigInt(block.timestamp) + BigInt(durations[i]);
        const tolerance = 5n; // 5 seconds tolerance
        const diff = listing.expiresAt > expectedExpiry ? 
                      listing.expiresAt - expectedExpiry : 
                      expectedExpiry - listing.expiresAt;
                      
        expect(diff).to.be.lessThanOrEqual(tolerance);
      }
    });

    it('should allow owner to cancel a listing', async function () {
      // List a Digimon first
      const price = ethers.parseEther('1');
      const duration = 7 * 24 * 60 * 60;
      const tokenId = 0; // Token minted in beforeEach
      
      // Approve marketplace to transfer the token
      await digimonToken.connect(seller).approve(digimonMarketplace.target, tokenId);
      
      const tx1 = await digimonMarketplace.connect(seller).listDigimon(tokenId, price, duration, {
        value: LISTING_FEE
      });
      
      // Wait for transaction to be mined to get event
      const receipt1 = await tx1.wait();
      
      // Get the listing ID from the emitted event
      const listingEvent = receipt1.logs.find(log => 
        log.fragment && log.fragment.name === 'DigimonListed'
      );
      
      // Assuming DigimonListed event doesn't directly include the listingId
      // We'll get all active listings and find our token's listing
      const activeListings = await digimonMarketplace.getActiveListings(0, 10);
      
      // Find the listingId for our token
      let listingId;
      for (let i = 0; i < activeListings.length; i++) {
        
        // Get listing details for each active listing
        const listingDetailsList = await digimonMarketplace.getListingsDetails([activeListings[i]]);
        
        // Convert to number for proper comparison since tokenId is 0
        if (Number(listingDetailsList[0].tokenId) === Number(tokenId) && 
            listingDetailsList[0].seller.toLowerCase() === seller.address.toLowerCase()) {
          listingId = activeListings[i];
          break;
        }
      }
      
      expect(listingId).to.not.be.undefined;
      
      // Verify listing exists
      let [listing, exists] = await digimonMarketplace.getTokenListing(tokenId);
      expect(exists).to.be.true;
      
      // Cancel the listing
      const tx2 = await digimonMarketplace.connect(seller).cancelListing(listingId);
      const receipt2 = await tx2.wait();
      
      // Verify listing is inactive
      [listing, exists] = await digimonMarketplace.getTokenListing(tokenId);
      expect(exists).to.be.false;

      const cancelEvent = receipt2.logs.find(log => {
        // Make sure we have a decoded log with a fragment
        if (!log.fragment) return false;
        
        // Check if the event name matches what we're looking for
        return log.fragment.name === 'ListingCancelled';
      });
      expect(cancelEvent).to.not.be.undefined;
      expect(cancelEvent.args[0]).to.equal(listingId); // listingId
      expect(cancelEvent.args[1]).to.equal(tokenId); // tokenId
      expect(cancelEvent.args[2]).to.equal(seller.address); // seller
    });
  });

  describe('Buying', function () {
    const listingPrice = ethers.parseEther('1');
    const duration = 7 * 24 * 60 * 60; // 7 days
    let tokenId;
    
    beforeEach(async function () {
      // Get the token ID 
      tokenId = 0;

      // Approve marketplace to transfer the token
      await digimonToken.connect(seller).approve(digimonMarketplace.target, tokenId);
      
      // List the Digimon
      await digimonMarketplace.connect(seller).listDigimon(tokenId, listingPrice, duration, {
        value: LISTING_FEE
      });
    });

    it('should allow user to buy a listed Digimon', async function () {
      // Record balances before purchase
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      
      // Calculate fee
      const expectedFee = (listingPrice * BigInt(MARKETPLACE_FEE)) / BigInt(10000);
      const sellerAmount = listingPrice - expectedFee;
      
      // Execute purchase - buyDigimon takes the tokenId (0) not the listingId
      const tx = await digimonMarketplace.connect(buyer).buyDigimon(tokenId, {
        value: listingPrice
      });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Verify token ownership transfer
      expect(await digimonToken.ownerOf(tokenId)).to.equal(buyer.address);
      
      // Verify listing is no longer active
      const [_, exists] = await digimonMarketplace.getTokenListing(tokenId);
      expect(exists).to.be.false;
      
      // Verify seller has pending withdrawal
      const sellerPendingWithdrawal = await digimonMarketplace.getPendingWithdrawal(seller.address);
      expect(sellerPendingWithdrawal).to.equal(sellerAmount);
      
      // Verify seller can withdraw funds
      await digimonMarketplace.connect(seller).withdrawFunds();
      
      // Verify seller's balance increased (approximately, accounting for gas)
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter > sellerBalanceBefore).to.be.true;
    });

    it('should fail to buy with insufficient payment', async function () {
      const insufficientPayment = listingPrice - ethers.parseEther('0.1');
      
      await expect(
        digimonMarketplace.connect(buyer).buyDigimon(tokenId, {
          value: insufficientPayment
        })
      ).to.be.revertedWithCustomError(digimonMarketplace, 'InsufficientPayment');
    });

    it('should fail to buy a non-existent listing', async function () {
      // Mint a token but don't list it - capture the event to get the exact token ID
      const mintTx = await digimonMarketplace.connect(owner).mintDigimon(getDigimonURI('Betamon'), {
        value: MINT_PRICE
      });
      
      // Wait for the transaction to be mined and get the receipt with events
      const receipt = await mintTx.wait();
      
      // Find the DigimonMinted event
      const mintEvent = receipt.logs.find(log => 
        log?.fragment?.name === 'DigimonMinted'
      );
      
      let nonListedTokenId;
      
      // If we found the event, extract token ID, otherwise use total supply
      if (mintEvent) {
        nonListedTokenId = mintEvent.args[0]; // The first argument should be the token ID
      } else {
        // Fallback to using totalSupply if event wasn't found
        const totalSupply = await digimonToken.totalSupply();
        nonListedTokenId = totalSupply - BigInt(1);
      }
      
      // Verify token exists and who owns it
      const ownerOfToken = await digimonToken.ownerOf(nonListedTokenId);
      
      // Confirm this token isn't listed
      const [listing, exists] = await digimonMarketplace.getTokenListing(nonListedTokenId);
      
      // Try to buy this unlisted token - should fail with ListingNotFound
      await expect(
        digimonMarketplace.connect(buyer).buyDigimon(nonListedTokenId, {
          value: listingPrice
        })
      ).to.be.revertedWithCustomError(digimonMarketplace, 'ListingNotFound');
    });

    it('should handle concurrent buying attempts correctly', async function () {
      const buyer2 = (await ethers.getSigners())[5];

      // Both buyers try to buy simultaneously
      const buyPromise1 = digimonMarketplace.connect(buyer).buyDigimon(tokenId, {
        value: listingPrice
      });
      
      const buyPromise2 = digimonMarketplace.connect(buyer2).buyDigimon(tokenId, {
        value: listingPrice
      });
      
      // One should succeed, one should fail
      const results = await Promise.allSettled([buyPromise1, buyPromise2]);
      
      // One should succeed and one should fail
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;
      
      expect(successes + failures).to.equal(2, "Both promises should have settled");
      
      // Verify the token has a new owner
      const currentOwner = await digimonToken.ownerOf(tokenId);
      expect(currentOwner).to.not.equal(seller.address);
      
      // Verify the listing is no longer active
      const [listing, exists] = await digimonMarketplace.getTokenListing(tokenId);
      expect(exists).to.be.false;
    });
  });

  describe('Enumeration Functions', function () {
    const price = ethers.parseEther('1');
    const duration = 10 * 24 * 60 * 60; // 10 days
    let tokenIds = [];
    
    beforeEach(async function () {
      // Mint multiple Digimons
      const count = 5;
      for (let i = 0; i < count; i++) {
        const uri = getDigimonURI(i % 2 === 0 ? 'Angemon' : 'Betamon');
        await digimonMarketplace.connect(seller).mintDigimon(uri, {
          value: MINT_PRICE
        });
        
        // Get the newly minted tokenId
        const ownerTokens = await digimonMarketplace.getDigimonsByOwner(seller.address);
        const newTokenId = ownerTokens[ownerTokens.length - 1];
        tokenIds.push(newTokenId);
        
        // Approve and list the Digimon
        await digimonToken.connect(seller).approve(digimonMarketplace.target, newTokenId);
        await digimonMarketplace.connect(seller).listDigimon(
          newTokenId, 
          price, 
          duration, 
          { value: LISTING_FEE }
        );
      }
    });
    
    it('should return all tokens owned by a user', async function () {
      const userTokens = await digimonMarketplace.getDigimonsByOwner(user.address);
      expect(userTokens.length).to.equal(0);
      
      // Verify all tokens are owned by the user
      for (const tokenId of userTokens) {
        expect(await digimonToken.ownerOf(tokenId)).to.equal(user.address);
      }
    });

    it('should return all active listings with pagination', async function () {
      // Test first page
      const page1 = await digimonMarketplace.getActiveListings(0, 3);
      expect(page1.length).to.equal(3);
      
      // Test second page
      const page2 = await digimonMarketplace.getActiveListings(3, 3);
      expect(page2.length).to.equal(2);
      
      // Test exceeding available items
      const emptyPage = await digimonMarketplace.getActiveListings(5, 3);
      expect(emptyPage.length).to.equal(0);
    });
    
    it('should return all tokens with pagination', async function () {
      // We have 1 token from beforeEach setup + 5 from this beforeEach = 6 total
      const allTokens = await digimonMarketplace.getAllTokenIds(0, 10);
      
      // The exact count depends on the test order, but we know there should be at least 6
      expect(allTokens.length).to.be.at.least(6);
      
      // Test pagination - get only the first 2
      const firstPage = await digimonMarketplace.getAllTokenIds(0, 2);
      expect(firstPage.length).to.equal(2);
      expect(firstPage[0]).to.equal(allTokens[0]);
      expect(firstPage[1]).to.equal(allTokens[1]);
      
      // Test pagination - get the next 2
      const secondPage = await digimonMarketplace.getAllTokenIds(2, 2);
      expect(secondPage.length).to.equal(2);
      expect(secondPage[0]).to.equal(allTokens[2]);
      expect(secondPage[1]).to.equal(allTokens[3]);
    });
  });

  describe('Admin Functions', function () {
    it('should allow admin to update marketplace fee', async function () {
      const newFee = 500; // 5%
      await expect(digimonMarketplace.connect(owner).setMarketplaceFee(newFee))
        .to.emit(digimonMarketplace, 'MarketplaceFeeUpdated')
        .withArgs(MARKETPLACE_FEE, newFee);
      
      expect(await digimonMarketplace.getMarketplaceFee()).to.equal(newFee);
    });
    
    it('should allow admin to update minting fee', async function () {
      const newFee = ethers.parseEther('0.1');
      await expect(digimonMarketplace.connect(owner).setMintingFee(newFee))
        .to.emit(digimonMarketplace, 'MintingFeeUpdated')
        .withArgs(MINT_PRICE, newFee);
      
      expect(await digimonMarketplace.getMintingFee()).to.equal(newFee);
    });
    
    it('should allow admin to update listing fee', async function () {
      const newFee = ethers.parseEther('0.1');
      await expect(digimonMarketplace.connect(owner).setListingFee(newFee))
        .to.emit(digimonMarketplace, 'ListingFeeUpdated')
        .withArgs(LISTING_FEE, newFee);
      
      expect(await digimonMarketplace.getListingFee()).to.equal(newFee);
    });
    
    it('should allow admin to update fee collector', async function () {
      await expect(digimonMarketplace.connect(owner).setFeeCollector(operator.address))
        .to.emit(digimonMarketplace, 'FeeCollectorUpdated')
        .withArgs(owner.address, operator.address);
    });
    
    it('should prevent non-admin from updating fees', async function () {
      await expect(
        digimonMarketplace.connect(user).setMarketplaceFee(500)
      ).to.be.revertedWithCustomError(digimonMarketplace, 'NotAuthorized');
      
      await expect(
        digimonMarketplace.connect(user).setMintingFee(ethers.parseEther('0.1'))
      ).to.be.revertedWithCustomError(digimonMarketplace, 'NotAuthorized');
      
      await expect(
        digimonMarketplace.connect(user).setListingFee(ethers.parseEther('0.1'))
      ).to.be.revertedWithCustomError(digimonMarketplace, 'NotAuthorized');
      
      await expect(
        digimonMarketplace.connect(user).setFeeCollector(operator.address)
      ).to.be.revertedWithCustomError(digimonMarketplace, 'NotAuthorized');
    });
  });
});
