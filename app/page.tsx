'use client';

import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Background from '../components/Background';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      if (user.walletAddress) {
        router.push('/marketplace');
      } else {
        router.push('/connect-wallet');
      }
    }
  }, [user, router]);

  if (!mounted) {
    return null; // Prevent rendering until mounted
  }

  return (
    <Background>
      <Container 
        maxW="container.xl" 
        py={20} 
        position="relative" 
        zIndex={2}
      >
        <VStack spacing={10} align="center" textAlign="center">
          <Box
            bg="blackAlpha.700"
            p={8}
            borderRadius="2xl"
            backdropFilter="blur(10px)"
          >
            <VStack spacing={6}>
              <Heading size="2xl" color="white">
                Welcome to Digimon Marketplace
              </Heading>
              <Text fontSize="xl" color="whiteAlpha.900">
                Trade and collect your favorite Digimon NFTs
              </Text>
              <Button
                size="lg"
                colorScheme="blue"
                onClick={() => router.push('/login')}
              >
                Get Started
              </Button>
              <Text color="whiteAlpha.900">
                Already have an account?{' '}
                <Button
                  variant="link"
                  color="blue.500"
                  onClick={() => router.push('/login')}
                >
                  Log in
                </Button>
              </Text>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Background>
  );
}
