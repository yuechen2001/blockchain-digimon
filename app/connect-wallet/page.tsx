'use client';

import React, { useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Container,
  Heading,
  Icon,
  useToast,
} from '@chakra-ui/react';
import { FaWallet } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useWeb3Context } from '../../context/Web3Context';
import { useRouter } from 'next/navigation';

export default function ConnectWalletPage() {
  const { user, linkWallet } = useAuth();
  const { connect, account, isConnecting, connectionError } = useWeb3Context();
  const router = useRouter();
  const toast = useToast();

  // Handle authentication redirect
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (user.walletAddress) {
      router.push('/marketplace');
    }
  }, [user, router]);

  // Handle wallet linking
  const handleWalletLink = useCallback(async (walletAddress: string) => {
    try {
      console.log('Attempting to link wallet:', walletAddress);
      await linkWallet(walletAddress);
      console.log('Wallet linked successfully');
      
      toast({
        title: 'Success',
        description: 'Wallet linked successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Wallet linking error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to link wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [linkWallet, toast]);

  // Only attempt to link wallet when we have both user and account
  useEffect(() => {
    const shouldLinkWallet = user && 
                           account && 
                           !user.walletAddress && 
                           account !== user.walletAddress;

    console.log('Wallet linking conditions:', {
      hasUser: !!user,
      hasAccount: !!account,
      currentWallet: user?.walletAddress,
      newWallet: account,
      shouldLink: shouldLinkWallet
    });

    if (!shouldLinkWallet) return;

    handleWalletLink(account);
  }, [account, user, handleWalletLink]);

  const handleConnectWallet = async () => {
    if (!user) return;
    
    try {
      console.log('Connecting wallet...');
      await connect();
      console.log('Wallet connected:', account);
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Container maxW="container.sm" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading>Connect Your Wallet</Heading>
          <Text mt={2} color="gray.600">
            Link your wallet to start trading Digimons
          </Text>
        </Box>

        <Box
          p={8}
          borderWidth={1}
          borderRadius="lg"
          boxShadow="sm"
          textAlign="center"
        >
          <VStack spacing={6}>
            <Icon as={FaWallet} boxSize={12} color="blue.500" />
            <Text>
              Welcome, <strong>{user.username}</strong>! To access the marketplace,
              you need to connect your wallet.
            </Text>

            {connectionError && (
              <Text color="red.500" fontSize="sm">
                {connectionError}
              </Text>
            )}

            <Button
              colorScheme="blue"
              size="lg"
              leftIcon={<FaWallet />}
              onClick={handleConnectWallet}
              isLoading={isConnecting}
              loadingText="Connecting..."
            >
              Connect Wallet
            </Button>

            <Text fontSize="sm" color="gray.500">
              Make sure you have MetaMask installed and unlocked
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
