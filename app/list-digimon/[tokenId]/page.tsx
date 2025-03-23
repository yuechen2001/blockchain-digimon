'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Divider, 
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
  useSteps,
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
import { ethers } from 'ethers';
import { useWeb3Context } from '../../../context/Web3Context';
import { GlobalHeader } from '../../../components/GlobalHeader';
import { IoWalletOutline, IoTimeOutline, IoPricetagOutline, IoArrowBackOutline, IoCheckmarkCircleOutline, IoRefreshOutline } from 'react-icons/io5';
import ClientOnlyAlert from '../../../components/ClientOnlyAlert';
import React from 'react';

// Define steps for the listing process
const steps = [
  { title: 'Approval', description: 'Authorize marketplace to transfer your Digimon' },
  { title: 'Listing', description: 'Set price and duration' },
  { title: 'Confirmation', description: 'Finalize marketplace listing' },
];

export default function ListDigimon() {
  const router = useRouter();
  const params = useParams();
  const tokenId = typeof params.tokenId === 'string' ? params.tokenId : '';
  const toast = useToast();
  const { activeStep, setActiveStep, goToNext } = useSteps({ index: 0, count: steps.length });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef(null);
  
  const [digimon, setDigimon] = useState<any>(null);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('7');
  const [isListing, setIsListing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [listingComplete, setListingComplete] = useState(false);
  const [hasListingError, setHasListingError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const { marketplaceContract, tokenContract, account, isConnected } = useWeb3Context();

  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const accentBg = useColorModeValue('blue.50', 'blue.900');
  const stepperBg = useColorModeValue('gray.50', 'gray.700');

  // Fetch Digimon metadata
  const fetchDigimon = useCallback(async () => {
    if (!tokenContract || !tokenId || !account) return;
    
    try {
      setIsCheckingApproval(true);
      
      // Check if the user is the owner of this token
      const owner = await tokenContract.ownerOf(tokenId);
      if (owner.toLowerCase() !== account?.toLowerCase()) {
        toast({
          title: 'Not Authorized',
          description: 'You are not the owner of this Digimon',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        router.push('/my-listings');
        return;
      }

      // Get token URI and metadata
      const tokenURI = await tokenContract.tokenURI(tokenId).then((uri: string) => uri.replace('ipfs://', ''));
      const response = await fetch(`https://ipfs.io/ipfs/${tokenURI}`);
      const data = await response.json();
      setDigimon(data);

      // Check if token is already approved
      await checkApprovalForListing();
    } catch (error) {
      console.error('Error fetching digimon:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Digimon data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCheckingApproval(false);
    }
  }, [tokenContract, tokenId, account, router, toast]);

  // Client-side only code
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (tokenContract && account && mounted) {
      fetchDigimon();
    }
  }, [tokenContract, account, mounted, fetchDigimon]);

  // Update stepper when listing is complete
  useEffect(() => {
    if (listingComplete && activeStep !== 2) {
      setActiveStep(2);
    }
  }, [listingComplete, activeStep, setActiveStep]);

  // Reset error state when user changes price or duration
  useEffect(() => {
    if (hasListingError) {
      setHasListingError(false);
      setLastError(null);
    }
  }, [price, duration]);

  // Check if token is approved for marketplace
  const checkApprovalForListing = async () => {
    if (!tokenContract || !marketplaceContract || !account || !tokenId) {
      return false;
    }
    
    try {
      // Check individual token approval
      const approvedAddress = await tokenContract.getApproved(tokenId);
      const isApprovedForToken = approvedAddress.toLowerCase() === marketplaceContract.target.toString().toLowerCase();
      
      // Check approval for all tokens
      const isApprovedForAll = await tokenContract.isApprovedForAll(account, marketplaceContract.target);
      
      const isApproved = isApprovedForToken || isApprovedForAll;
      setIsApproved(isApproved);
      
      // Update the step if already approved
      if (isApproved) {
        setActiveStep(1);
      }
      
      return isApproved;
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  };

  // Handle approval for listing
  const handleApproveForListing = async () => {
    if (!tokenContract || !marketplaceContract || !tokenId) {
      toast({
        title: 'Error',
        description: 'Contracts not initialized',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
    
    try {
      setIsListing(true);
      
      // Create toast to inform user about approval
      toast({
        title: 'Step 1 of 2: Approval Required',
        description: 'Please approve the marketplace to handle your Digimon',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      const tx = await tokenContract.approve(marketplaceContract.target, tokenId);
      
      // Show loading toast
      const loadingToastId = toast({
        title: 'Processing Approval (Step 1 of 2)',
        description: 'Please wait while your approval is being processed...',
        status: 'loading',
        duration: null,
        isClosable: true,
      });
      
      await tx.wait();
      
      // Close loading toast
      toast.close(loadingToastId);
      
      toast({
        title: 'Step 1 Complete',
        description: 'Approval successful! Proceeding to listing (Step 2)',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      setIsApproved(true);
      setActiveStep(1);
      return true;
    } catch (error) {
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
          return false;
        }
      }
      
      toast({
        title: 'Approval Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      return false;
    } finally {
      setIsListing(false);
    }
  };

  // Reset form state
  const resetListingForm = () => {
    setHasListingError(false);
    setLastError(null);
    setPrice('');
    setDuration('7');
    onClose();
  };

  // Reset entire listing process
  const handleResetProcess = async () => {
    setHasListingError(false);
    setLastError(null);
    setIsCheckingApproval(true);
    
    try {
      // Re-check approval status
      await checkApprovalForListing();
      setPrice('');
      setDuration('7');
      onClose();
    } catch (error) {
      console.error('Error resetting process:', error);
    } finally {
      setIsCheckingApproval(false);
    }
  };

  // Listing functionality for approved Digimons
  const handleList = async () => {
    if (!marketplaceContract || !tokenContract || !account || !tokenId || !isApproved) {
      toast({
        title: 'Error',
        description: isApproved ? 'Please connect your wallet first' : 'Marketplace approval required first',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!price || parseFloat(price) <= 0 || !duration || parseInt(duration) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid price and duration',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Clear any previous errors
    setHasListingError(false);
    setLastError(null);

    try {
      setIsListing(true);
      
      // Proceed with listing
      const priceInWei = ethers.parseEther(price);
      const durationInDays = parseInt(duration);
      const durationInSeconds = durationInDays * 24 * 60 * 60;
      
      // Create loading toast and store its ID
      const loadingToastId = toast({
        title: 'Step 2 of 2: Creating Listing',
        description: 'Please confirm the transaction to list your Digimon...',
        status: 'loading',
        duration: null,
        isClosable: true,
      });

      // Try to get the marketplace listing fee
      let listingFee = ethers.parseEther('0.01'); // Default fee
      try {
        listingFee = await marketplaceContract.getListingFee();
      } catch (feeError) {
        // If we can't get the fee, use default
        console.error('Error getting listing fee:', feeError);
      }
      
      // Create the listing with the listing fee
      const tx = await marketplaceContract.listDigimon(
        tokenId,
        priceInWei,
        durationInSeconds,
        { value: listingFee }
      );
      
      await tx.wait();
      
      // Close loading toast
      toast.close(loadingToastId);
      
      toast({
        title: 'Success',
        description: 'Your Digimon has been listed on the marketplace!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Set listing as complete and update step
      setListingComplete(true);
      setActiveStep(2);
    } catch (error) {
      let errorMessage = "Failed to list your Digimon. Please try again.";
      
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        errorMessage = typeof message === 'string' ? message : errorMessage;
        
        // If user rejected transaction, redirect to My Digimons page
        if (errorMessage.includes("user rejected")) {
          // Close all existing toasts before showing cancellation toast
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
        
        // Handle other specific errors
        if (errorMessage.includes("insufficient funds")) {
          errorMessage = "You don't have enough ETH to pay the listing fee";
        } else if (errorMessage.includes("execution reverted")) {
          errorMessage = "Transaction failed. This could be due to an interrupted previous transaction.";
          setHasListingError(true);
          setLastError(errorMessage);
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
    } finally {
      setIsListing(false);
    }
  };

  const handleGoBack = () => {
    router.push('/my-listings');
  };

  const handleGoToMarketplace = () => {
    router.push('/marketplace');
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
              {/* Stepper component in a compact card */}
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
              
              {digimon && (
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
                    
                    {digimon.types?.length > 0 && (
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
              )}
              
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
                    <VStack spacing={4} align="stretch">
                      <Text fontSize="md" color="gray.600">
                        Before listing your Digimon, you need to authorize the marketplace to transfer it when sold.
                      </Text>
                      <Button 
                        colorScheme="blue" 
                        onClick={handleApproveForListing}
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
                  ) : activeStep === 1 ? (
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
                            onClick={resetListingForm}
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
                        onClick={handleList} 
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
                  ) : (
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
                          onClick={handleGoBack}
                          size="md"
                        >
                          Back to My Digimons
                        </Button>
                        <Button 
                          colorScheme="blue" 
                          onClick={handleGoToMarketplace}
                          size="md"
                        >
                          Go to Marketplace
                        </Button>
                      </HStack>
                    </VStack>
                  )}
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Container>
      
      {/* Error reset dialog */}
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
              <Button ref={cancelRef} onClick={onClose}>
                Just Reset Form
              </Button>
              <Button colorScheme="blue" onClick={handleResetProcess} ml={3}>
                Full Reset
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
