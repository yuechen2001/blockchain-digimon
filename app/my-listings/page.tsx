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
import DigimonDisplay from '../../components/digimonDisplay';
import { useEffect, useState, ChangeEvent } from 'react';
import ClientOnlyAlert from '../../components/ClientOnlyAlert';
import Digimon from '../../shared/models/Digimon';

// Define interfaces for our component props
interface OwnedDigimon {
  digimon: Digimon;
  tokenId: string;
  listingId: string;
  price: string;
  seller: string;
  expiresAt: number;
  isOwnedByUser: boolean;
}

interface WithdrawalSectionProps {
  pendingAmount: string;
  isWithdrawLoading: boolean;
  withdrawError: string | null;
  withdrawFunds: () => Promise<boolean>;
  onWithdrawSuccess: () => void;
}

interface SearchControlsProps {
  searchTerm: string;
  handleSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

interface DigimonContentProps {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  ownedDigimons: OwnedDigimon[];
  filteredDigimons: OwnedDigimon[];
  onPurchaseComplete: () => void;
}

// Withdrawal Component
const WithdrawalSection: React.FC<WithdrawalSectionProps> = ({ 
  pendingAmount, 
  isWithdrawLoading, 
  withdrawError, 
  withdrawFunds, 
  onWithdrawSuccess 
}): JSX.Element | null => {
  const toast = useToast();

  if (Number(pendingAmount) <= 0) {
    return null;
  }

  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      bgGradient="linear(to-r, blue.50, green.50)"
      shadow="md"
      mb={4}
    >
      <HStack justifyContent="space-between" alignItems="center">
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold" fontSize="lg">
            Pending Earnings
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="green.500">
            {pendingAmount} ETH
          </Text>
          {withdrawError && (
            <Text color="red.500" fontSize="sm">{withdrawError}</Text>
          )}
        </VStack>
        <Button
          colorScheme="green"
          size="md"
          isLoading={isWithdrawLoading}
          onClick={async () => {
            const success = await withdrawFunds();
            if (success) {
              toast({
                title: "Funds withdrawn successfully!",
                status: "success",
                duration: 5000,
                isClosable: true,
              });
              onWithdrawSuccess();
            }
          }}
        >
          Withdraw Funds
        </Button>
      </HStack>
    </Box>
  );
};

// Search and refresh controls
const SearchControls: React.FC<SearchControlsProps> = ({ 
  searchTerm, 
  handleSearchChange, 
  onRefresh, 
  isLoading 
}) => {
  return (
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
        onClick={onRefresh}
        isLoading={isLoading}
        colorScheme="blue"
        variant="outline"
      >
        Refresh
      </Button>
    </HStack>
  );
};

// Digimon content display
const DigimonContent: React.FC<DigimonContentProps> = ({ 
  isLoading, 
  isError, 
  error, 
  ownedDigimons, 
  filteredDigimons, 
  onPurchaseComplete 
}) => {
  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
        <Text mt={4}>Loading your Digimons...</Text>
      </Box>
    );
  }
  
  if (isError) {
    return (
      <ClientOnlyAlert
        status="error"
        title="Error!"
        description={error || "An unknown error occurred"}
      />
    );
  }
  
  if (ownedDigimons.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Text>You don't own any Digimons yet.</Text>
      </Box>
    );
  }
  
  return (
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
          onPurchaseComplete={onPurchaseComplete}
        />
      ))}
    </SimpleGrid>
  );
};

// Main component
export default function MyListings() {
  const toast = useToast();
  const [isBrowser, setIsBrowser] = useState(false);
  
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
    refetch,
    pendingAmount,
    isWithdrawLoading,
    withdrawError,
    withdrawFunds
  } = useMyListings();

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  const filteredDigimons = isBrowser ? filterListings(searchTerm) : [];

  // Server-side rendering fallback
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

  // Wallet not connected state
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

  // Main content
  return (
    <>
      <GlobalHeader />
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justifyContent="space-between">
            <Heading size="xl">My Digimons</Heading>
          </HStack>
          
          <WithdrawalSection 
            pendingAmount={pendingAmount}
            isWithdrawLoading={isWithdrawLoading}
            withdrawError={withdrawError}
            withdrawFunds={withdrawFunds}
            onWithdrawSuccess={fetchOwnedDigimons}
          />
          
          <SearchControls 
            searchTerm={searchTerm}
            handleSearchChange={handleSearchChange}
            onRefresh={fetchOwnedDigimons}
            isLoading={isLoading}
          />

          <DigimonContent 
            isLoading={isLoading}
            isError={isError}
            error={error}
            ownedDigimons={ownedDigimons}
            filteredDigimons={filteredDigimons}
            onPurchaseComplete={fetchOwnedDigimons}
          />
        </VStack>
      </Container>
    </>
  );
}
