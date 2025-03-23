'use client';

import { 
  Container, 
  Heading, 
  Text, 
  Box, 
  VStack, 
  SimpleGrid, 
  Spinner, 
  HStack, 
  Button,
  useToast,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { IoRefreshOutline, IoSearchOutline } from 'react-icons/io5';
import { useWeb3Context } from '../../context/Web3Context';
import { GlobalHeader } from '../../components/GlobalHeader';
import DigimonDisplay from '../../components/DigimonDisplay';
import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import Digimon from '../../shared/models/Digimon';
import ClientOnlyAlert from '../../components/ClientOnlyAlert';

interface OwnedDigimon {
  digimon: Digimon;
  tokenId: string;
  listingId?: string;
  price?: string;
  seller?: string;
  expiresAt?: number;
  isOwnedByUser: boolean;
}

export default function MyListings() {
  const [ownedDigimons, setOwnedDigimons] = useState<OwnedDigimon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { account, isConnected, marketplaceContract, tokenContract } = useWeb3Context();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDigimonFromIPFS = async (ipfsHash: string) => {
    try {
      const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching digimon from IPFS:', error);
      return null;
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredDigimons = ownedDigimons.filter((ownedDigimon) => 
    ownedDigimon.digimon?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ownedDigimon.tokenId.toString().includes(searchTerm)
  );

  const fetchOwnedDigimons = useCallback(async () => {
    if (!marketplaceContract || !tokenContract || !account) {
      setError('Please connect your wallet');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching owned Digimons for account:', account);

      // Get all token IDs owned by the user
      const filter = tokenContract.filters.Transfer(null, account, null);
      console.log('Fetching transfer events...');
      const events = await tokenContract.queryFilter(filter);
      
      // Filter events and safely extract tokenIds
      const tokenIds = events.map((event: any) => {
        // Check if the event has args property (is an EventLog)
        if ('args' in event && event.args) {
          return event.args[2].toString();
        }
        return null;
      })
      .filter(id => id !== null); // Remove null values
      
      console.log('Found token IDs:', tokenIds);

      // Get all listings to check if any owned tokens are listed
      const listings: any[] = [];
      
      try {
        // Get active listing IDs
        const listedDigimonsIds = await marketplaceContract.getActiveListingIds();
        console.log('Active listing IDs:', listedDigimonsIds);
        
        // Check each listing to see if it belongs to the current user
        for (const listingId of listedDigimonsIds) {
          try {
            const [listingResult, isValid] = await marketplaceContract.getListing(listingId);
            
            if (isValid && listingResult[2].toLowerCase() === account.toLowerCase()) {
              // Example listingResult:
              // {
              //   0: 8n,                 // listingId
              //   1: 8n,                 // tokenId
              //   2: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',  // seller
              //   3: 100000000000000000n, // price (0.1 ETH)
              //   4: true,               // isActive
              //   5: 1742517365n,        // createdAt
              //   6: 1743122165n,        // expiresAt
              // }
              
              // Skip expired listings
              const currentTime = Math.floor(Date.now() / 1000);
              const expiresAt = Number(listingResult[6]);
              const isExpired = expiresAt <= currentTime;
              
              if (isExpired) {
                console.log('Listing', listingId, 'is expired');
                continue;
              }
              
              listings.push({
                listingId: listingResult[0].toString(),
                tokenId: listingResult[1].toString(),
                seller: listingResult[2].toString(),
                price: ethers.formatEther(listingResult[3]),
                isActive: listingResult[4],
                createdAt: Number(listingResult[5]),
                expiresAt: expiresAt
              });
              
              console.log('Found active listing:', listings[listings.length - 1]);
            }
          } catch (err) {
            console.error(`Error checking listing ${listingId}:`, err);
          }
        }
      } catch (err) {
        console.error('Error fetching active listings:', err);
      }

      const formattedTokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            console.log('Processing token:', tokenId);
            // Check if we still own this token
            const currentOwner = await tokenContract.ownerOf(tokenId);
            if (currentOwner.toLowerCase() !== account.toLowerCase()) {
              console.log('Token', tokenId, 'no longer owned by account');
              return null;
            }

            // Get the token URI and metadata
            const tokenURI = await tokenContract.tokenURI(tokenId).then((uri) => uri.replace('ipfs://', ''));
            console.log('Token URI:', tokenURI);
            
            // Fetch the token metadata
            const digimonMetadata = await fetchDigimonFromIPFS(tokenURI);
            if (!digimonMetadata) {
              console.error(`Failed to fetch metadata for token ${tokenId}`);
              return null;
            }

            // Check if token is listed
            const listing = listings.find(l => l.tokenId === tokenId);
            console.log('Listing status for token', tokenId, ':', listing || 'not listed');

            return {
              digimon: digimonMetadata,
              tokenId,
              listingId: listing?.listingId,
              price: listing?.price,
              seller: listing?.seller,
              expiresAt: listing?.expiresAt,
              isOwnedByUser: true
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
  }, [marketplaceContract, tokenContract, account, toast]);

  useEffect(() => {
    if (marketplaceContract && tokenContract && isConnected) {
      fetchOwnedDigimons();
    }
  }, [marketplaceContract, tokenContract, isConnected, fetchOwnedDigimons]);

  // Client-side only rendering for conditional UI elements
  const [isBrowser, setIsBrowser] = useState(false);
  
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Return consistent UI structure for server rendering
  if (!isBrowser) {
    return (
      <>
        <GlobalHeader />
        <Container maxW="container.xl" py={8}>
          <VStack spacing={6} align="stretch">
            <HStack justifyContent="space-between">
              <Heading size="xl">My Digimons</Heading>
            </HStack>
            <Text mt={2} color="gray.600">
              Loading...
            </Text>
          </VStack>
        </Container>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <GlobalHeader />
        <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
            <HStack justifyContent="space-between">
              <Heading size="xl">My Digimons</Heading>
            </HStack>
            <ClientOnlyAlert
              status="warning"
              title="Wallet not connected!"
              description="Please connect your wallet to view your Digimons."
            />
          </VStack>
        </Container>
      </>
    );
  }

  return (
    <>
      <GlobalHeader />
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justifyContent="space-between">
            <Heading size="xl">My Digimons</Heading>
          </HStack>
          
          {/* Refresh button and search bar */}
          <HStack width="100%" spacing={4} justifyContent="space-between" mb={4}>
            <InputGroup maxW="md">
              <InputLeftElement pointerEvents="none">
                <Icon as={IoSearchOutline} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={handleSearchChange}
                bg="white"
                borderRadius="md"
              />
            </InputGroup>
            <Button
              leftIcon={<Icon as={IoRefreshOutline} />}
              onClick={fetchOwnedDigimons}
              isLoading={isLoading}
              colorScheme="blue"
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>

          {isLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
              <Text mt={4}>Loading your Digimons...</Text>
            </Box>
          ) : error ? (
            <ClientOnlyAlert
              status="error"
              title="Error!"
              description={error}
            />
          ) : ownedDigimons.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text>You don't own any Digimons yet.</Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {filteredDigimons.map((ownedDigimon) => (
                <DigimonDisplay
                  key={ownedDigimon.tokenId}
                  digimon={ownedDigimon.digimon}
                  tokenId={ownedDigimon.tokenId}
                  isListed={!!ownedDigimon.listingId}
                  listingPrice={ownedDigimon.price}
                  isOwner={true}
                  seller={ownedDigimon.seller}
                  expiresAt={ownedDigimon.expiresAt}
                />
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Container>
    </>
  );
}
