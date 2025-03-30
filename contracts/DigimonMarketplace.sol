// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {console} from "hardhat/console.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DigimonToken
 * @author Zhu Yuechen
 * @notice ERC721 token contract for Digimon NFTs with enumeration, URI storage, and access control
 * @dev Implements ERC721 standard with extensions for enumeration, URI storage, and role-based access control
 *      Compatible with ERC721 marketplaces and standard wallets
 */
contract DigimonToken is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, Pausable {
    /// @notice Role identifier for admin permissions
    /// @dev Used to grant administrative privileges beyond the DEFAULT_ADMIN_ROLE
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Role identifier for minting permissions
    /// @dev Accounts with this role can mint new tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /**
     * @notice Emitted when a new Digimon NFT is minted
     * @param tokenId The ID of the newly minted token
     * @param owner The address of the token recipient
     * @param tokenURI The metadata URI of the token
     */
    event DigimonMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    
    /// @dev Tracks the next token ID to be minted
    uint256 private _nextTokenId;
    
    /**
     * @notice Initializes the DigimonToken contract
     * @dev Sets up the ERC721 token with name and symbol, and grants the deployer all roles
     * @param name The name of the token
     * @param symbol The symbol of the token
     */
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    /**
     * @notice Mints a new Digimon NFT
     * @dev Only accounts with MINTER_ROLE can call this function
     * @param to The address that will own the minted token
     * @param uri The token URI pointing to the token metadata
     * @return The ID of the newly minted token
     */
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
    
    /**
     * @notice Pauses all token transfers and operations
     * @dev Only accounts with ADMIN_ROLE can pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpauses token transfers and operations
     * @dev Only accounts with ADMIN_ROLE can unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Approves another address to transfer a specific token
     * @dev Overrides ERC721.approve to implement custom logic
     * @param to Address to be approved for the given token ID
     * @param tokenId ID of the token to be approved
     */
    function approve(address to, uint256 tokenId) public override(ERC721, IERC721) {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not token owner or approved for all"
        );

        super.approve(to, tokenId);
    }
    
    /**
     * @dev Required override for ERC721Enumerable
     * @param to Address receiving the token
     * @param tokenId ID of the token to update
     * @param auth Address authorized to make the update
     * @return Address of the previous owner
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Required override for ERC721Enumerable
     * @param account Account to increase balance for
     * @param value Amount to increase by
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    /**
     * @notice Gets the token URI for a given token ID
     * @dev Overrides the tokenURI function from both ERC721 and ERC721URIStorage
     * @param tokenId The ID of the token to query
     * @return The token URI string
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Checks if contract supports an interface
     * @dev See {IERC165-supportsInterface}
     * @param interfaceId The interface identifier to check
     * @return True if the contract supports the interface
     */
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
 * @notice A marketplace for Digimon NFTs with minting, listing, and buying functionality
 * @dev Implements secure NFT marketplace functionality with reentrancy protection,
 *      custom errors, and optimized data access patterns
 */
