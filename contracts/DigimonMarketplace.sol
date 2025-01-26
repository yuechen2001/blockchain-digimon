// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract DigimonMarketplace is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // Events
    event DigimonMinted(address indexed owner, uint256 tokenId, string tokenURI);
    event DigimonListed(uint256 tokenId, address indexed seller, uint256 price, uint256 expiresAt);
    event DigimonBought(uint256 tokenId, address indexed buyer, uint256 price);
    event MarketplaceFeeUpdated(uint256 newFee);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event ListingExpired(uint256 listingId);

    // Constants
    uint256 public constant MIN_PRICE = 0.01 ether;
    uint256 public constant MAX_PRICE = 100 ether;
    uint256 public constant MAX_LISTING_DURATION = 30 days;
    
    // Structs with optimized storage
    struct Digimon {
        bool isActive;
    }

    struct Listing {
        uint128 digimonId;
        uint128 price;
        address seller;
        uint256 expiresAt;
        bool isActive;
    }

    // State variables
    uint256 private _tokenIdCounter;
    uint256 private _listingCounter;
    uint256 private _marketplaceFee = 250; // 2.5% fee (basis points)
    mapping(uint256 => Digimon) public digimons;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => bool) private _mintedIDs;
    mapping(address => uint256) private _pendingWithdrawals;

    constructor(address initialOwner)
        ERC721("DigimonMarketplace", "DGM")
        Ownable(initialOwner)
    {}

    // Modifiers
    modifier validPrice(uint256 price) {
        require(price >= MIN_PRICE && price <= MAX_PRICE, "validPrice: Price out of range");
        _;
    }

    modifier listingExists(uint256 listingId) {
        require(_listingCounter > listingId, "listingExists: Listing does not exist");
        _;
    }

    // Admin functions
    function setMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "setMarketplaceFee: Fee cannot exceed 10%");
        _marketplaceFee = newFee;
        emit MarketplaceFeeUpdated(newFee);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Main functions
    function mintDigimon(
        string memory newTokenURI
    ) public payable whenNotPaused nonReentrant {
        require(msg.value >= 0.05 ether, "mintDigimon: Insufficient minting fee");

        uint256 newTokenId = _tokenIdCounter++;
        
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, newTokenURI);
        _mintedIDs[newTokenId] = true;

        digimons[newTokenId] = Digimon({
            isActive: true
        });

        emit DigimonMinted(msg.sender, newTokenId, newTokenURI);
    }

    function listDigimon(uint256 digimonId, uint256 price, uint256 duration)
        external
        payable
        whenNotPaused
        nonReentrant
        validPrice(price)
    {
        require(ownerOf(digimonId) == msg.sender, "listDigimon: Not the owner");
        require(msg.value >= 0.05 ether, "listDigimon: Insufficient listing fee");
        require(duration <= MAX_LISTING_DURATION, "listDigimon: Duration too long");

        uint256 newListingId = _listingCounter++;
        uint256 expiresAt = block.timestamp + duration;

        listings[newListingId] = Listing({
            digimonId: uint128(digimonId),
            price: uint128(price),
            seller: msg.sender,
            expiresAt: expiresAt,
            isActive: true
        });

        emit DigimonListed(digimonId, msg.sender, price, expiresAt);
    }

    function buyDigimon(uint256 listingId)
        external
        payable
        whenNotPaused
        nonReentrant
        listingExists(listingId)
    {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "buyDigimon: Listing not active");
        require(block.timestamp < listing.expiresAt, "buyDigimon: Listing expired");
        require(msg.value >= listing.price, "buyDigimon: Insufficient payment");

        listing.isActive = false;

        // Calculate and distribute fees
        uint256 fee = (listing.price * _marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - fee;
        
        // Add to pending withdrawals
        _pendingWithdrawals[owner()] += fee;
        _pendingWithdrawals[listing.seller] += sellerAmount;

        // Transfer the Digimon
        _transfer(listing.seller, msg.sender, listing.digimonId);

        emit DigimonBought(listing.digimonId, msg.sender, listing.price);
    }

    function withdrawFunds() external nonReentrant {
        uint256 amount = _pendingWithdrawals[msg.sender];
        require(amount > 0, "withdrawFunds: No funds to withdraw");

        _pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "withdrawFunds: Transfer failed");

        emit FundsWithdrawn(msg.sender, amount);
    }

    // View functions
    function getDigimon(uint256 tokenId) external view returns (Digimon memory) {
        require(_mintedIDs[tokenId], "getDigimon: Digimon does not exist");
        return digimons[tokenId];
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        require(listingId < _listingCounter, "getListing: Listing does not exist");
        return listings[listingId];
    }

    function getPendingWithdrawal(address account) external view returns (uint256) {
        return _pendingWithdrawals[account];
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
