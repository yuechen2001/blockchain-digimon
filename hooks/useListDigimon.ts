import { useState, useCallback, useEffect } from 'react';
import { useWeb3Context } from '../context/Web3Context';
import { ethers } from 'ethers';
import { fetchDigimonFromIPFS } from './useDigimonData';

// Define interfaces for better type safety
interface DigimonMetadata {
  name: string;
  description?: string;
  images?: Array<{ href: string }>;
  levels?: Array<{ level: string }>;
  types?: Array<{ type: string }>;
  [key: string]: any; // For other potential properties
}

interface UseListDigimonState {
  digimon: DigimonMetadata | null;
  price: string;
  duration: string;
  isListing: boolean;
  isApproved: boolean;
  isCheckingApproval: boolean;
  listingComplete: boolean;
  hasListingError: boolean;
  lastError: string | null;
  step: number;
  isConnected: boolean;
}

interface UseListDigimonActions {
  setPrice: (price: string) => void;
  setDuration: (duration: string) => void;
  fetchDigimon: () => Promise<DigimonMetadata | null>;
  checkApprovalForListing: () => Promise<boolean>;
  approveForListing: () => Promise<boolean>;
  listDigimon: () => Promise<boolean>;
  resetListingForm: () => void;
  resetProcess: () => Promise<void>;
}

type UseListDigimonReturn = UseListDigimonState & UseListDigimonActions;

/**
 * Custom hook for listing a Digimon NFT on the marketplace
 * Handles the approval and listing process
 * 
 * @param tokenId - The ID of the token to list
 * @returns An object containing state and methods for listing a Digimon
 */
