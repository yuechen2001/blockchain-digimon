"use client";

import { useState, useEffect } from 'react';
import { Heading, Box, SimpleGrid, Text, Input, InputGroup, InputLeftElement, VStack, Flex, Button, useToast, Container } from '@chakra-ui/react';
import { IoSearchOutline } from 'react-icons/io5';
import DigimonDisplay from '../../components/digimonDisplay';
import { useMarketplace } from '../../hooks/useMarketplace';
import LoadingSpinner from '../../components/LoadingSpinner';
import { GlobalHeader } from '../../components/GlobalHeader';
import ClientOnlyAlert from '../../components/ClientOnlyAlert';

export default function Marketplace() {
  // State for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const toast = useToast(); 

  // Use the marketplace hook
  const { 
    isListingsLoading: isLoading, 
    isConnected,
    isError, 
    error, 
    refetch, 
    filterListings 
  } = useMarketplace();

  // Add mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter listings based on search term
  const filteredListings = mounted ? filterListings(searchTerm) : [];

  // Handle purchase completion
  const handlePurchaseComplete = () => {
    toast({
      title: 'Purchase Successful',
      description: 'Your Digimon has been added to your collection!',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    refetch();
  };

  // Render loading state with GlobalHeader
  if (isLoading && mounted) {
    return (
      <Box minH="100vh">
        <GlobalHeader />
        <Container maxW="container.xl" py={8}>
          <VStack spacing={4} align="stretch">
            <Heading as="h1" size="xl" mb={6}>Digimon Marketplace</Heading>
            <LoadingSpinner message="Loading marketplace listings..." />
          </VStack>
        </Container>
      </Box>
    );
  }

  // Render error state with GlobalHeader
  if (isError && mounted) {
    return (
      <Box minH="100vh">
        <GlobalHeader />
        <Container maxW="container.xl" py={8}>
          <VStack spacing={4} align="stretch">
            <Heading as="h1" size="xl" mb={6}>Digimon Marketplace</Heading>
            <Box p={5} borderWidth="1px" borderRadius="lg" bg="red.50">
              <Text color="red.500">Error loading marketplace: {error instanceof Error ? error.message : 'Unknown error'}</Text>
              <Button mt={4} colorScheme="blue" onClick={() => refetch()}>
                Try Again
              </Button>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh">
      <GlobalHeader />
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="xl">Digimon Marketplace</Heading>
          
          {!isConnected && mounted ? (
            <ClientOnlyAlert
              status="warning"
              title="Wallet not connected!"
              description="Please connect your wallet to view and purchase Digimon."
            />
          ) : (
            <>
              {/* Search Bar - only shown when connected */}
              <InputGroup mb={6}>
                <InputLeftElement pointerEvents="none">
                  <IoSearchOutline color="gray.300" />
                </InputLeftElement>
                <Input 
                  placeholder="Search for Digimon..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              
              {/* Display no results message if needed */}
              {mounted && filteredListings.length === 0 && !isLoading && (
                <Flex 
                  direction="column" 
                  align="center" 
                  justify="center" 
                  p={10} 
                  borderWidth="1px" 
                  borderRadius="lg" 
                  borderStyle="dashed" 
                  borderColor="gray.200"
                >
                  <Text fontSize="xl" mb={4}>No Digimon listings found</Text>
                  {searchTerm ? (
                    <Text color="gray.500">Try a different search term or check back later!</Text>
                  ) : (
                    <Text color="gray.500">Be the first to list your Digimon!</Text>
                  )}
                </Flex>
              )}
              
              {/* Digimon Grid */}
              {mounted && filteredListings.length > 0 && (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {filteredListings.map((listing) => (
                    <DigimonDisplay 
                      key={listing.id}
                      digimon={listing.digimonData}
                      tokenId={listing.tokenId}
                      isListed={true}
                      listingPrice={listing.price}
                      isOwner={listing.isOwnedByUser}
                      seller={listing.seller}
                      expiresAt={listing.expiresAt}
                      onPurchaseComplete={handlePurchaseComplete}
                    />
                  ))}
                </SimpleGrid>
              )}
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
