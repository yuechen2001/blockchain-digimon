import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Text,
  useToast,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
} from '@chakra-ui/react';
import { useWeb3Context } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { FaWallet, FaExclamationTriangle, FaChevronDown, FaStore, FaDragon, FaSignOutAlt } from 'react-icons/fa';

export const GlobalHeader: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const {
    account,
    isConnecting,
    isReconnecting,
    connect: connectWallet,
    disconnect: disconnectWallet,
    connectionError,
    isConnected,
  } = useWeb3Context();
  
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  // Safely handle client-side only code
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
      await connectWallet();
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

  const content = (
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
              leftIcon={<Icon as={FaStore} />}
              onClick={mounted ? () => router.push('/marketplace') : undefined}
              isDisabled={!mounted}
            >
              Marketplace
            </Button>
            <Button
              variant={pathname === '/my-listings' ? 'solid' : 'ghost'}
              colorScheme="blue"
              leftIcon={<Icon as={FaDragon} />}
              onClick={mounted ? () => router.push('/my-listings') : undefined}
              isDisabled={!mounted}
            >
              My Digimons
            </Button>
          </HStack>

          <HStack spacing={4}>
            {!mounted ? (
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={FaWallet} />}
                isDisabled
              >
                <HStack spacing={2}>
                  <Spinner size="sm" />
                  <Text>Loading...</Text>
                </HStack>
              </Button>
            ) : connectionError ? (
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
                    icon={<Icon as={FaSignOutAlt} />}
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
                isLoading={isConnecting || isReconnecting}
                loadingText="Connecting..."
              >
                Connect Wallet
              </Button>
            )}
          </HStack>
        </HStack>
      </Box>
      {/* Spacer to push content below fixed header */}
      <Box height="72px" />
    </>
  );

  // Only hide header on the landing page
  if (pathname === '/') {
    return null;
  }

  return content;
};
