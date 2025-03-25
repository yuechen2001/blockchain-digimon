import { useState, useCallback, useEffect } from 'react';
import { useWeb3Context } from '../context/Web3Context';
import { ethers } from 'ethers';
import { useQuery } from '@tanstack/react-query';
import { fetchDigimonFromIPFS } from './useDigimonData';
import Digimon from '../shared/models/Digimon';

interface OwnedDigimon {
  digimon: Digimon;
  tokenId: string;
  listingId: string;
  price: string;
  seller: string;
  expiresAt: number;
  isOwnedByUser: boolean;
}

export const useMyListings = () => {
  const { marketplaceContract, account, tokenContract, isConnected } = useWeb3Context();
  const [isLoading, setIsLoading] = useState(false);  
  const [error, setError] = useState<string | null>(null);
  const [ownedDigimons, setOwnedDigimons] = useState<OwnedDigimon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOwnedDigimons = useCallback(async () => {
    if (!marketplaceContract || !tokenContract || !account) {
      setError('Wallet not connected or contracts not loaded');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching owned Digimons for account:', account);

      // Get all token IDs owned by the user
      const filter = tokenContract.filters.Transfer(null, account, null);
      console.log('Fetching transfer events...');
      const events = await tokenContract.queryFilter(filter);
      
      // Filter events and safely extract tokenIds
      const tokenIds = events.map((event: any) => {
        // Check if the event has args property (is an EventLog)
        if ('args' in event && event.args) {
          return event.args[2].toString();
        }
        return null;
      })
      .filter(id => id !== null); // Remove null values
      
      console.log('Found token IDs:', tokenIds);

      // Get all listings to check if any owned tokens are listed
      const listings: any[] = [];
      
      try {
        // Get active listing IDs
        const listedDigimonsIds = await marketplaceContract.getActiveListingIds();
        console.log('Active listing IDs:', listedDigimonsIds);
        
        // Check each listing to see if it belongs to the current user
        for (const listingId of listedDigimonsIds) {
          try {
            const [listingResult, isValid] = await marketplaceContract.getListing(listingId);
            
            if (isValid && listingResult[2].toLowerCase() === account.toLowerCase()) {
              // Example listingResult:
              // {
              //   0: 8n,                 // listingId
              //   1: 8n,                 // tokenId
              //   2: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',  // seller
              //   3: 100000000000000000n, // price (0.1 ETH)
              //   4: true,               // isActive
              //   5: 1742517365n,        // createdAt
              //   6: 1743122165n,        // expiresAt
              // }
              
              // Skip expired listings
              const currentTime = Math.floor(Date.now() / 1000);
              const expiresAt = Number(listingResult[6]);
              const isExpired = expiresAt <= currentTime;
              
              if (isExpired) {
                console.log('Listing', listingId, 'is expired');
                continue;
              }
              
              listings.push({
                listingId: listingResult[0].toString(),
                tokenId: listingResult[1].toString(),
                seller: listingResult[2].toString(),
                price: ethers.formatEther(listingResult[3]),
                isActive: listingResult[4],
                createdAt: Number(listingResult[5]),
                expiresAt: expiresAt
              });
              
              console.log('Found active listing:', listings[listings.length - 1]);
            }
          } catch (err) {
            console.error(`Error checking listing ${listingId}:`, err);
          }
        }
      } catch (err) {
        console.error('Error fetching active listings:', err);
      }

      const formattedTokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            console.log('Processing token:', tokenId);
            // Check if we still own this token
            const currentOwner = await tokenContract.ownerOf(tokenId);
            if (currentOwner.toLowerCase() !== account.toLowerCase()) {
              console.log('Token', tokenId, 'no longer owned by account');
              return null;
            }

            // Get the token URI and metadata
            const tokenURI = await tokenContract.tokenURI(tokenId).then((uri) => uri.replace('ipfs://', ''));
            console.log('Token URI:', tokenURI);
            
            // Fetch the token metadata
            const digimonMetadata = await fetchDigimonFromIPFS(tokenURI);
            if (!digimonMetadata) {
              console.error(`Failed to fetch metadata for token ${tokenId}`);
              return null;
            }

            // Find if this token is listed
            const listing = listings.find(l => l.tokenId === tokenId);
            
            return {
              digimon: digimonMetadata,
              tokenId,
              listingId: listing?.listingId || '',
              price: listing?.price || '0',
              seller: listing?.seller || '',
              expiresAt: listing?.expiresAt || 0,
              isOwnedByUser: true
            };
          } catch (err) {
            console.error(`Error processing token ${tokenId}:`, err);
            return null;
          }
        })
      );

      // Filter out null values
      const validTokens = formattedTokens.filter(token => token !== null) as OwnedDigimon[];
      console.log('Valid tokens:', validTokens);
      
      setOwnedDigimons(validTokens);
      return validTokens;
    } catch (err: any) {
      console.error('Error in fetchOwnedDigimons:', err);
      setError(err.message || 'Failed to fetch your Digimons');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract, tokenContract, account]);

  // Filter listings based on search term
  const filterListings = useCallback((term: string) => {
    if (!term.trim()) {
      return ownedDigimons;
    }
    
    const lowerSearchTerm = term.toLowerCase();
    return ownedDigimons.filter((digimon) => 
      digimon.digimon?.name?.toLowerCase().includes(lowerSearchTerm) 
    );
  }, [ownedDigimons]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Load digimons when the component mounts and contract is available
  useEffect(() => {
    if (isConnected && marketplaceContract && tokenContract && account) {
      fetchOwnedDigimons();
    }
  }, [isConnected, marketplaceContract, tokenContract, account, fetchOwnedDigimons]);

  // Use React Query for data refetching
  const { refetch } = useQuery({
    queryKey: ['ownedDigimons', account],
    queryFn: fetchOwnedDigimons,
    enabled: !!(marketplaceContract && tokenContract && isConnected),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ownedDigimons,
    isLoading,
    isError: !!error,
    error,
    isConnected,
    searchTerm,
    setSearchTerm,
    handleSearchChange,
    fetchOwnedDigimons,
    filterListings,
    refetch
  };
};