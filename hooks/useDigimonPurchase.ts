import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@chakra-ui/react';
import { useWeb3Context } from '../context/Web3Context';

/**
 * Custom hook for handling Digimon purchase functionality
 * 
 * @param onPurchaseComplete Callback function to execute after successful purchase
 * @returns Object with purchase function and loading state
 */
export const useDigimonPurchase = (onPurchaseComplete?: () => void) => {
  const [isBuying, setIsBuying] = useState(false);
  const { marketplaceContract, account } = useWeb3Context();
  const toast = useToast();

  /**
   * Initiates the purchase of a Digimon NFT
   * 
   * @param tokenId The ID of the token to purchase
   * @param listingPrice The price of the listing in ETH
   * @returns Promise<boolean> indicating success or failure
   */
  const purchaseDigimon = useCallback(async (tokenId: string, listingPrice: string): Promise<boolean> => {
    // Validation checks
    if (!marketplaceContract || !account) {
      toast.closeAll();
      toast({
        title: 'Wallet Error',
        description: 'Please connect your wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }

    if (!tokenId || !listingPrice) {
      toast.closeAll();
      toast({
        title: 'Data Error',
        description: 'Token ID or listing price is missing',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
    
    setIsBuying(true);
    
    try {
      // listingPrice is already in ETH format, so we need to parse it back to Wei
      let priceInWei = ethers.parseEther(listingPrice);
      
      // Create loading toast and store its ID
      toast.closeAll();
      const loadingToastId = toast({
        title: 'Processing Purchase',
        description: 'Please confirm the transaction in your wallet...',
        status: 'loading',
        duration: null,
        isClosable: true,
      });
      
      // Check token has listing
      try {
        const [tokenListing, hasListing] = await marketplaceContract.getTokenListing(tokenId);
        priceInWei = tokenListing[3];
        
        if (!hasListing) {
          toast.close(loadingToastId);
          toast({
            title: 'Listing Error',
            description: 'This token doesn\'t have an active listing',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return false;
        }
        
        // Extract useful info from listing
        if (hasListing) {
          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (Number(tokenListing[6]) < now) {
            toast.close(loadingToastId);
            toast({
              title: 'Listing Expired',
              description: 'This listing has expired and is no longer available',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return false;
          }
        }
      } catch (listingError) {
        console.error('Error checking listing:', listingError);
        toast.close(loadingToastId);
        toast({
          title: 'Listing Check Failed',
          description: 'Failed to verify the listing status',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return false;
      }
      
      // Execute the purchase
      const tx = await marketplaceContract.buyDigimon(tokenId, { value: priceInWei });
      
      // Update toast to show waiting for confirmation
      toast.close(loadingToastId);
      const confirmToastId = toast({
        title: 'Transaction Submitted',
        description: 'Waiting for blockchain confirmation...',
        status: 'info',
        duration: null,
        isClosable: true,
      });
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Close confirmation toast
      toast.close(confirmToastId);
      
      // Show success toast
      toast({
        title: 'Purchase Successful',
        description: 'You are now the proud owner of this Digimon!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Call the callback if provided
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
      
      return true;
    } catch (error: unknown) {
      console.error('Error buying digimon:', error);
      
      // Handle user rejection (MetaMask specific error)
      let errorMessage = 'There was an error processing your purchase';
      
      // TypeScript-safe error handling
      if (typeof error === 'object' && error !== null) {
        // Check for MetaMask error code
        if ('code' in error && error.code === 4001) {
          toast({
            title: 'Purchase Cancelled',
            description: 'You cancelled the transaction',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
          return false;
        }
        
        // Check for error message
        if ('message' in error && typeof error.message === 'string') {
          if (error.message.includes('user rejected')) {
            errorMessage = 'Transaction cancelled by user';
          } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds in your wallet to complete this purchase';
          }
        }
      }
      
      toast({
        title: 'Purchase Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      return false;
    } finally {
      setIsBuying(false);
    }
  }, [marketplaceContract, account, toast, onPurchaseComplete]);

  return {
    purchaseDigimon,
    isBuying
  };
};
