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
  Button,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { useWeb3Context } from '../../context/Web3Context';
import DigimonDisplay from '../../components/digimonDisplay';
import { ethers } from 'ethers';
import Digimon from '../../shared/models/Digimon';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

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
  const { contract, account, disconnect } = useWeb3Context();
  const toast = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      disconnect?.();
      await signOut({ redirect: false });
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

  const fetchListedDigimons = async () => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const listingCounter = await contract._listingCounter();
      const activeListings: ListedDigimon[] = [];

      // Fetch all listings using the public listings mapping
      for (let i = 0; i < listingCounter; i++) {
        const listing = await contract.listings(i);
        
        // Check if listing is active and not expired
        if (listing.isActive && listing.expiresAt > Date.now() / 1000) {
          // Fetch Digimon data from your API
          const tokenId = listing.digimonId.toString();
          const response = await fetch(`${process.env.NEXT_PUBLIC_DIGIMON_API_URL}${tokenId}`);
          if (!response.ok) continue;
          const digimonData = await response.json();

          activeListings.push({
            ...digimonData,
            listingId: i.toString(),
            tokenId,
            price: ethers.formatEther(listing.price),
            seller: listing.seller,
            expiresAt: Number(listing.expiresAt),
          });
        }
      }

      setListedDigimons(activeListings);
    } catch (err) {
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

  const handlePurchase = async (listingId: string, price: string) => {
    if (!contract || !account) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const tx = await contract.buyDigimon(listingId, {
        value: ethers.parseEther(price),
      });
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Successfully purchased Digimon NFT!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh the listings
      await fetchListedDigimons();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to purchase NFT',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (contract) {
      fetchListedDigimons();
    }
  }, [contract]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <HStack justify="space-between" mb={8}>
        <Heading>Marketplace</Heading>
        <HStack spacing={4}>
          <Button
            colorScheme="blue"
            onClick={() => router.push('/my-listings')}
          >
            My Listings
          </Button>
          <Button
            colorScheme="red"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </HStack>
      </HStack>
      {listedDigimons.length === 0 ? (
        <Text>No Digimons currently listed for sale.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {listedDigimons.map((digimon) => (
            <Box
              key={digimon.listingId}
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p={4}
            >
              <DigimonDisplay digimon={digimon} />
              <VStack mt={4} spacing={2}>
                <Text fontWeight="bold">Price: {digimon.price} ETH</Text>
                <Text fontSize="sm" color="gray.500">
                  Seller: {digimon.seller}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Expires: {new Date(digimon.expiresAt * 1000).toLocaleString()}
                </Text>
                {account && account.toLowerCase() !== digimon.seller.toLowerCase() && (
                  <Button
                    colorScheme="blue"
                    width="full"
                    onClick={() => handlePurchase(digimon.listingId, digimon.price)}
                  >
                    Purchase
                  </Button>
                )}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
