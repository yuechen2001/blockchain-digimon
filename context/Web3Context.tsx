"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import toast from 'react-hot-toast';
import { DIGIMON_MARKETPLACE_ABI } from '../data/abi/DigimonMarketplace';

interface Web3ContextType {
  account: string | null;
  contract: ethers.Contract | null;
  provider: BrowserProvider | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  contract: null,
  provider: null,
  isConnected: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  error: null,
});

export const useWeb3Context = () => useContext(Web3Context);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  useEffect(() => {
    setMounted(true);
    initProvider();

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);
  
  const initProvider = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);

      // Handle account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });

      // Handle chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      try {
        await checkInitialConnection();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to check initial connection');
      }
    }
  };

  const checkInitialConnection = async () => {
    if (provider) {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0].address);
        await initContract(provider);
      }
    }
  };

  const initContract = async (provider: BrowserProvider) => {
    if (!CONTRACT_ADDRESS) {
      setError('Contract configuration missing. Please check your environment variables.');
      return;
    }

    try {
      await initializeContract();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize contract');
    }
  };

  const initializeContract = async () => {
    if (!provider) {
      throw new Error('Provider not initialized');
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }
    if (provider) {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DIGIMON_MARKETPLACE_ABI, signer);
      setContract(contract);
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast.error('Please install MetaMask to use this feature');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setAccount(accounts[0]);
      if (provider) {
        await initContract(provider);
      }
      toast.success('Wallet connected successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
      toast.error('Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setError(null);
    toast.success('Wallet disconnected');
  };

  if (!mounted) {
    return null;
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        contract,
        provider,
        isConnected: !!account,
        connectWallet,
        disconnectWallet,
        error,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
