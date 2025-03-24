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
import { useMyListings } from '../../hooks/useMyListings';
import { GlobalHeader } from '../../components/GlobalHeader';
import DigimonDisplay from '../../components/DigimonDisplay';
import { useEffect, useState } from 'react';
import ClientOnlyAlert from '../../components/ClientOnlyAlert';

export default function MyListings() {
  const toast = useToast();
  const [isBrowser, setIsBrowser] = useState(false);
  
  // Use all the functionality from the useMyListings hook
  const { 
    ownedDigimons,
    isLoading,
    isError,
    error,
    isConnected,
    searchTerm,
    setSearchTerm,
    handleSearchChange,
    fetchOwnedDigimons,
    filterListings,
    refetch
  } = useMyListings();

  // Client-side only rendering for conditional UI elements
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Filter digimons based on search term
  const filteredDigimons = isBrowser ? filterListings(searchTerm) : [];

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
          ) : isError ? (
            <ClientOnlyAlert
              status="error"
              title="Error!"
              description={error || "An unknown error occurred"}
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
                  listingPrice={ownedDigimon.price || '0'}
                  isOwner={true}
                  seller={ownedDigimon.seller || ''}
                  expiresAt={ownedDigimon.expiresAt || 0}
                  onPurchaseComplete={fetchOwnedDigimons}
                />
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Container>
    </>
  );
}
