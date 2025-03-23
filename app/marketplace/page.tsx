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
import { useCallback, useEffect, useState } from 'react';
import Digimon from '../../shared/models/Digimon';
import ClientOnlyAlert from '../../components/ClientOnlyAlert';
import { ethers } from 'ethers';

interface ListedDigimon {
  digimon: Digimon;
  tokenId: string;
  listingId: string;
  price: string;
  seller: string;
  expiresAt: number;
  isOwnedByUser: boolean;
}

export default function Marketplace() {
  const [listedDigimons, setListedDigimons] = useState<ListedDigimon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { marketplaceContract, tokenContract, account, isConnected } = useWeb3Context();
  const toast = useToast();

  // Add mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Basic implementation of fetching listings
  const fetchListedDigimons = useCallback(async () => {
    if (!marketplaceContract || !tokenContract || !isConnected) {
      setError('Contract not initialized or wallet not connected');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get active listings from the marketplace contract
      let listedDigimonsIds = [];
      try {
        // Call the contract method to get active listing IDs
        listedDigimonsIds = await marketplaceContract.getActiveListingIds();
      } catch (listingError) {
        // If no listings found, set empty array and return
        setListedDigimons([]);
        setIsLoading(false);
        return;
      }

      if (listedDigimonsIds.length === 0) {
        setListedDigimons([]);
        setIsLoading(false);
        return;
      }

      const listedDigimonsMetadata: ListedDigimon[] = [];
      
      for (const listingId of listedDigimonsIds) {
        try {
          // First get the listing data to extract the correct token ID
          const [listingResult, isActive] = await marketplaceContract.getListing(listingId);
          
          // Skip if listing is not active
          if (!isActive || !listingResult) {
            continue;
          }
          
          // Now use the tokenId from the listing for tokenURI lookup
          const tokenId = listingResult[1].toString();
          const tokenURI = await tokenContract.tokenURI(tokenId).then((uri) => 
            uri.replace('ipfs://', '')
          );
          
          const digimonMetadata = await fetchDigimonFromIPFS(tokenURI).then((data) => data as Digimon);
          
          if (digimonMetadata) {
            const sellerAddress = listingResult[2].toString().toLowerCase();
            const isCurrentUserSeller = account ? sellerAddress === account.toLowerCase() : false;
            
            listedDigimonsMetadata.push({
              digimon: digimonMetadata,
              tokenId: tokenId,
              listingId: listingResult[0].toString(),
              seller: listingResult[2].toString(),
              price: ethers.formatEther(listingResult[3]),
              expiresAt: Number(listingResult[6]),
              isOwnedByUser: isCurrentUserSeller
            });
          }
        } catch (error: any) {
          // Skip individual listing errors without stopping the whole fetch
          console.error(`Error processing listing ${listingId}:`, error);
          continue;
        }
      }
      
      setListedDigimons(listedDigimonsMetadata);
      
    } catch (error: any) {
      setError(`Error fetching listings: ${error.message || 'Unknown error'}`);
      
      toast({
        title: "Error",
        description: `Failed to fetch marketplace listings: ${error.message || 'Unknown error'}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract, tokenContract, account, isConnected, toast]);

  // Fetch listings on component mount
  useEffect(() => {
    if (isConnected && marketplaceContract && tokenContract) {
      fetchListedDigimons();
    }
  }, [isConnected, marketplaceContract, tokenContract, fetchListedDigimons]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchListedDigimons();
  };

  const refreshListings = handleRefresh;

  // Filter Digimons based on search term and exclude user's own listings
  const filteredDigimons = listedDigimons
    .filter(digimon => !digimon.isOwnedByUser) // Filter out Digimons owned by the current user
    .filter(digimon => 
      digimon.digimon?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      digimon.tokenId.toString().includes(searchTerm)
    );

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <Box minH="100vh">
      <GlobalHeader />
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justifyContent="space-between">
            <Heading size="xl">Digimon Marketplace</Heading>
          </HStack>
          {/* Refresh button and search bar - only shown when connected */}
          {isConnected && mounted && (
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
                onClick={refreshListings}
                isLoading={isLoading}
                colorScheme="blue"
                variant="outline"
              >
                Refresh
              </Button>
            </HStack>
          )}
          
          {/* Wallet connection alert banner */}
          {!isConnected && mounted && (
            <ClientOnlyAlert
              status="warning"
              title="Wallet not connected!"
              description="Connect your wallet to view and purchase Digimons"
            />
          )}
          
          {error && mounted && (
            <ClientOnlyAlert
              status="error"
              title="Error!"
              description={error}
            />
          )}
          
          {/* Loading state - only show when connected but data still loading */}
          {isConnected && isLoading && mounted ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
              <Text mt={4}>Loading marketplace listings...</Text>
            </Box>
          ) : isConnected && filteredDigimons.length > 0 && mounted ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {filteredDigimons.map((listedDigimon) => (
                <DigimonDisplay
                  key={listedDigimon.tokenId}
                  digimon={listedDigimon.digimon}
                  tokenId={listedDigimon.tokenId}
                  isListed={true}
                  listingPrice={listedDigimon.price}
                  isOwner={listedDigimon.isOwnedByUser}
                  seller={listedDigimon.seller}
                  expiresAt={listedDigimon.expiresAt}
                  onPurchaseComplete={fetchListedDigimons}
                />
              ))}
            </SimpleGrid>
          ) : isConnected && mounted ? (
            <Box p={10} textAlign="center" bg="gray.50" borderRadius="md">
              <Text fontSize="xl">No active listings found in the marketplace.</Text>
              <Text mt={2} color="gray.600">
                Check back later or list your own Digimon!
              </Text>
            </Box>
          ) : !mounted ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
              <Text mt={4}>Loading...</Text>
            </Box>
          ) : null /* Show nothing else when wallet not connected */}
        </VStack>
      </Container>
    </Box>
  );
}
