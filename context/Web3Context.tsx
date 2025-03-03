'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { DIGIMON_MARKETPLACE_ABI } from '../data/abi/DigimonMarketplace';
import { useToast } from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

interface Web3ContextType {
  account: string | null;
  isConnecting: boolean;
  isReconnecting: boolean;
  isAuthenticated: boolean;
  isConnected: boolean;
  contract: ethers.Contract | null;
  provider: ethers.BrowserProvider | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  connectionError: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  isConnecting: false,
  isReconnecting: false,
  isAuthenticated: false,
  isConnected: false,
  contract: null,
  provider: null,
  connect: async () => {},
  disconnect: async () => {},
  reconnect: async () => {},
  connectionError: null,
});

export const useWeb3Context = () => useContext(Web3Context);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const toast = useToast();
  const { data: session } = useSession();

  const initializeContract = useCallback(async (provider: ethers.BrowserProvider) => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not found in environment variables');
      }

      console.log('Initializing contract with address:', contractAddress);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        DIGIMON_MARKETPLACE_ABI,
        signer
      );

      setContract(contract);
      setProvider(provider);
      setConnectionError(null);
      console.log('Contract initialized successfully');
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      setConnectionError('Failed to initialize contract');
      throw error;
    }
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting) {
      toast({
        title: 'Connection Pending',
        description: 'A connection request is already in progress. Please wait.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    try {
      setIsConnecting(true);
      setConnectionError(null);

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask first.');
      }

      const result = await connectAsync({
        connector: injected(),
      });

      if (!result?.accounts?.[0]) {
        throw new Error('Failed to connect wallet');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await initializeContract(provider);

      toast({
        title: 'Connected',
        description: 'Successfully connected to wallet',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'UserRejectedRequestError') {
        // Do not log this error
        toast({
          title: 'Connection Rejected',
          description: 'You rejected the connection request. Please try again.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        console.error('Failed to connect:', error);
        setConnectionError(error instanceof Error ? error.message : 'Failed to connect');
        toast({
          title: 'Connection Error',
          description: error instanceof Error ? error.message : 'Failed to connect',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [connectAsync, initializeContract, toast, isConnecting]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
      setContract(null);
      setProvider(null);
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [disconnectAsync, toast]);

  const reconnect = useCallback(async () => {
    if (!window.ethereum || !address) return;

    try {
      setIsReconnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await initializeContract(provider);
    } catch (error) {
      console.error('Failed to reconnect:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to reconnect');
    } finally {
      setIsReconnecting(false);
    }
  }, [address, initializeContract]);

  useEffect(() => {
    if (isConnected && address) {
      reconnect();
    }
  }, [isConnected, address, reconnect]);

  return (
    <Web3Context.Provider
      value={{
        account: address || null,
        isConnecting,
        isReconnecting,
        isAuthenticated: !!session?.user,
        isConnected,
        contract,
        provider,
        connect,
        disconnect,
        reconnect,
        connectionError,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
