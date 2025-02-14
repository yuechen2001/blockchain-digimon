'use client';

import { useEffect, useState } from 'react';
import {
  Box,  
  Button,
  Container,
  Heading,
  VStack,
  Text,
  Spinner,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { signOut } from 'next-auth/react';
import { useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import Digimon from '../../shared/models/Digimon';
import DigimonDisplay from '../../components/digimonDisplay';

export default function Home() {
  const [digimon, setDigimon] = useState<Digimon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_DIGIMON_API_URL!;
  const router = useRouter();
  const toast = useToast();
  const { disconnect } = useDisconnect();

  const handleGetRandomDigimon = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const randomId = Math.floor(Math.random() * 1000) + 1;
      const response = await fetch(`${API_URL}${randomId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch Digimon');
      }
      const data = await response.json();
      setDigimon(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Disconnect wallet
      disconnect();
      // Sign out from NextAuth
      await signOut({ redirect: false });
      // Redirect to login page
      router.push('/');
      toast({
        title: 'Logged out successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error logging out',
        description: error instanceof Error ? error.message : 'Failed to log out',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box bg="chakra-body-bg" minH="100vh" py={12} display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="blue.500" borderWidth="4px" />
      </Box>
    );
  }

  return (
    <Box
      bg="chakra-body-bg"
      minH="100vh"
      py={12}
    >
      <Container maxW="container.xl" py={20}>
        <VStack spacing={8} align="stretch">
          <HStack justify="space-between" align="center">
            <Heading
              as="h1"
              size="2xl"
              textAlign="center"
              color="chakra-text"
              mb={4}
            >
              Digimon Discovery
            </Heading>
            <Button
              colorScheme="red"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              loadingText="Logging out..."
            >
              Log Out
            </Button>
          </HStack>

          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleGetRandomDigimon}
            px={8}
            py={6}
            fontSize="lg"
            isLoading={isLoading}
            loadingText="Finding Digimon..."
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
            transition="all 0.2s"
          >
            Discover Random Digimon
          </Button>

          {error && (
            <Text color="red.500" fontSize="lg">
              {error}
            </Text>
          )}

          {isLoading ? (
            <Box p={8}>
              <Spinner size="xl" color="blue.500" borderWidth="4px" />
            </Box>
          ) : (
            digimon && (
              <Box w="100%" maxW="2xl" mx="auto">
                <DigimonDisplay digimon={digimon} />
              </Box>
            )
          )}
        </VStack>
      </Container>
    </Box>
  );
}