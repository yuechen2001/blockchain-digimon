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
} from '@chakra-ui/react';
import Digimon from '../../shared/models/Digimon';
import DigimonDisplay from '../../components/digimonDisplay';
import { useColorModeValue } from '../../components/ui/color-mode';

export default function Home() {
  const [digimon, setDigimon] = useState<Digimon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_DIGIMON_API_URL!;
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const headingColor = useColorModeValue('gray.800', 'white');

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box bg={bgColor} minH="100vh" py={12} display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="blue.500" borderWidth="4px" />
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      minH="100vh"
      py={12}
    >
      <Container maxW="container.lg">
        <VStack gap={8}>
          <Heading
            as="h1"
            size="2xl"
            color={headingColor}
            textAlign="center"
          >
            Digimon Discovery
          </Heading>

          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleGetRandomDigimon}
            px={8}
            py={6}
            fontSize="lg"
            loading={isLoading}
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