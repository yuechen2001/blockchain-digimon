'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  Spinner,
  useToast,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useWeb3Context } from '../../context/Web3Context';
import DigimonDisplay from '../../components/digimonDisplay';
import { GlobalHeader } from '../../components/GlobalHeader';
import { ethers } from 'ethers';
import Digimon from '../../shared/models/Digimon';

interface ListedDigimon extends Digimon {
  listingId: string;
  price: string;
  seller: string;
  tokenId: string;
  expiresAt: number;
}

export default function Marketplace() {
  const [listedDigimons, setListedDigimons] = useState<ListedDigimon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { contract, account, isConnected } = useWeb3Context();
  const toast = useToast();

  const fetchListedDigimons = async () => {
    if (!contract || !isConnected) {
      setError('Contract not initialized or wallet not connected');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching listings...');

      const activeListings: ListedDigimon[] = [];
      let listingId = 0;
      let hasMore = true;

      // Keep fetching listings until we find one that doesn't exist
      while (hasMore) {
        try {
          console.log('Checking listing', listingId);
          const listing = await contract.listings(listingId);
          
          // Check if listing is active and not expired
          if (listing.isActive && listing.expiresAt > Date.now() / 1000) {
            const tokenId = listing.digimonId.toString();
            console.log('Found active listing for token:', tokenId);
            
            // For now, use mock data since we don't have the API
            const digimonData = {
              name: `Digimon #${tokenId}`,
              image: `https://placekitten.com/200/200?${tokenId}`, // Placeholder image
              description: `A powerful Digimon with ID ${tokenId}`,
              attributes: []
            };

            activeListings.push({
              ...digimonData,
              listingId: listingId.toString(),
              tokenId,
              price: ethers.formatEther(listing.price),
              seller: listing.seller,
              expiresAt: Number(listing.expiresAt),
              id: 0,
              xAntibody: false,
              images: [],
              levels: [],
              types: [],
              fields: [],
              releaseDate: '',
              descriptions: [],
              skills: [],
              priorEvolutions: [],
              nextEvolutions: []
            });
            console.log('Added listing:', activeListings[activeListings.length - 1]);
          }
          listingId++;
        } catch (err) {
          console.log('No more listings found at index', listingId);
          hasMore = false;
        }
      }

      console.log('Final active listings:', activeListings);
      setListedDigimons(activeListings);
    } catch (err) {
      console.error('Error in fetchListedDigimons:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
      toast({
        title: 'Error',
        description: 'Failed to fetch marketplace listings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contract && isConnected) {
      fetchListedDigimons();
    }
  }, [contract, isConnected]);

  if (!isConnected) {
    return (
      <>
        <GlobalHeader />
        <Container maxW="container.xl" py={10}>
          <Alert status="warning">
            <AlertIcon />
            <AlertTitle>Wallet not connected!</AlertTitle>
            <AlertDescription>Please connect your wallet to view marketplace listings.</AlertDescription>
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <GlobalHeader />
      <Container maxW="container.xl" py={10}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="xl">Marketplace</Heading>
            <Text mt={2} color="gray.600">
              Browse and purchase Digimons
            </Text>
          </Box>

          {isLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" />
              <Text mt={4}>Loading marketplace listings...</Text>
            </Box>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : listedDigimons.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text>No Digimons are currently listed in the marketplace.</Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {listedDigimons.map((digimon) => (
                <DigimonDisplay
                  key={digimon.listingId}
                  digimon={digimon}
                />
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Container>
    </>
  );
}