export const useListDigimon = (tokenId: string): UseListDigimonReturn => {
  const { marketplaceContract, tokenContract, account, isConnected } = useWeb3Context();

  // State management
  const [digimon, setDigimon] = useState<DigimonMetadata | null>(null);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('7');
  const [isListing, setIsListing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
  const [listingComplete, setListingComplete] = useState(false);
  const [hasListingError, setHasListingError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  /**
   * Check if the token is approved for marketplace transfers
   */
  const checkApprovalForListing = useCallback(async (): Promise<boolean> => {
    if (!tokenContract || !marketplaceContract || !account || !tokenId) {
      return false;
    }
    
    try {
      // Check individual token approval
      const approvedAddress = await tokenContract.getApproved(tokenId);
      const isApprovedForToken = approvedAddress.toLowerCase() === marketplaceContract.target.toString().toLowerCase();
      
      // Check approval for all tokens
      const isApprovedForAll = await tokenContract.isApprovedForAll(account, marketplaceContract.target);
      
      const hasApproval = isApprovedForToken || isApprovedForAll;
      setIsApproved(hasApproval);
      
      // Update the step if already approved
      if (hasApproval) {
        setStep(1);
      }
      
      return hasApproval;
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  }, [tokenContract, marketplaceContract, account, tokenId]);

  /**
   * Fetch Digimon metadata and check if the user is the owner
   */
  const fetchDigimon = useCallback(async (): Promise<DigimonMetadata | null> => {
    if (!tokenContract || !tokenId || !account) return null;
    
    try {
      setIsCheckingApproval(true);
      
      // Check if the user is the owner of this token
      const owner = await tokenContract.ownerOf(tokenId);
      if (owner.toLowerCase() !== account?.toLowerCase()) {
        throw new Error('You are not the owner of this Digimon');
      }

      // Get token URI and metadata
      const tokenURI = await tokenContract.tokenURI(tokenId).then((uri: string) => uri.replace('ipfs://', ''));
      const digimonData = await fetchDigimonFromIPFS(tokenURI);
      setDigimon(digimonData);

      // Check if token is already approved
      const isApproved = await checkApprovalForListing();
      if (isApproved) {
        setStep(1);
      }
      
      return digimonData;
    } catch (error) {
      console.error('Error fetching digimon:', error);
      throw error;
    } finally {
      setIsCheckingApproval(false);
    }
  }, [tokenContract, tokenId, account, checkApprovalForListing]);

  /**
   * Approve the marketplace to transfer the Digimon
   */
  const approveForListing = useCallback(async (): Promise<boolean> => {
    if (!tokenContract || !marketplaceContract || !tokenId) {
      throw new Error('Contracts not initialized');
    }
    
    try {
      setIsListing(true);
      
      const tx = await tokenContract.approve(marketplaceContract.target, tokenId);
      await tx.wait();
      
      setIsApproved(true);
      setStep(1);
      return true;
    } catch (error) {
      console.error('Error approving marketplace:', error);
      throw error;
    } finally {
      setIsListing(false);
    }
  }, [tokenContract, marketplaceContract, tokenId]);

  /**
   * Reset form state
   */
  const resetListingForm = useCallback((): void => {
    setHasListingError(false);
    setLastError(null);
    setPrice('');
    setDuration('7');
  }, []);

  /**
   * Reset entire listing process
   */
  const resetProcess = useCallback(async (): Promise<void> => {
    setHasListingError(false);
    setLastError(null);
    setIsCheckingApproval(true);
    
    try {
      // Re-check approval status
      await checkApprovalForListing();
      setPrice('');
      setDuration('7');
    } catch (error) {
      console.error('Error resetting process:', error);
    } finally {
      setIsCheckingApproval(false);
    }
  }, [checkApprovalForListing]);

  /**
   * List the Digimon on the marketplace
   */
  const listDigimon = useCallback(async (): Promise<boolean> => {
    if (!marketplaceContract || !tokenContract || !account || !tokenId || !isApproved) {
      throw new Error(isApproved ? 'Please connect your wallet first' : 'Marketplace approval required first');
    }

    if (!price || parseFloat(price) <= 0 || !duration || parseInt(duration) <= 0) {
      throw new Error('Please enter a valid price and duration');
    }

    // Clear any previous errors
    setHasListingError(false);
    setLastError(null);

    try {
      setIsListing(true);
      
      // Proceed with listing
      const priceInWei = ethers.parseEther(price);
      const durationInDays = parseInt(duration);
      const durationInSeconds = durationInDays * 24 * 60 * 60;
      
      // Try to get the marketplace listing fee
      let listingFee = ethers.parseEther('0.01'); // Default fee
      try {
        listingFee = await marketplaceContract.getListingFee();
      } catch (feeError) {
        // If we can't get the fee, use default
        console.error('Error getting listing fee:', feeError);
      }
      
      // Create the listing with the listing fee
      const tx = await marketplaceContract.listDigimon(
        tokenId,
        priceInWei,
        durationInSeconds,
        { value: listingFee }
      );
      
      await tx.wait();
      
      // Set listing as complete and update step
      setListingComplete(true);
      setStep(2);
      return true;
    } catch (error: any) {
      let errorMessage = "Failed to list your Digimon. Please try again.";
      
      if (error?.message) {
        errorMessage = error.message;
        
        // Handle specific errors
        if (errorMessage.includes("user rejected")) {
          throw new Error("Transaction cancelled by user");
        } else if (errorMessage.includes("insufficient funds")) {
          errorMessage = "You don't have enough ETH to pay the listing fee";
        } else if (errorMessage.includes("execution reverted")) {
          errorMessage = "Transaction failed. This could be due to an interrupted previous transaction.";
          setHasListingError(true);
          setLastError(errorMessage);
        }
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsListing(false);
    }
  }, [marketplaceContract, tokenContract, account, tokenId, isApproved, price, duration]);

  // Load digimon data when the component mounts and contract is available
  useEffect(() => {
    if (isConnected && tokenContract && account && tokenId) {
      fetchDigimon().catch(console.error);
    }
  }, [isConnected, tokenContract, account, tokenId, fetchDigimon]);

  return {
    // State
    digimon,
    price,
    setPrice,
    duration,
    setDuration,
    isListing,
    isApproved,
    isCheckingApproval,
    listingComplete,
    hasListingError,
    lastError,
    step,
    isConnected,
    
    // Actions
    fetchDigimon,
    checkApprovalForListing,
    approveForListing,
    listDigimon,
    resetListingForm,
    resetProcess
  };
};
