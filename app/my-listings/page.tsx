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
  const { contract, account, isConnected } = useWeb3Context();
  const toast = useToast();

  const fetchOwnedDigimons = async () => {
    if (!contract || !account) {
      setError('Please connect your wallet');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching owned Digimons for account:', account);

      // Get all token IDs owned by the user
      const filter = contract.filters.Transfer(null, account, null);
      console.log('Fetching transfer events...');
      const events = await contract.queryFilter(filter);
      const tokenIds = events.map(event => event.args[2].toString());
      console.log('Found token IDs:', tokenIds);

      // Get all listings to check if any owned tokens are listed
      const listings = [];
      let listingId = 0;
      let hasMore = true;
      
      // Keep fetching listings until we find one that doesn't exist
      while (hasMore) {
        try {
          console.log('Checking listing', listingId);
          const listing = await contract.listings(listingId);
          if (listing.isActive && listing.seller.toLowerCase() === account.toLowerCase()) {
            listings.push({
              listingId: listingId.toString(),
              tokenId: listing.digimonId.toString(),
              price: ethers.formatEther(listing.price),
              seller: listing.seller,
              expiresAt: Number(listing.expiresAt),
            });
            console.log('Found active listing:', listings[listings.length - 1]);
          }
          listingId++;
        } catch (err) {
          console.log('No more listings found at index', listingId);
          hasMore = false;
        }
      }

      const formattedTokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            console.log('Processing token:', tokenId);
            // Check if we still own this token
            const currentOwner = await contract.ownerOf(tokenId);
            if (currentOwner.toLowerCase() !== account.toLowerCase()) {
              console.log('Token', tokenId, 'no longer owned by account');
              return null;
            }

            // For now, use mock data since we don't have the API
            const digimonData = {
              name: `Digimon #${tokenId}`,
              image: `https://placekitten.com/200/200?${tokenId}`, // Placeholder image
              description: `A powerful Digimon with ID ${tokenId}`,
              attributes: []
            };

            // Check if token is listed
            const listing = listings.find(l => l.tokenId === tokenId);
            console.log('Listing status for token', tokenId, ':', listing || 'not listed');

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

      const filteredTokens = formattedTokens.filter(Boolean) as OwnedDigimon[];
      console.log('Final owned Digimons:', filteredTokens);
      setOwnedDigimons(filteredTokens);
    } catch (err) {
      console.error('Error in fetchOwnedDigimons:', err);
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
    if (!contract) {
      toast({
        title: 'Error',
        description: 'Contract not initialized',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      console.log('Listing token:', tokenId, 'for', listingPrice, 'ETH');
      const priceInWei = ethers.parseEther(listingPrice);
      const durationInSeconds = Number(listingDuration) * 24 * 60 * 60; // Convert days to seconds

      // List the token
      const tx = await contract.listDigimon(
        tokenId,
        priceInWei,
        durationInSeconds,
        { value: ethers.parseEther('0.05') } // Required listing fee
      );
      console.log('Listing transaction:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');

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
      console.error('Error listing token:', err);
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
    if (contract && isConnected) {
      fetchOwnedDigimons();
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
            <AlertDescription>Please connect your wallet to view your Digimons.</AlertDescription>
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
            <Heading size="xl">My Digimons</Heading>
            <Text mt={2} color="gray.600">
              View and list your Digimons for sale
            </Text>
          </Box>

          {isLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" />
              <Text mt={4}>Loading your Digimons...</Text>
            </Box>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : ownedDigimons.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text>You don't own any Digimons yet.</Text>
            </Box>
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
                  <VStack mt={4} spacing={2}>
                    {digimon.listingId ? (
                      <>
                        <Text fontWeight="bold">Listed for {digimon.price} ETH</Text>
                        <Text fontSize="sm" color="gray.500">
                          Expires: {new Date(digimon.expiresAt! * 1000).toLocaleString()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <HStack>
                          <NumberInput
                            value={listingPrice}
                            onChange={setListingPrice}
                            min={0.000001}
                            precision={6}
                            step={0.1}
                            w="full"
                          >
                            <NumberInputField placeholder="Price in ETH" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </HStack>
                        <HStack>
                          <NumberInput
                            value={listingDuration}
                            onChange={setListingDuration}
                            min={1}
                            max={30}
                            w="full"
                          >
                            <NumberInputField placeholder="Duration in days" />
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
                      </>
                    )}
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Container>
    </>
  );
}
