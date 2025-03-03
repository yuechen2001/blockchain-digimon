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
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
} from '@chakra-ui/react';
import { useWeb3Context } from '../../context/Web3Context';
import DigimonDisplay from '../../components/digimonDisplay';
import { ethers } from 'ethers';
import Digimon from '../../shared/models/Digimon';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface OwnedDigimon extends Digimon {
  tokenId: string;
  listingId?: string;
  price?: string;
  expiresAt?: number;
}

export default function MyListings() {
  const [ownedDigimons, setOwnedDigimons] = useState<OwnedDigimon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingPrice, setListingPrice] = useState<string>('0.01');
  const [listingDuration, setListingDuration] = useState<string>('7');
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

  const fetchOwnedDigimons = async () => {
    if (!contract || !account) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get all token IDs owned by the user
      const filter = contract.filters.Transfer(null, account, null);
      const events = await contract.queryFilter(filter);
      const tokenIds = events.map(event => event.args[2].toString());

      // Get all listings to check if any owned tokens are listed
      const listingCounter = await contract._listingCounter();
      const listings = [];
      
      // Use the public listings mapping
      for (let i = 0; i < listingCounter; i++) {
        const listing = await contract.listings(i);
        if (listing.isActive && listing.seller.toLowerCase() === account.toLowerCase()) {
          listings.push({
            listingId: i.toString(),
            tokenId: listing.digimonId.toString(),
            price: ethers.formatEther(listing.price),
            seller: listing.seller,
            expiresAt: Number(listing.expiresAt),
          });
        }
      }

      const formattedTokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            // Check if we still own this token
            const currentOwner = await contract.ownerOf(tokenId);
            if (currentOwner.toLowerCase() !== account.toLowerCase()) {
              return null;
            }

            // Fetch Digimon data from your API
            const response = await fetch(`${process.env.NEXT_PUBLIC_DIGIMON_API_URL}${tokenId}`);
            if (!response.ok) return null;
            const digimonData = await response.json();

            // Check if token is listed
            const listing = listings.find(l => l.tokenId === tokenId);

            return {
              ...digimonData,
              tokenId,
              ...(listing && {
                listingId: listing.listingId,
                price: listing.price,
                expiresAt: listing.expiresAt,
              }),
            };
          } catch (err) {
            console.error(`Error fetching token ${tokenId}:`, err);
            return null;
          }
        })
      );

      setOwnedDigimons(formattedTokens.filter(Boolean) as OwnedDigimon[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch owned Digimons');
      toast({
        title: 'Error',
        description: 'Failed to fetch your Digimons',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleList = async (tokenId: string) => {
    if (!contract) return;

    try {
      const priceInWei = ethers.parseEther(listingPrice);
      const durationInSeconds = Number(listingDuration) * 24 * 60 * 60; // Convert days to seconds

      // List the token
      const tx = await contract.listDigimon(
        tokenId,
        priceInWei,
        durationInSeconds,
        { value: ethers.parseEther('0.05') } // Required listing fee
      );
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Successfully listed your Digimon NFT!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh the listings
      await fetchOwnedDigimons();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to list NFT',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (contract && account) {
      fetchOwnedDigimons();
    }
  }, [contract, account]);

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
        <Heading>My Digimons</Heading>
        <HStack spacing={4}>
          <Button
            colorScheme="blue"
            onClick={() => router.push('/marketplace')}
          >
            Back to Marketplace
          </Button>
          <Button
            colorScheme="red"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </HStack>
      </HStack>
      {ownedDigimons.length === 0 ? (
        <Text>You don't own any Digimons yet.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {ownedDigimons.map((digimon) => (
            <Box
              key={digimon.tokenId}
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p={4}
            >
              <DigimonDisplay digimon={digimon} />
              {digimon.listingId ? (
                <VStack mt={4} spacing={2}>
                  <Text fontWeight="bold">Listed for: {digimon.price} ETH</Text>
                  <Text fontSize="sm" color="gray.500">
                    Expires: {new Date(digimon.expiresAt! * 1000).toLocaleString()}
                  </Text>
                </VStack>
              ) : (
                <VStack mt={4} spacing={2}>
                  <HStack width="full">
                    <Text>Price (ETH):</Text>
                    <NumberInput
                      value={listingPrice}
                      onChange={(value) => setListingPrice(value)}
                      min={0.01}
                      max={100}
                      step={0.01}
                      precision={2}
                      flex={1}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </HStack>
                  <HStack width="full">
                    <Text>Duration (days):</Text>
                    <NumberInput
                      value={listingDuration}
                      onChange={(value) => setListingDuration(value)}
                      min={1}
                      max={30}
                      step={1}
                      flex={1}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </HStack>
                  <Button
                    colorScheme="blue"
                    width="full"
                    onClick={() => handleList(digimon.tokenId)}
                  >
                    List for Sale
                  </Button>
                  <Text fontSize="xs" color="gray.500">
                    *Requires 0.05 ETH listing fee
                  </Text>
                </VStack>
              )}
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
