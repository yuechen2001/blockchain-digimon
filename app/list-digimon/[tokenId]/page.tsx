'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Container, 
  Box, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Button, 
  Input, 
  Spinner, 
  useToast,
  Badge,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  Card,
  CardBody,
  CardHeader,
  InputGroup,
  InputLeftElement,
  Icon,
  Flex,
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { IoWalletOutline, IoTimeOutline, IoPricetagOutline, IoArrowBackOutline, IoCheckmarkCircleOutline, IoRefreshOutline } from 'react-icons/io5';
import { GlobalHeader } from '../../../components/GlobalHeader';
import ClientOnlyAlert from '../../../components/ClientOnlyAlert';
import React from 'react';
import { useListDigimon } from '../../../hooks/useListDigimon';

// Define steps for the listing process
const steps = [
  { title: 'Approval', description: 'Authorize marketplace' },
  { title: 'Listing', description: 'Set price and duration' },
];

// Component to display the stepper for listing process
const ListingSteps = ({ activeStep, stepperBg }: { activeStep: number, stepperBg: string }) => (
  <Box 
    bg={stepperBg} 
    p={4} 
    borderRadius="md"
    mb={2}
  >
    <Stepper 
      index={activeStep} 
      colorScheme="blue"
      size="md"
    >
      {steps.map((step, index) => (
        <Step key={index}>
          <StepIndicator>
            <StepStatus
              complete={<StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>
          <Box flexShrink="0">
            <StepTitle fontSize="md">{step.title}</StepTitle>
            <StepDescription fontSize="sm">{step.description}</StepDescription>
          </Box>
          <StepSeparator />
        </Step>
      ))}
    </Stepper>
  </Box>
);

// Component to display Digimon preview
const DigimonPreview = ({ digimon, tokenId, accentBg }: { digimon: any, tokenId: string, accentBg: string }) => {
  if (!digimon) return null;
  
  return (
    <Flex 
      direction={{ base: "column", sm: "row" }} 
      align="center" 
      gap={4}
      p={4}
      bg={accentBg}
      borderRadius="md"
    >
      <Box 
        position="relative" 
        width={{ base: "100%", sm: "150px" }} 
        height={{ base: "200px", sm: "150px" }} 
        borderRadius="md" 
        overflow="hidden"
        flexShrink={0}
        border="1px solid"
        borderColor="gray.200"
      >
        <Image
          src={digimon.images?.[0]?.href || '/placeholder.png'}
          alt={digimon.name || 'Digimon'}
          fill
          sizes="(max-width: 600px) 100vw, 150px"
          style={{ objectFit: 'cover' }}
          priority
        />
      </Box>
      
      <VStack align={{ base: "center", sm: "start" }} spacing={2} flex="1">
        <Heading size="lg" mt={{ base: 2, sm: 0 }}>{digimon.name}</Heading>
        
        <HStack wrap="wrap" justify={{ base: "center", sm: "flex-start" }}>
          {digimon.levels?.map((level: any, index: number) => (
            <Badge 
              key={index} 
              colorScheme="purple" 
              px={2} 
              py={1}
              borderRadius="full"
              fontSize="md"
            >
              {level.level}
            </Badge>
          ))}
        </HStack>
        
        {digimon?.types && digimon.types.length > 0 && (
          <HStack wrap="wrap" justify={{ base: "center", sm: "flex-start" }}>
            {digimon.types.slice(0, 3).map((type: any, index: number) => (
              <Badge 
                key={index} 
                colorScheme="blue" 
                variant="solid" 
                px={2} 
                py={1}
                borderRadius="md"
                fontSize="md"
              >
                {type.type}
              </Badge>
            ))}
            {digimon.types.length > 3 && (
              <Badge px={2} py={1} fontSize="md" colorScheme="gray">+{digimon.types.length - 3}</Badge>
            )}
          </HStack>
        )}
      </VStack>
    </Flex>
  );
};

// Component for the approval step (step 0)
const ApprovalStep = ({ isListing, onApprove }: { isListing: boolean, onApprove: () => void }) => (
  <VStack spacing={4} align="stretch">
    <Text fontSize="md" color="gray.600">
      Before listing your Digimon, you need to authorize the marketplace to transfer it when sold.
    </Text>
    <Button 
      colorScheme="blue" 
      onClick={onApprove}
      isLoading={isListing}
      loadingText="Approving..."
      leftIcon={<IoWalletOutline />}
      size="lg"
      width={{ base: "100%", md: "auto" }}
      alignSelf={{ base: "stretch", md: "flex-start" }}
    >
      Approve Marketplace Access
    </Button>
  </VStack>
);

// Component for the listing form step (step 1)
const ListingFormStep = ({ 
  price, 
  setPrice, 
  duration, 
  setDuration, 
  isListing, 
  hasListingError, 
  lastError, 
  onResetForm, 
  onList 
}: { 
  price: string, 
  setPrice: (price: string) => void, 
  duration: string, 
  setDuration: (duration: string) => void, 
  isListing: boolean, 
  hasListingError: boolean, 
  lastError: string | null, 
  onResetForm: () => void, 
  onList: () => void 
}) => (
  <VStack spacing={4} align="stretch">
    {hasListingError && (
      <Box 
        p={3} 
        borderRadius="md" 
        bg="red.50" 
        borderWidth="1px" 
        borderColor="red.200"
      >
        <Text color="red.600" fontSize="md">
          {lastError || "There was an error with the previous transaction. Try refreshing the form."}
        </Text>
        <Button
          mt={2}
          size="sm"
          leftIcon={<IoRefreshOutline />}
          colorScheme="red"
          variant="outline"
          onClick={onResetForm}
        >
          Reset Form
        </Button>
      </Box>
    )}
    
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={4}
      width="100%"
    >
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none">
          <Icon as={IoPricetagOutline} color="gray.500" />
        </InputLeftElement>
        <Input
          placeholder="Price in ETH"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          step="0.01"
          borderColor="gray.300"
          _hover={{ borderColor: "blue.300" }}
          _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
          isDisabled={isListing}
          fontSize="md"
        />
      </InputGroup>
      
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none">
          <Icon as={IoTimeOutline} color="gray.500" />
        </InputLeftElement>
        <Input
          placeholder="Duration in days"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          type="number"
          min="1"
          borderColor="gray.300"
          _hover={{ borderColor: "blue.300" }}
          _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
          isDisabled={isListing}
          fontSize="md"
        />
      </InputGroup>
    </Flex>
    
    <Button 
      onClick={onList} 
      colorScheme="blue"
      leftIcon={isListing ? <Spinner size="sm" /> : <IoPricetagOutline />}
      isDisabled={!price || !duration || isListing || hasListingError}
      isLoading={isListing}
      loadingText="Creating Listing..."
      size="lg"
      width={{ base: "100%", md: "auto" }}
      alignSelf={{ base: "stretch", md: "flex-start" }}
    >
      List for Sale
    </Button>
  </VStack>
);

// Component for the confirmation step (step 2)
const ConfirmationStep = ({ 
  price, 
  duration, 
  onGoBack, 
  onGoToMarketplace 
}: { 
  price: string, 
  duration: string, 
  onGoBack: () => void, 
  onGoToMarketplace: () => void 
}) => (
  <VStack spacing={4} align="center">
    <Flex 
      bg="green.50" 
      p={4} 
      borderRadius="md" 
      borderWidth="1px" 
      borderColor="green.200"
      width="100%"
      gap={3}
      align="center"
    >
      <Icon as={IoCheckmarkCircleOutline} boxSize={10} color="green.500" />
      <VStack align="start" spacing={1}>
        <Heading size="md" color="green.700">Listing Complete!</Heading>
        <Text fontSize="md">
          Your Digimon is now listed for {price} ETH for {duration} days
        </Text>
      </VStack>
    </Flex>
    
    <HStack spacing={4}>
      <Button 
        colorScheme="blue" 
        variant="outline" 
        onClick={onGoBack}
        size="md"
      >
        Back to My Digimons
      </Button>
      <Button 
        colorScheme="blue" 
        onClick={onGoToMarketplace}
        size="md"
      >
        Go to Marketplace
      </Button>
    </HStack>
  </VStack>
);

// Component for the error reset dialog
const ErrorResetDialog = ({ 
  isOpen, 
  onClose, 
  onResetForm, 
  onResetProcess 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onResetForm: () => void, 
  onResetProcess: () => void 
}) => {
  const cancelRef = React.useRef(null);
  
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Reset Listing Process
          </AlertDialogHeader>

          <AlertDialogBody>
            It looks like a previous transaction was interrupted. To ensure proper functionality, we recommend completely resetting the listing process.
            
            <Text mt={2} fontWeight="bold">Would you like to reset the entire listing process?</Text>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onResetForm}>
              Just Reset Form
            </Button>
            <Button colorScheme="blue" onClick={onResetProcess} ml={3}>
              Full Reset
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default function ListDigimon() {
  const router = useRouter();
  const params = useParams();
  const tokenId = typeof params.tokenId === 'string' ? params.tokenId : '';
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [mounted, setMounted] = useState(false);
  
  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const accentBg = useColorModeValue('blue.50', 'blue.900');
  const stepperBg = useColorModeValue('gray.50', 'gray.700');

  // Use our custom hook
  const {
    digimon,
    price,
    setPrice,
    duration,
    setDuration,
    isListing,
    isCheckingApproval,
    hasListingError,
    lastError,
    step: activeStep,
    isConnected,
    approveForListing,
    listDigimon,
    resetListingForm,
    resetProcess
  } = useListDigimon(tokenId);

  // Client-side only code
  useEffect(() => {
    // Set mounted for other effects that need it
    setMounted(true);
    
    // Always check for recent completion on client-side
    if (typeof window !== 'undefined') {
      const checkForRecentCompletion = () => {
        // Same implementation as before
        const matchingKey = Object.keys(sessionStorage).find(key => 
          key.startsWith(`listing-completed-${tokenId}-`));
        
        if (matchingKey) {
          const timestamp = parseInt(matchingKey.split('-').pop() || '0', 10);
          const isRecent = Date.now() - timestamp < 60 * 60 * 1000; // 1 hour
          
          if (isRecent) {
            return true;
          } else {
            sessionStorage.removeItem(matchingKey);
          }
        }
        return false;
      };

      if (checkForRecentCompletion()) {
        router.replace('/marketplace'); // Redirect to marketplace if listing was recently completed
      }
    }
  }, [router, tokenId]); 

  // Handle approval for listing with toast notifications
  const handleApproveForListing = async () => {
    try {
      // Create toast to inform user about approval
      toast({
        title: 'Step 1 of 2: Approval Required',
        description: 'Please approve the marketplace to handle your Digimon',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      // Show loading toast
      const loadingToastId = toast({
        title: 'Processing Approval (Step 1 of 2)',
        description: 'Please wait while your approval is being processed...',
        status: 'loading',
        duration: null,
        isClosable: true,
      });
      
      await approveForListing();
      
      // Close loading toast
      toast.close(loadingToastId);
      
      toast({
        title: 'Step 1 Complete',
        description: 'Approval successful! Proceeding to listing (Step 2)',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      let errorMessage = "Failed to approve the marketplace. Please try again.";
      
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        errorMessage = typeof message === 'string' ? message : errorMessage;
        
        // If user rejected transaction, redirect to My Digimons page
        if (errorMessage.includes("user rejected")) {
          // Close all existing toasts before showing cancellation toast
          toast.closeAll();
          
          toast({
            title: 'Transaction Cancelled',
            description: 'You cancelled the approval transaction',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          router.push('/my-listings');
          return;
        }
      }
      
      toast({
        title: 'Approval Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Wrap resetListingForm with dialog close
  const handleResetListingForm = () => {
    resetListingForm();
    onClose();
  };

  // Wrap resetProcess with dialog close
  const handleResetProcess = async () => {
    await resetProcess();
    onClose();
  };

  // Listing functionality with toast notifications
  const handleList = async () => {
    try {
      // Create loading toast and store its ID
      const loadingToastId = toast({
        title: 'Step 2 of 2: Creating Listing',
        description: 'Please confirm the transaction to list your Digimon...',
        status: 'loading',
        duration: null,
        isClosable: true,
      });
      
      await listDigimon();
      
      // Close loading toast
      toast.close(loadingToastId);

      // Set listing complete state with timestamp
      sessionStorage.setItem(`listing-completed-${tokenId}-${Date.now()}`, 'true');
      
      toast({
        title: 'Success',
        description: 'Your Digimon has been listed on the marketplace!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      let errorMessage = "Failed to list your Digimon. Please try again.";
      
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        errorMessage = typeof message === 'string' ? message : errorMessage;
        
        // If user rejected transaction, redirect to My Digimons page
        if (errorMessage.includes("user rejected") || errorMessage.includes("Transaction cancelled by user")) {
          toast.closeAll();
          
          toast({
            title: 'Transaction Cancelled',
            description: 'You cancelled the listing transaction',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          router.push('/my-listings');
          return;
        }
        
        // For execution reverted errors, show the reset dialog
        if (errorMessage.includes("execution reverted") || errorMessage.includes("interrupted previous transaction")) {
          onOpen(); // Open dialog for reset
        }
      }
      
      toast({
        title: 'Listing Failed',
        description: errorMessage,
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    }
  };

  const handleGoToMarketplace = () => {
    router.replace('/marketplace'); 
  };

  const handleGoBack = () => {
    router.replace('/my-listings'); 
  };

  // Return structure for client-side rendering
  if (!mounted) {
    return (
      <>
        <GlobalHeader />
        <Container maxW="container.xl" py={8}>
          <Box textAlign="center" py={10}>
            <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
            <Text mt={4} fontSize="lg">Loading...</Text>
          </Box>
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
            <ClientOnlyAlert
              status="warning"
              title="Wallet not connected!"
              description="Please connect your wallet to list your Digimon for sale."
            />
          </VStack>
        </Container>
      </>
    );
  }

  return (
    <>
      <GlobalHeader />
      <Container maxW="container.lg" py={6}>
        <Box mb={4}>
          <Button 
            leftIcon={<IoArrowBackOutline />} 
            variant="outline" 
            size="md"
            onClick={handleGoBack}
            isDisabled={isListing}
          >
            Back to My Digimons
          </Button>
        </Box>
        
        <Card
          bg={cardBg}
          shadow="md"
          borderRadius="lg"
          overflow="hidden"
          mb={6}
        >
          <CardHeader pb={0}>
            <Flex justify="space-between" align="center" wrap="wrap">
              <Heading size="lg" fontWeight="bold">List Your Digimon</Heading>
              {digimon && (
                <HStack>
                  <Text fontWeight="semibold" color="gray.600" fontSize="md">
                    Token ID:
                  </Text>
                  <Badge colorScheme="blue" fontSize="md">{tokenId}</Badge>
                </HStack>
              )}
            </Flex>
          </CardHeader>
          
          <CardBody>
            <VStack spacing={6} align="stretch">
              {/* Stepper component */}
              <ListingSteps activeStep={activeStep} stepperBg={stepperBg} />
              
              {/* Digimon preview */}
              {digimon && <DigimonPreview digimon={digimon} tokenId={tokenId} accentBg={accentBg} />}
              
              {/* Content based on current step */}
              {isCheckingApproval ? (
                <Flex justify="center" align="center" p={4} gap={3}>
                  <Spinner size="md" thickness="3px" speed="0.65s" color="blue.500" />
                  <Text fontSize="lg">Checking approval status...</Text>
                </Flex>
              ) : (
                <Box 
                  p={5}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor="gray.200" 
                >
                  {activeStep === 0 ? (
                    <ApprovalStep 
                      isListing={isListing} 
                      onApprove={handleApproveForListing} 
                    />
                  ) : activeStep === 1 ? (
                    <ListingFormStep 
                      price={price}
                      setPrice={setPrice}
                      duration={duration}
                      setDuration={setDuration}
                      isListing={isListing}
                      hasListingError={hasListingError}
                      lastError={lastError}
                      onResetForm={handleResetListingForm}
                      onList={handleList}
                    />
                  ) : (
                    <ConfirmationStep 
                      price={price}
                      duration={duration}
                      onGoBack={handleGoBack}
                      onGoToMarketplace={handleGoToMarketplace}
                    />
                  )}
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Container>
      
      {/* Error reset dialog */}
      <ErrorResetDialog 
        isOpen={isOpen}
        onClose={onClose}
        onResetForm={handleResetListingForm}
        onResetProcess={handleResetProcess}
      />
    </>
  );
}