contract DigimonMarketplace is ReentrancyGuard {
    // ======== Events ========
    /**
     * @notice Emitted when a new Digimon NFT is minted through the marketplace
     * @param tokenId The ID of the newly minted token
     * @param owner The address that owns the minted token
     * @param tokenURI The metadata URI of the token
     */
    event DigimonMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    
    /**
     * @notice Emitted when a Digimon NFT is listed for sale
     * @param tokenId The ID of the token being listed
     * @param seller The address of the seller
     * @param price The listing price in wei
     * @param expiresAt The timestamp when the listing expires
     */
    event DigimonListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 expiresAt);
    
    /**
     * @notice Emitted when a Digimon NFT is bought
     * @param tokenId The ID of the token that was bought
     * @param buyer The address of the buyer
     * @param seller The address of the seller
     * @param price The price paid in wei
     */
    event DigimonBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    
    /**
     * @notice Emitted when a listing is cancelled by the seller
     * @param listingId The ID of the cancelled listing
     * @param tokenId The ID of the token that was listed
     * @param seller The address of the seller who cancelled the listing
     */
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller);
    
    /**
     * @notice Emitted when a listing expires
     * @param listingId The ID of the expired listing
     * @param tokenId The ID of the token that was listed
     */
    event ListingExpired(uint256 indexed listingId, uint256 indexed tokenId);
    
    /**
     * @notice Emitted when the marketplace fee is updated
     * @param oldFee The previous fee in basis points
     * @param newFee The new fee in basis points
     */
    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /**
     * @notice Emitted when funds are withdrawn from the marketplace
     * @param recipient The address receiving the funds
     * @param amount The amount withdrawn in wei
     */
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    
    /**
     * @notice Emitted when the minting fee is updated
     * @param oldFee The previous minting fee in wei
     * @param newFee The new minting fee in wei
     */
    event MintingFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /**
     * @notice Emitted when the listing fee is updated
     * @param oldFee The previous listing fee in wei
     * @param newFee The new listing fee in wei
     */
    event ListingFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /**
     * @notice Emitted when the fee collector address is updated
     * @param oldCollector The previous fee collector address
     * @param newCollector The new fee collector address
     */
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    
    // ======== Custom Errors ========
    /**
     * @notice Error thrown when a price is outside the allowed range
     * @param price The invalid price that was provided
     * @param minPrice The minimum allowed price
     * @param maxPrice The maximum allowed price
     */
    error PriceOutOfRange(uint256 price, uint256 minPrice, uint256 maxPrice);
    
    /**
     * @notice Error thrown when caller is not the token owner
     * @param tokenId The ID of the token
     * @param sender The address of the sender
     * @param owner The address of the actual owner
     */
    error NotTokenOwner(uint256 tokenId, address sender, address owner);
    
    /**
     * @notice Error thrown when insufficient fee is provided
     * @param provided The fee amount provided
     * @param required The required fee amount
     */
    error InsufficientFee(uint256 provided, uint256 required);
    
    /**
     * @notice Error thrown when listing duration exceeds maximum
     * @param duration The requested duration
     * @param maxDuration The maximum allowed duration
     */
    error DurationTooLong(uint256 duration, uint256 maxDuration);
    
    /**
     * @notice Error thrown when a listing is not found
     * @param listingId The ID of the listing that was not found
     */
    error ListingNotFound(uint256 listingId);
    
    /**
     * @notice Error thrown when a listing is not active
     * @param listingId The ID of the inactive listing
     */
    error ListingNotActive(uint256 listingId);
    
    /**
     * @notice Error thrown when a listing has expired
     * @param listingId The ID of the expired listing
     * @param expiryTime The time when the listing expired
     */
    error ListingExpiredError(uint256 listingId, uint256 expiryTime);
    
    /**
     * @notice Error thrown when payment is insufficient
     * @param provided The payment amount provided
     * @param required The required payment amount
     */
    error InsufficientPayment(uint256 provided, uint256 required);
    
    /**
     * @notice Error thrown when a token has not been minted
     * @param tokenId The ID of the non-existent token
     */
    error TokenNotMinted(uint256 tokenId);
    
    /**
     * @notice Error thrown when a fee amount is invalid
     * @param fee The invalid fee that was provided
     * @param maxFee The maximum allowed fee
     */
    error InvalidFeeAmount(uint256 fee, uint256 maxFee);
    
    /**
     * @notice Error thrown when there are no funds to withdraw
     * @param user The address of the user attempting to withdraw
     */
    error NoFundsToWithdraw(address user);
    
    /**
     * @notice Error thrown when funds transfer fails
     * @param recipient The intended recipient of the funds
     * @param amount The amount that failed to transfer
     */
    error FundsTransferFailed(address recipient, uint256 amount);
    
    /**
     * @notice Error thrown when pagination parameters are invalid
     * @param offset The invalid offset
     * @param limit The invalid limit
     */
    error InvalidPaginationParams(uint256 offset, uint256 limit);
    
    /**
     * @notice Error thrown when array lengths don't match
     * @param array1Length The length of the first array
     * @param array2Length The length of the second array
     */
    error ArrayLengthMismatch(uint256 array1Length, uint256 array2Length);
    
    /**
     * @notice Error thrown when sender is not authorized
     * @param sender The address of the unauthorized sender
     */
    error NotAuthorized(address sender);

    // ======== Constants ========
    /// @notice Minimum price for listing a Digimon NFT (0.01 ETH)
    /// @dev Used to prevent dust listings and ensure marketplace viability
    uint256 public constant MIN_PRICE = 0.01 ether;
    
    /// @notice Maximum price for listing a Digimon NFT (100 ETH)
    /// @dev Used to prevent accidental extreme price inputs
    uint256 public constant MAX_PRICE = 100 ether;
    
    /// @notice Maximum duration for a listing (30 days)
    /// @dev Used to ensure listings don't remain active indefinitely
    uint256 public constant MAX_LISTING_DURATION = 30 days;
    
    /// @notice Maximum marketplace fee in basis points (10%)
    /// @dev 100 basis points = 1%
    uint256 public constant MAX_FEE_BASIS_POINTS = 1000; // 10%
    
    /// @notice Maximum page size for pagination
    /// @dev Used to limit gas usage in view functions that return arrays
    uint256 public constant MAX_PAGE_SIZE = 50;
    
    // ======== Storage Structs ========
    /**
     * @notice Structure for storing Digimon token information
     * @dev Used to track which tokens have been minted through this marketplace
     * @param exists Whether the token exists or not
     * @param mintedAt The timestamp when the token was minted
     */
    struct Digimon {
        bool exists;
        uint256 mintedAt;
    }

    /**
     * @notice Structure for storing listing information
     * @dev Contains all data needed for a marketplace listing
     * @param listingId The ID of the listing
     * @param tokenId The ID of the token being listed
     * @param seller The address of the seller
     * @param price The listing price in wei
     * @param isActive Whether the listing is currently active
     * @param createdAt The timestamp when the listing was created
     * @param expiresAt The timestamp when the listing expires
     */
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
    /// @dev Reference to the DigimonToken contract
    DigimonToken private tokenContract;
    
    /// @dev Counter for the next listing ID
    uint256 private _nextListingId;
    
    /// @dev Marketplace fee in basis points (2.5% = 250 basis points)
    uint256 private _marketplaceFee = 250;
    
    /// @dev Fee for minting a new Digimon NFT (0.05 ETH)
    uint256 private _mintingFee = 0.05 ether;
    
    /// @dev Fee for listing a Digimon NFT (0.05 ETH)
    uint256 private _listingFee = 0.05 ether;
    
    /// @dev Address that collects marketplace fees
    address private _feeCollector;
    
    /// @dev Address of the marketplace admin
    address private _admin;
    
    /// @dev Maps token IDs to their Digimon information
    mapping(uint256 => Digimon) private _digimons;
    
    /// @dev Maps listing IDs to their listing information
    mapping(uint256 => Listing) private _listings;
    
    /// @dev Maps token IDs to their listing IDs
    mapping(uint256 => uint256) private _tokenListingId;
    
    /// @dev Maps token IDs to whether they have an active listing
    mapping(uint256 => bool) private _tokenHasListing;
    
    /// @dev Maps addresses to their pending withdrawal amounts
    mapping(address => uint256) private _pendingWithdrawals;
    
    /// @dev Maps addresses to arrays of token IDs they own
    mapping(address => uint256[]) private _userTokenIds;
    
    /// @dev Array of all token IDs minted through this marketplace
    uint256[] private _allTokenIds;
    
    /// @dev Array of all active listing IDs
    uint256[] private _activeListingIds;

    /**
     * @notice Initializes the DigimonMarketplace contract
     * @dev Sets the admin, token contract, and fee collector
     * @param admin The address of the marketplace admin
     * @param _tokenContract The address of the DigimonToken contract
     */
    constructor(address admin, DigimonToken _tokenContract) {
        _admin = admin;
        tokenContract = _tokenContract;
        _feeCollector = admin;
    }

    // ======== Modifiers ========
    /**
     * @notice Restricts function access to marketplace admins
     * @dev Checks if sender is admin or has ADMIN_ROLE in the token contract
     */
    modifier onlyAdmin() {
        if (msg.sender != _admin && !tokenContract.hasRole(tokenContract.ADMIN_ROLE(), msg.sender)) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }
    
    /**
     * @notice Ensures a price is within the allowed range
     * @dev Checks if price is between MIN_PRICE and MAX_PRICE
     * @param price The price to validate
     */
    modifier validPrice(uint256 price) {
        if (price < MIN_PRICE || price > MAX_PRICE) {
            revert PriceOutOfRange(price, MIN_PRICE, MAX_PRICE);
        }
        _;
    }

    /**
     * @notice Ensures a listing exists
     * @dev Checks if listing ID is less than the next listing ID
     * @param listingId The ID of the listing to check
     */
    modifier listingExists(uint256 listingId) {
        if (listingId >= _nextListingId) {
            revert ListingNotFound(listingId);
        }
        _;
    }

    /**
     * @notice Ensures pagination parameters are valid
     * @dev Checks if limit is within allowed range
     * @param offset The pagination offset
     * @param limit The pagination limit
     */
    modifier validPagination(uint256 offset, uint256 limit) {
        if (limit == 0 || limit > MAX_PAGE_SIZE) {
            revert InvalidPaginationParams(offset, limit);
        }
        _;
    }

    // ======== Admin Functions ========
    /**
     * @notice Sets the marketplace fee
     * @dev Only callable by admin, fee is in basis points (100 = 1%)
     * @param newFee The new marketplace fee in basis points
     */
    function setMarketplaceFee(uint256 newFee) external onlyAdmin {
        if (newFee > MAX_FEE_BASIS_POINTS) {
            revert InvalidFeeAmount(newFee, MAX_FEE_BASIS_POINTS);
        }
        
        uint256 oldFee = _marketplaceFee;
        _marketplaceFee = newFee;
        emit MarketplaceFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Sets the minting fee
     * @dev Only callable by admin
     * @param newFee The new minting fee in wei
     */
    function setMintingFee(uint256 newFee) external onlyAdmin {
        uint256 oldFee = _mintingFee;
        _mintingFee = newFee;
        emit MintingFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Sets the listing fee
     * @dev Only callable by admin
     * @param newFee The new listing fee in wei
     */
    function setListingFee(uint256 newFee) external onlyAdmin {
        uint256 oldFee = _listingFee;
        _listingFee = newFee;
        emit ListingFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Sets the fee collector address
     * @dev Only callable by admin
     * @param newFeeCollector The new fee collector address
     */
    function setFeeCollector(address newFeeCollector) external onlyAdmin {
        require(newFeeCollector != address(0), "Invalid fee collector address");
        address oldFeeCollector = _feeCollector;
        _feeCollector = newFeeCollector;
        emit FeeCollectorUpdated(oldFeeCollector, newFeeCollector);
    }

    // ======== Public View Functions ========
    /**
     * @notice Gets the current marketplace fee
     * @return The marketplace fee in basis points
     */
    function getMarketplaceFee() external view returns (uint256) {
        return _marketplaceFee;
    }
    
    /**
     * @notice Gets the current minting fee
     * @return The minting fee in wei
     */
    function getMintingFee() external view returns (uint256) {
        return _mintingFee;
    }
    
    /**
     * @notice Gets the current listing fee
     * @return The listing fee in wei
     */
    function getListingFee() external view returns (uint256) {
        return _listingFee;
    }
    
    /**
     * @notice Gets the pending withdrawal amount for an account
     * @param account The address to check
     * @return The pending withdrawal amount in wei
     */
    function getPendingWithdrawal(address account) external view returns (uint256) {
        return _pendingWithdrawals[account];
    }

    // ======== Core Logic - Minting ========
    /**
     * @notice Mints a new Digimon NFT
     * @dev Only callable when the token contract is not paused
     * @param tokenURI The metadata URI of the token
     */
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
    /**
     * @notice Lists a Digimon NFT for sale
     * @dev Only callable when the token contract is not paused
     * @param digimonId The ID of the token to list
     * @param price The listing price in wei
     * @param duration The duration of the listing in seconds
     */
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

    /**
     * @notice Cancels a listing
     * @dev Only callable by the seller or admin
     * @param listingId The ID of the listing to cancel
     */
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
    /**
     * @notice Buys a listed Digimon NFT
     * @dev Only callable when the token contract is not paused
     * @param digimonId The ID of the token to buy
     */
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
    /**
     * @notice Mints multiple Digimon NFTs
     * @dev Only callable when the token contract is not paused
     * @param tokenURIs The metadata URIs of the tokens
     */
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
    
    /**
     * @notice Lists multiple Digimon NFTs for sale
     * @dev Only callable when the token contract is not paused
     * @param digimonIds The IDs of the tokens to list
     * @param prices The listing prices in wei
     * @param durations The durations of the listings in seconds
     */
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
    /**
     * @notice Withdraws pending funds
     */
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
    /**
     * @notice Gets the tokens owned by an address
     * @param owner The address to query
     * @return The IDs of the tokens owned by the address
     */
    function getDigimonsByOwner(address owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _userTokenIds[owner];
    }

    /**
     * @notice Gets the active listings
     * @param offset The pagination offset
     * @param limit The pagination limit
     * @return The IDs of the active listings
     */
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
    
    /**
     * @notice Gets all token IDs
     * @param offset The pagination offset
     * @param limit The pagination limit
     * @return The IDs of all tokens
     */
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
    
    /**
     * @notice Gets the listing for a token
     * @param tokenId The ID of the token to query
     * @return listing The listing information
     * @return exists Whether the listing exists
     */
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
    
    /**
     * @notice Gets the listings for multiple tokens
     * @param listingIds The IDs of the listings to query
     * @return The listing information
     */
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

    /**
     * @notice Gets all active listing IDs
     * @return The IDs of all active listings
     */
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
    
    /**
     * @notice Gets a listing by ID
     * @param listingId The ID of the listing to query
     * @return The listing information and whether it exists
     */
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
    /**
     * @notice Removes a token from an address's ownership
     * @param owner The address to remove the token from
     * @param tokenId The ID of the token to remove
     */
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
    
    /**
     * @notice Removes an active listing ID
     * @param listingId The ID of the listing to remove
     */
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
