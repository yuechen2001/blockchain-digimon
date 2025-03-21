// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {console} from "hardhat/console.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DigimonToken
 * @dev Base contract for Digimon NFTs
 */
contract DigimonToken is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Events
    event DigimonMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    
    // State variables
    uint256 private _nextTokenId;
    
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    // ======== Token Management ========
    function mint(address to, string calldata uri) 
        external 
        onlyRole(MINTER_ROLE) 
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit DigimonMinted(tokenId, to, uri);
        return tokenId;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ======== Required Overrides ========
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

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
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

/**
 * @title DigimonMarketplace
 * @author Zhu Yuechen
 * @dev A marketplace for Digimon NFTs with minting, listing, and buying functionality.
 *      Includes enhanced security, gas optimizations, and better data access.
 */
contract DigimonMarketplace is ReentrancyGuard {
    // ======== Events ========
    event DigimonMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    event DigimonListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 expiresAt);
    event DigimonBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller);
    event ListingExpired(uint256 indexed listingId, uint256 indexed tokenId);
    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event MintingFeeUpdated(uint256 oldFee, uint256 newFee);
    event ListingFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    
    // ======== Custom Errors ========
    error PriceOutOfRange(uint256 price, uint256 minPrice, uint256 maxPrice);
    error NotTokenOwner(uint256 tokenId, address sender, address owner);
    error InsufficientFee(uint256 provided, uint256 required);
    error DurationTooLong(uint256 duration, uint256 maxDuration);
    error ListingNotFound(uint256 listingId);
    error ListingNotActive(uint256 listingId);
    error ListingExpiredError(uint256 listingId, uint256 expiryTime);
    error InsufficientPayment(uint256 provided, uint256 required);
    error TokenNotMinted(uint256 tokenId);
    error InvalidFeeAmount(uint256 fee, uint256 maxFee);
    error NoFundsToWithdraw(address user);
    error FundsTransferFailed(address recipient, uint256 amount);
    error InvalidPaginationParams(uint256 offset, uint256 limit);
    error ArrayLengthMismatch(uint256 array1Length, uint256 array2Length);
    error NotAuthorized(address sender);

    // ======== Constants ========
    uint256 public constant MIN_PRICE = 0.01 ether;
    uint256 public constant MAX_PRICE = 100 ether;
    uint256 public constant MAX_LISTING_DURATION = 30 days;
    uint256 public constant MAX_FEE_BASIS_POINTS = 1000; // 10%
    uint256 public constant MAX_PAGE_SIZE = 50;
    
    // ======== Storage Structs ========
    struct Digimon {
        bool exists;
        uint256 mintedAt;
    }

    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
    }

    // ======== State Variables ========
    DigimonToken private tokenContract;
    uint256 private _nextListingId;
    uint256 private _marketplaceFee = 250; // 2.5% fee (basis points)
    uint256 private _mintingFee = 0.05 ether;
    uint256 private _listingFee = 0.05 ether;
    address private _feeCollector;
    address private _admin;
    
    // Storage mappings
    mapping(uint256 => Digimon) private _digimons;
    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => uint256) private _tokenListingId;
    mapping(uint256 => bool) private _tokenHasListing; // Track if token has a listing explicitly
    mapping(address => uint256) private _pendingWithdrawals;
    
    // Access mappings
    mapping(address => uint256[]) private _userTokenIds;
    uint256[] private _allTokenIds;
    uint256[] private _activeListingIds;

    constructor(address admin, DigimonToken _tokenContract) {
        _admin = admin;
        tokenContract = _tokenContract;
        _feeCollector = admin;
    }

    // ======== Modifiers ========
    modifier onlyAdmin() {
        if (msg.sender != _admin && !tokenContract.hasRole(tokenContract.ADMIN_ROLE(), msg.sender)) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }
    
    modifier validPrice(uint256 price) {
        if (price < MIN_PRICE || price > MAX_PRICE) {
            revert PriceOutOfRange(price, MIN_PRICE, MAX_PRICE);
        }
        _;
    }

    modifier listingExists(uint256 listingId) {
        if (listingId >= _nextListingId) {
            revert ListingNotFound(listingId);
        }
        _;
    }

    modifier validPagination(uint256 offset, uint256 limit) {
        if (limit == 0 || limit > MAX_PAGE_SIZE) {
            revert InvalidPaginationParams(offset, limit);
        }
        _;
    }

    // ======== Admin Functions ========
    function setMarketplaceFee(uint256 newFee) external onlyAdmin {
        if (newFee > MAX_FEE_BASIS_POINTS) {
            revert InvalidFeeAmount(newFee, MAX_FEE_BASIS_POINTS);
        }
        
        uint256 oldFee = _marketplaceFee;
        _marketplaceFee = newFee;
        emit MarketplaceFeeUpdated(oldFee, newFee);
    }

    function setMintingFee(uint256 newFee) external onlyAdmin {
        uint256 oldFee = _mintingFee;
        _mintingFee = newFee;
        emit MintingFeeUpdated(oldFee, newFee);
    }

    function setListingFee(uint256 newFee) external onlyAdmin {
        uint256 oldFee = _listingFee;
        _listingFee = newFee;
        emit ListingFeeUpdated(oldFee, newFee);
    }

    function setFeeCollector(address newFeeCollector) external onlyAdmin {
        require(newFeeCollector != address(0), "Invalid fee collector address");
        address oldFeeCollector = _feeCollector;
        _feeCollector = newFeeCollector;
        emit FeeCollectorUpdated(oldFeeCollector, newFeeCollector);
    }

    // ======== Public View Functions ========
    function getMarketplaceFee() external view returns (uint256) {
        return _marketplaceFee;
    }
    
    function getMintingFee() external view returns (uint256) {
        return _mintingFee;
    }
    
    function getListingFee() external view returns (uint256) {
        return _listingFee;
    }
    
    function getPendingWithdrawal(address account) external view returns (uint256) {
        return _pendingWithdrawals[account];
    }

    // ======== Core Logic - Minting ========
    function mintDigimon(string calldata tokenURI) 
        external 
        payable 
        nonReentrant 
    {
        if (tokenContract.paused()) {
            revert("Minting paused");
        }
        
        if (msg.value < _mintingFee) {
            revert InsufficientFee(msg.value, _mintingFee);
        }
        
        uint256 tokenId = tokenContract.mint(msg.sender, tokenURI);
        
        // Record in our tracking data
        _digimons[tokenId] = Digimon({
            exists: true,
            mintedAt: block.timestamp
        });
        
        _allTokenIds.push(tokenId);
        _userTokenIds[msg.sender].push(tokenId);
    }

    // ======== Core Logic - Listing ========
    function listDigimon(uint256 digimonId, uint256 price, uint256 duration) 
        external 
        payable 
        nonReentrant 
        validPrice(price) 
    {
        if (tokenContract.paused()) {
            revert("Marketplace paused");
        }
        
        if (msg.value < _listingFee) {
            revert InsufficientFee(msg.value, _listingFee);
        }
        
        if (duration > MAX_LISTING_DURATION) {
            revert DurationTooLong(duration, MAX_LISTING_DURATION);
        }
        
        if (tokenContract.ownerOf(digimonId) != msg.sender) {
            revert NotTokenOwner(digimonId, msg.sender, tokenContract.ownerOf(digimonId));
        }
        
        // Create listing
        uint256 listingId = _nextListingId++;
        uint256 expiryTime = block.timestamp + duration;
        
        _listings[listingId] = Listing({
            listingId: listingId,
            tokenId: digimonId,
            seller: msg.sender,
            price: price,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: expiryTime
        });
        
        // Update lookup mappings
        _tokenListingId[digimonId] = listingId;
        _tokenHasListing[digimonId] = true;
        _activeListingIds.push(listingId);
        
        emit DigimonListed(digimonId, msg.sender, price, expiryTime);
    }

    function cancelListing(uint256 listingId) 
        external 
        nonReentrant 
        listingExists(listingId) 
    {
        Listing storage listing = _listings[listingId];
        
        if (!listing.isActive) {
            revert ListingNotActive(listingId);
        }
        
        if (listing.seller != msg.sender && msg.sender != _admin) {
            revert NotTokenOwner(listing.tokenId, msg.sender, listing.seller);
        }
        
        // Deactivate the listing
        listing.isActive = false;
        
        // Update lookup mappings
        _tokenListingId[listing.tokenId] = 0;
        _tokenHasListing[listing.tokenId] = false;
        _removeActiveListingId(listingId);
        
        emit ListingCancelled(listingId, listing.tokenId, listing.seller);
    }
    
    // ======== Core Logic - Buying ========
    function buyDigimon(uint256 digimonId) 
        external 
        payable 
        nonReentrant 
    {
        if (tokenContract.paused()) {
            revert("Marketplace paused");
        }
        
        // First check: Does this token have a listing?
        if (!_tokenHasListing[digimonId]) {
            revert ListingNotFound(0); // No listing ID to return
        }
        
        uint256 listingId = _tokenListingId[digimonId];
        
        // Second check: Is the listing ID within valid range?
        if (listingId >= _nextListingId) {
            revert ListingNotFound(listingId);
        }
        
        Listing storage listing = _listings[listingId];
        
        // Third check: Is the listing active?
        if (!listing.isActive) {
            revert ListingNotActive(listingId);
        }
        
        if (block.timestamp > listing.expiresAt) {
            revert ListingExpiredError(listingId, listing.expiresAt);
        }
        
        if (msg.value < listing.price) {
            revert InsufficientPayment(msg.value, listing.price);
        }
        
        // Deactivate the listing
        listing.isActive = false;
        
        // Update lookup mappings
        _tokenListingId[listing.tokenId] = 0;
        _tokenHasListing[listing.tokenId] = false;
        _removeActiveListingId(listingId);
        
        // Calculate and distribute fees
        uint256 fee = (listing.price * _marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - fee;
        
        // Update pending withdrawals
        _pendingWithdrawals[_feeCollector] += fee;
        _pendingWithdrawals[listing.seller] += sellerAmount;

        // Update owner tracking
        address seller = listing.seller;
        _removeTokenFromUser(seller, listing.tokenId);
        _userTokenIds[msg.sender].push(listing.tokenId);
        
        // Transfer ownership
        tokenContract.safeTransferFrom(seller, msg.sender, listing.tokenId);
        
        emit DigimonBought(listing.tokenId, msg.sender, seller, listing.price);
    }

    // ======== Batch Operations ========
    function batchMintDigimons(string[] calldata tokenURIs) 
        external 
        payable 
        nonReentrant 
    {
        if (tokenContract.paused()) {
            revert("Minting paused");
        }
        
        uint256 totalFee = _mintingFee * tokenURIs.length;
        if (msg.value < totalFee) {
            revert InsufficientFee(msg.value, totalFee);
        }
        
        for (uint256 i = 0; i < tokenURIs.length; i++) {
            uint256 tokenId = tokenContract.mint(msg.sender, tokenURIs[i]);
            
            // Record in our tracking data
            _digimons[tokenId] = Digimon({
                exists: true,
                mintedAt: block.timestamp
            });
            
            _allTokenIds.push(tokenId);
            _userTokenIds[msg.sender].push(tokenId);
        }
    }
    
    function batchListDigimons(
        uint256[] calldata digimonIds, 
        uint256[] calldata prices, 
        uint256[] calldata durations
    ) 
        external 
        payable 
        nonReentrant 
    {
        if (tokenContract.paused()) {
            revert("Marketplace paused");
        }
        
        // Validate arrays are of equal length
        if (digimonIds.length != prices.length || prices.length != durations.length) {
            revert ArrayLengthMismatch(digimonIds.length, prices.length);
        }
        
        // Validate listing fee
        uint256 totalFee = _listingFee * digimonIds.length;
        if (msg.value < totalFee) {
            revert InsufficientFee(msg.value, totalFee);
        }
        
        for (uint256 i = 0; i < digimonIds.length; i++) {
            uint256 digimonId = digimonIds[i];
            uint256 price = prices[i];
            uint256 duration = durations[i];
            
            // Validate price and duration
            if (price < MIN_PRICE || price > MAX_PRICE) {
                revert PriceOutOfRange(price, MIN_PRICE, MAX_PRICE);
            }
            
            if (duration > MAX_LISTING_DURATION) {
                revert DurationTooLong(duration, MAX_LISTING_DURATION);
            }
            
            if (tokenContract.ownerOf(digimonId) != msg.sender) {
                revert NotTokenOwner(digimonId, msg.sender, tokenContract.ownerOf(digimonId));
            }
            
            // Create listing
            uint256 listingId = _nextListingId++;
            uint256 expiryTime = block.timestamp + duration;
            
            _listings[listingId] = Listing({
                listingId: listingId,
                tokenId: digimonId,
                seller: msg.sender,
                price: price,
                isActive: true,
                createdAt: block.timestamp,
                expiresAt: expiryTime
            });
            
            // Update lookup mappings
            _tokenListingId[digimonId] = listingId;
            _tokenHasListing[digimonId] = true;
            _activeListingIds.push(listingId);
            
            emit DigimonListed(digimonId, msg.sender, price, expiryTime);
        }
    }

    // ======== Withdrawal ========
    function withdrawFunds() 
        external 
        nonReentrant 
    {
        uint256 amount = _pendingWithdrawals[msg.sender];
        if (amount == 0) {
            revert NoFundsToWithdraw(msg.sender);
        }
        
        // Reset pending withdrawal
        _pendingWithdrawals[msg.sender] = 0;
        
        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert FundsTransferFailed(msg.sender, amount);
        }
        
        emit FundsWithdrawn(msg.sender, amount);
    }

    // ======== Query Functions ========
    function getDigimonsByOwner(address owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _userTokenIds[owner];
    }

    function getActiveListings(uint256 offset, uint256 limit) 
        external 
        view 
        validPagination(offset, limit) 
        returns (uint256[] memory) 
    {
        uint256 totalListings = _activeListingIds.length;
        
        if (offset >= totalListings) {
            return new uint256[](0);
        }
        
        uint256 endIndex = offset + limit;
        if (endIndex > totalListings) {
            endIndex = totalListings;
        }
        
        uint256 resultLength = endIndex - offset;
        uint256[] memory result = new uint256[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = _activeListingIds[offset + i];
        }
        
        return result;
    }
    
    function getAllTokenIds(uint256 offset, uint256 limit) 
        external 
        view 
        validPagination(offset, limit) 
        returns (uint256[] memory) 
    {
        uint256 totalTokens = _allTokenIds.length;
        
        if (offset >= totalTokens) {
            return new uint256[](0);
        }
        
        uint256 endIndex = offset + limit;
        if (endIndex > totalTokens) {
            endIndex = totalTokens;
        }
        
        uint256 resultLength = endIndex - offset;
        uint256[] memory result = new uint256[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = _allTokenIds[offset + i];
        }
        
        return result;
    }
    
    function getTokenListing(uint256 tokenId) 
        external 
        view 
        returns (Listing memory listing, bool exists) 
    {
        // First check if the token has a listing at all
        if (!_tokenHasListing[tokenId]) {
            return (Listing(0, 0, address(0), 0, false, 0, 0), false);
        }
        
        uint256 listingId = _tokenListingId[tokenId];
        
        if (listingId >= _nextListingId) {
            return (Listing(0, 0, address(0), 0, false, 0, 0), false);
        }
        
        Listing storage activeListing = _listings[listingId];
        
        if (!activeListing.isActive || block.timestamp > activeListing.expiresAt) {
            return (Listing(0, 0, address(0), 0, false, 0, 0), false);
        }
        
        return (activeListing, true);
    }
    
    function getListingsDetails(uint256[] calldata listingIds) 
        external 
        view 
        returns (Listing[] memory) 
    {
        Listing[] memory result = new Listing[](listingIds.length);
        
        for (uint256 i = 0; i < listingIds.length; i++) {
            if (listingIds[i] < _nextListingId) {
                result[i] = _listings[listingIds[i]];
            }
        }
        
        return result;
    }

    function getActiveListingIds() 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory activeIds = new uint256[](_activeListingIds.length);
        
        for (uint256 i = 0; i < _activeListingIds.length; i++) {
            activeIds[i] = _activeListingIds[i];
        }
        
        return activeIds;
    }
    
    function getListing(uint256 listingId)
        external
        view
        returns (Listing memory, bool)
    {
        if (listingId >= _nextListingId) {
            return (Listing(0, 0, address(0), 0, false, 0, 0), false);
        }
        
        Listing storage listing = _listings[listingId];
        return (listing, true);
    }

    // ======== Internal Helpers ========
    function _removeTokenFromUser(address owner, uint256 tokenId) internal {
        uint256[] storage tokens = _userTokenIds[owner];
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                // Swap with the last element and pop (more gas efficient)
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
    
    function _removeActiveListingId(uint256 listingId) internal {
        for (uint256 i = 0; i < _activeListingIds.length; i++) {
            if (_activeListingIds[i] == listingId) {
                _activeListingIds[i] = _activeListingIds[_activeListingIds.length - 1];
                _activeListingIds.pop();
                break;
            }
        }
    }
}
