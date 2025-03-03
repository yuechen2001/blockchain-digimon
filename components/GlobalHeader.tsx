'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Text,
  useToast,
  Tooltip,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Spinner,
  Container,
  Flex,
  Link,
} from '@chakra-ui/react';
import { useWeb3Context } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { FaWallet, FaExclamationTriangle, FaChevronDown } from 'react-icons/fa';

export const GlobalHeader: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const {
    account,
    isConnecting,
    isReconnecting,
    connect,
    disconnect: disconnectWallet,
    connectionError,
    isConnected,
  } = useWeb3Context();
  
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFullLogout = async () => {
    try {
      // First disconnect wallet
      await disconnectWallet();
      // Then clear auth session
      await logout();
      // Redirect to home
      router.push('/');
    } catch (error) {
      toast({
        title: 'Error logging out',
        description: error instanceof Error ? error.message : 'Failed to log out',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      toast({
        title: 'Error connecting wallet',
        description: error instanceof Error ? error.message : 'Failed to connect wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Only hide header on the landing page
  if (pathname === '/') {
    return null;
  }

  // Prevent hydration issues by not rendering wallet-dependent content until mounted
  if (!mounted) {
    return (
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg="white"
        boxShadow="sm"
        zIndex={100}
        py={4}
        px={8}
      >
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Button
              variant={pathname === '/marketplace' ? 'solid' : 'ghost'}
              colorScheme="blue"
            >
              Marketplace
            </Button>
            <Button
              variant={pathname === '/my-listings' ? 'solid' : 'ghost'}
              colorScheme="blue"
            >
              My Digimons
            </Button>
          </HStack>
          <HStack spacing={4}>
            <Button
              colorScheme="blue"
              disabled
            >
              <HStack spacing={2}>
                <Spinner size="sm" />
                <Text>Loading...</Text>
              </HStack>
            </Button>
          </HStack>
        </HStack>
      </Box>
    );
  }

  return (
    <>
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg="white"
        boxShadow="sm"
        zIndex={100}
        py={4}
        px={8}
      >
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Button
              variant={pathname === '/marketplace' ? 'solid' : 'ghost'}
              colorScheme="blue"
              onClick={() => router.push('/marketplace')}
            >
              Marketplace
            </Button>
            <Button
              variant={pathname === '/my-listings' ? 'solid' : 'ghost'}
              colorScheme="blue"
              onClick={() => router.push('/my-listings')}
            >
              My Digimons
            </Button>
          </HStack>

          <HStack spacing={4}>
            {connectionError ? (
              <Text color="red.500" fontSize="sm">
                <Icon as={FaExclamationTriangle} mr={2} />
                {connectionError}
              </Text>
            ) : isConnected && account ? (
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<FaChevronDown />}
                  leftIcon={<Icon as={FaWallet} color="green.500" />}
                  disabled={isConnecting || isReconnecting}
                >
                  {`${account.slice(0, 6)}...${account.slice(-4)}`}
                </MenuButton>
                <MenuList>
                  <MenuItem
                    onClick={handleFullLogout}
                    color="red.500"
                    disabled={isConnecting || isReconnecting}
                  >
                    Logout & Disconnect Wallet
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={FaWallet} />}
                onClick={handleConnect}
                disabled={isConnecting || isReconnecting}
              >
                {isConnecting || isReconnecting ? (
                  <HStack spacing={2}>
                    <Spinner size="sm" />
                    <Text>Connecting...</Text>
                  </HStack>
                ) : (
                  'Connect Wallet'
                )}
              </Button>
            )}
          </HStack>
        </HStack>
      </Box>
      <Box height="64px" />
    </>
  );
};
