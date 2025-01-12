// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DigimonMarketplace {
    // Events for logging
    event DigimonMinted(address indexed owner, uint256 tokenId, string tokenURI);
    event DigimonListed(uint256 tokenId, address indexed seller, uint256 price);
    event DigimonBought(uint256 tokenId, address indexed buyer, uint256 price);

    struct Digimon {
        uint256 id;
        string tokenURI; // Metadata for Digimon (e.g., evolution stage, type, abilities)
        address owner;
    }

    struct Listing {
        address seller;
        uint256 price;
    }

    // State variables
    uint256 private _digimonCounter;
    mapping(uint256 => Digimon) private _digimons;
    mapping(uint256 => Listing) private _listings;

    // Mint a new Digimon
    function mintDigimon(string memory tokenURI) external {
        uint256 tokenId = ++_digimonCounter; // Increment Digimon ID
        _digimons[tokenId] = Digimon(tokenId, tokenURI, msg.sender); // Create the Digimon
        emit DigimonMinted(msg.sender, tokenId, tokenURI); // Emit event
    }

    // List a Digimon for sale
    function listDigimon(uint256 tokenId, uint256 price) external {
        require(_digimons[tokenId].owner == msg.sender, "Only the owner can list this Digimon");
        require(price > 0, "Price must be greater than zero");

        _listings[tokenId] = Listing(msg.sender, price); // Add listing
        emit DigimonListed(tokenId, msg.sender, price); // Emit event
    }

    // Buy a listed Digimon
    function buyDigimon(uint256 tokenId) external payable {
        Listing memory listing = _listings[tokenId];
        require(listing.price > 0, "This Digimon is not for sale");
        require(msg.value >= listing.price, "Insufficient payment");

        // Transfer funds to seller
        payable(listing.seller).transfer(msg.value);

        // Transfer ownership
        _digimons[tokenId].owner = msg.sender;

        // Remove the listing
        delete _listings[tokenId];

        emit DigimonBought(tokenId, msg.sender, msg.value); // Emit event
    }

    // View functions
    function getDigimon(uint256 tokenId) external view returns (Digimon memory) {
        return _digimons[tokenId];
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return _listings[tokenId];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _digimons[tokenId].owner;
    }
}
