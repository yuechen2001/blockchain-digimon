import { useState, useCallback } from 'react';
import { useWeb3Context } from '../context/Web3Context';
import { ethers } from 'ethers';
import { useQuery } from '@tanstack/react-query';
import { fetchDigimonFromIPFS } from './useDigimonData';

interface ListingInfo {
  isListed: boolean;
  price: string;
  seller: string;
  expiresAt: number;
}

interface ListedDigimon {
  id: string;
  tokenId: string;
  price: string;
  seller: string;
  digimonData: any;
  expiresAt: number;
  isOwnedByUser: boolean;
}

/**
 * Custom hook for interacting with the DigimonMarketplace contract
 * Handles listing information and marketplace operations
 */
export const useMarketplace = () => {
  const { marketplaceContract, account, tokenContract, isConnected } = useWeb3Context();
  const [isLoading, setIsLoading] = useState(false);
  const [listingInfo, setListingInfo] = useState<{
    [tokenId: string]: ListingInfo;
  }>({});

  /**
   * Fetches listing information for a specific token
   */
  const getTokenListingInfo = useCallback(async (tokenId: string) => {
    if (!marketplaceContract) return null;
    
    setIsLoading(true);
    try {
      const [listing, isListed] = await marketplaceContract.getTokenListing(tokenId);
      
      if (!isListed) {
        return {
          isListed: false,
          price: '0',
          seller: '',
          expiresAt: 0,
        };
      }
      
      const price = ethers.formatEther(listing[3]);
      const seller = listing[2];
      const expiresAt = Number(listing[6]);
      
      const listingData = {
        isListed,
        price,
        seller,
        expiresAt,
      };
      
      setListingInfo(prev => ({
        ...prev,
        [tokenId]: listingData
      }));
      
      return listingData;
    } catch (error) {
      console.error('Error fetching token listing:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract]);

  /**
   * Checks if the current account is the owner of a specific token
   */
  const checkTokenOwnership = useCallback(async (tokenId: string) => {
    if (!tokenContract || !account) return false;
    
    try {
      const owner = await tokenContract.ownerOf(tokenId);
      return owner.toLowerCase() === account.toLowerCase();
    } catch (error) {
      console.error('Error checking token ownership:', error);
      return false;
    }
  }, [tokenContract, account]);

  /**
   * List a token for sale on the marketplace
   */
  const listToken = useCallback(async (tokenId: string, priceInEth: string, durationInDays: number) => {
    if (!marketplaceContract || !tokenContract || !account) {
      throw new Error('Wallet not connected or contracts not loaded');
    }
    
    setIsLoading(true);
    try {
      const priceInWei = ethers.parseEther(priceInEth);
      const durationInSeconds = durationInDays * 24 * 60 * 60;
      const isApproved = await tokenContract.isApprovedForAll(account, marketplaceContract.address);
      
      if (!isApproved) {
        const approveTx = await tokenContract.setApprovalForAll(marketplaceContract.address, true);
        await approveTx.wait();
      }
      
      const listTx = await marketplaceContract.listDigimon(tokenId, priceInWei, durationInSeconds);
      await listTx.wait();
      
      await getTokenListingInfo(tokenId);
      
      return true;
    } catch (error) {
      console.error('Error listing token:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract, tokenContract, account, getTokenListingInfo]);

  /**
   * Cancel a token listing
   */
  const cancelListing = useCallback(async (tokenId: string) => {
    if (!marketplaceContract || !account) {
      throw new Error('Wallet not connected or marketplace contract not loaded');
    }
    
    setIsLoading(true);
    try {
      const tx = await marketplaceContract.cancelListing(tokenId);
      await tx.wait();
      
      await getTokenListingInfo(tokenId);
      
      return true;
    } catch (error) {
      console.error('Error canceling listing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract, account, getTokenListingInfo]);

  /**
   * Fetches all active listings from the marketplace
   */
  const fetchAllListings = useCallback(async (): Promise<ListedDigimon[]> => {
    if (!marketplaceContract || !tokenContract || !isConnected) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    try {
      let listedDigimonsIds = [];
      try {
        listedDigimonsIds = await marketplaceContract.getActiveListingIds();
      } catch (listingError) {
        return [];
      }

      if (listedDigimonsIds.length === 0) {
        return [];
      }

      const listedDigimonsMetadata: ListedDigimon[] = [];
      
      for (const listingId of listedDigimonsIds) {
        try {
          const [listingResult, isActive] = await marketplaceContract.getListing(listingId);
          
          if (!isActive || !listingResult) {
            continue;
          }

          if (listingResult[2].toString() === account)  {
            continue;
          }
          
          const tokenId = listingResult[1].toString();
          const tokenURI = await tokenContract.tokenURI(tokenId);
          const ipfsHash = tokenURI.replace('ipfs://', '');
          const digimonData = await fetchDigimonFromIPFS(ipfsHash);
          
          if (tokenId) {
            const priceInEth = ethers.formatEther(listingResult[3]);
            const isOwnedByUser = Boolean(account && listingResult[2].toLowerCase() === account.toLowerCase());
            const expiresAt = Number(listingResult[6]);
            
            listedDigimonsMetadata.push({
              id: listingId.toString(),
              tokenId,
              price: priceInEth,
              seller: listingResult[2],
              digimonData,
              expiresAt,
              isOwnedByUser
            });
          }
        } catch (error) {
          console.error(`Error processing listing ${listingId}:`, error);
        }
      }
      
      return listedDigimonsMetadata;
    } catch (error) {
      console.error('Error fetching listed digimons:', error);
      throw error;
    }
  }, [marketplaceContract, tokenContract, account, isConnected]);

  const {
    data: listings = [],
    isLoading: isListingsLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['marketplaceListings', account],
    queryFn: fetchAllListings,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
    enabled: !!(marketplaceContract && tokenContract && isConnected),
  });

  const filterListings = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      return listings;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return listings.filter(listing => {
      if (!listing.digimonData) return false;
      
      return (
        listing.digimonData.name?.toLowerCase().includes(lowerSearchTerm) 
      );
    });
  }, [listings]);

  return {
    isLoading,
    listingInfo,
    isConnected,
    getTokenListingInfo,
    checkTokenOwnership,
    listToken,
    cancelListing,
    listings,
    isListingsLoading,
    isError,
    error,
    refetch,
    filterListings
  };
};
