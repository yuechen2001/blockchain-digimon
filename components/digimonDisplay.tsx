"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Box, Heading, Text, VStack, HStack, Badge, Divider, Button, useToast, Wrap, WrapItem, useColorModeValue } from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../context/Web3Context';
import Digimon from '../shared/models/Digimon';
import { IoWalletOutline, IoTimeOutline, IoPricetagOutline } from 'react-icons/io5';
import { FaSpinner } from 'react-icons/fa';
import TimeRemaining from './TimeRemaining';
import { useRouter } from 'next/navigation';

export interface DigimonDisplayProps {
  digimon: Digimon | null;
  tokenId?: string;
  isListed?: boolean;
  listingPrice?: string;
  isOwner?: boolean;
  seller?: string;
  expiresAt?: number;
  onPurchaseComplete?: () => void;
}

/**
 * DigimonDisplay component that renders the appropriate UI based on the digimon ownership and listing status
 */
function DigimonDisplay(props: DigimonDisplayProps) {
  const { digimon, tokenId, isListed, listingPrice, isOwner, seller, expiresAt, onPurchaseComplete } = props;
  const [mounted, setMounted] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const { marketplaceContract, account } = useWeb3Context();
  const toast = useToast();
  const router = useRouter();

  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');
  const accentBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    setMounted(true);
  }, []);

  // If digimon is null, return early with a placeholder
  if (digimon == null) {
    return (
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        overflow="hidden" 
        p={6} 
        bgColor="white" 
        boxShadow="md"
        width="100%"
      >
        <Text>No Digimon data available</Text>
      </Box>
    );
  }

  // Ensure description is properly displayed or show a placeholder
  const getDescription = () => {
    const englishDescription = digimon?.descriptions?.find(desc => desc.language === 'en_us');
    return englishDescription ? englishDescription.description : 'No English Description available';
  };

  // Format the price for display, ensuring it has appropriate precision
  const getFormattedPrice = () => {
    if (!listingPrice) return '0';
    
    // If the price has lots of decimal places, limit to 4 decimal places for better display
    const price = parseFloat(listingPrice);
    return price.toFixed(price < 0.01 ? 4 : 2);
  };

  // Handle buying a Digimon
const handleBuy = useCallback(async () => {
  if (!marketplaceContract || !account) {
    toast.closeAll();
    toast({
      title: 'Wallet Error',
      description: 'Please connect your wallet',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    return;
  }

  if (!tokenId || !listingPrice) {
    toast.closeAll();
    toast({
      title: 'Data Error',
      description: 'Token ID or listing price is missing',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    return;
  }
  
  setIsBuying(true);
  
  try {
    // listingPrice is already in ETH format, so we need to parse it back to Wei
    let priceInWei = ethers.parseEther(listingPrice);
    
    // Create loading toast and store its ID
    toast.closeAll();
    const loadingToastId = toast({
      title: 'Processing Purchase',
      description: 'Please confirm the transaction in your wallet...',
      status: 'loading',
      duration: null,
      isClosable: true,
    });
    
    // Check token has listing
    try {
      const [tokenListing, hasListing] = await marketplaceContract.getTokenListing(tokenId);
      priceInWei = tokenListing[3];
      
      if (!hasListing) {
        toast.close(loadingToastId);
        toast({
          title: 'Listing Error',
          description: 'This token doesn\'t have an active listing',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsBuying(false);
        return;
      }
      
      // Extract useful info from listing
      if (hasListing) {
        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (Number(tokenListing[6]) < now) {
          toast.close(loadingToastId);
          toast({
            title: 'Listing Expired',
            description: 'This listing has expired and is no longer available',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
          setIsBuying(false);
          return;
        }
      }
    } catch (listingError) {
      console.error('Error checking listing:', listingError);
      toast.close(loadingToastId);
      toast({
        title: 'Listing Check Failed',
        description: 'Failed to verify the listing status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsBuying(false);
      return;
    }
    
    // Execute the purchase
    const tx = await marketplaceContract.buyDigimon(tokenId, { value: priceInWei });
    
    // Update toast to show waiting for confirmation
    toast.close(loadingToastId);
    const confirmToastId = toast({
      title: 'Transaction Submitted',
      description: 'Waiting for blockchain confirmation...',
      status: 'info',
      duration: null,
      isClosable: true,
    });
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    // Close confirmation toast
    toast.close(confirmToastId);
    
    // Show success toast
    toast({
      title: 'Purchase Successful',
      description: 'You are now the proud owner of this Digimon!',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    // Call the callback if provided
    if (onPurchaseComplete) {
      onPurchaseComplete();
    }
  } catch (error) {
    console.error('Error buying digimon:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to complete the purchase';
    
    if (error instanceof Error) {
      if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds in your wallet to complete this purchase';
      }
    }
    
    toast.closeAll();
    toast({
      title: 'Purchase Failed',
      description: errorMessage,
      status: 'error',
      duration: 7000,
      isClosable: true,
    });
  } finally {
    setIsBuying(false);
  }
}, [marketplaceContract, account, tokenId, listingPrice, toast, onPurchaseComplete]);

  // Navigate to the listing page
  const handleNavigateToListing = () => {
    if (!tokenId) {
      toast({
        title: 'Error',
        description: 'Token ID is missing',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    router.push(`/list-digimon/${tokenId}`);
  };

  // Static digimon data
  const formattedPrice = getFormattedPrice();
  const formattedDescription = getDescription();

  // Render the Digimon display with the appropriate action sections based on ownership and listing status
  return (
    <Box
      p={{ base: 4, md: 6 }}
      bgColor={cardBg}
      borderWidth="1px"
      borderRadius="lg"
      borderColor="gray.200"
      boxShadow="lg"
      w="full"
      maxW="2xl"
      mx="auto"
      transition="all 0.3s"
      _hover={{ transform: mounted ? 'translateY(-5px)' : undefined, boxShadow: mounted ? '2xl' : undefined }}
      position="relative"
      overflow="hidden"
      height="auto"
      display="flex"
      flexDirection="column"
    >
      {/* Background gradient */}
      <Box 
        position="absolute" 
        top={0} 
        left={0} 
        right={0} 
        height="120px" 
        bgGradient="linear(to-b, blue.50, transparent)" 
        opacity={0.7} 
        zIndex={0}
      />
      
      {isOwner && mounted && (
        <Badge
          position="absolute"
          top={4}
          right={4}
          colorScheme="green"
          fontSize="sm"
          px={3}
          py={1}
          borderRadius="full"
          boxShadow="sm"
          zIndex={2}
        >
          You Own This
        </Badge>
      )}
      
      <VStack gap={{ base: 4, md: 6 }} align="stretch" position="relative" zIndex={1}>
        {/* Header Section */}
        <HStack justify="space-between" align="center" flexWrap={{ base: "wrap", md: "nowrap" }}>
          <Box 
            overflowX="auto" 
            css={{
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
            flex="1"
          >
            <Heading 
              as="h2" 
              size={{ base: "lg", md: "xl" }} 
              fontWeight="bold" 
              color="gray.800" 
              letterSpacing="tight"
              mb={{ base: 2, md: 0 }}
              whiteSpace="nowrap"
            >
              {digimon.name}
            </Heading>
          </Box>
          <HStack gap={2} flexWrap="wrap" justifyContent={{ base: "flex-start", md: "flex-end" }} width={{ base: "100%", md: "auto" }}>
            {digimon.levels?.map((level, index) => (
              <Badge 
                key={index} 
                colorScheme="purple" 
                fontSize="sm" 
                px={3} 
                py={1}
                borderRadius="full"
                textTransform="capitalize"
                boxShadow="sm"
              >
                {level.level}
              </Badge>
            ))}
          </HStack>
        </HStack>

        {/* Image Section */}
        <Box 
          position="relative" 
          width="100%" 
          height={{ base: "300px", md: "400px" }} 
          borderRadius="xl" 
          overflow="hidden"
          boxShadow="md"
          transform={mounted ? "scale(1)" : "scale(0.98)"}
          transition="transform 0.3s ease-in-out"
          _hover={{ transform: mounted ? "scale(1.02)" : undefined }}
        >
          <Image
            src={digimon.images?.[0]?.href || '/placeholder.png'}
            alt={digimon.name || 'Digimon'}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
            priority
          />
        </Box>

        {/* Attributes Section */}
        <HStack 
          spacing={4} 
          p={3} 
          borderRadius="lg" 
          bgColor={accentBg} 
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          minH="60px"
          height="60px"
          overflow="hidden"
        >
          {(!digimon.attributes || digimon.attributes.length === 0) ? (
            <Box 
              display="flex"
              alignItems="center"
              justifyContent="center"
              borderWidth="1px"
              borderStyle="dashed"
              borderRadius="md"
              borderColor="blue.200"
              p={2}
              width="100%"
              height="36px"
            >
              <Text color="gray.500" fontStyle="italic">No attributes available for this Digimon</Text>
            </Box>
          ) : (
            <Box width="100%" display="flex" flexWrap="wrap" justifyContent="center" gap={2}>
              {digimon.attributes.map((attr, index) => (
                <Badge 
                  key={index} 
                  colorScheme="teal" 
                  variant="solid" 
                  fontSize="sm"
                  px={3} 
                  py={1}
                  borderRadius="full"
                  height="24px"
                  display="flex"
                  alignItems="center"
                >
                  {attr.attribute}
                </Badge>
              ))}
            </Box>
          )}
        </HStack>

        {/* Fields Section */}
        <Box 
          mt={2} 
          p={4} 
          borderRadius="md" 
          bgColor={sectionBg} 
          boxShadow="inner"
        >
          <Heading as="h3" size="md" mb={3} color="gray.700">
            Fields
          </Heading>
          <Box 
            height="120px"
            overflowY="auto"
            overflowX="auto" 
            css={{
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
                background: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '24px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.15)',
                borderRadius: '24px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgba(0, 0, 0, 0.25)',
              },
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0.05)',
            }}
            pb={2}
          >
            {(!digimon.fields || digimon.fields.length === 0) ? (
              <Box 
                height="100px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderWidth="1px"
                borderStyle="dashed"
                borderRadius="md"
                borderColor="gray.300"
                p={4}
              >
                <Text color="gray.500" fontStyle="italic">No fields available for this Digimon</Text>
              </Box>
            ) : (
              <Wrap spacing={3} justify="flex-start" align="flex-start">
                {digimon.fields.map((field) => (
                  <WrapItem key={field.id}>
                    <Box 
                      minW="100px"
                      h="100px"
                      p={3}
                      borderWidth="1px" 
                      borderRadius="md" 
                      bgColor={cardBg}
                      boxShadow="sm"
                      transition="all 0.2s"
                      _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {field.image && (
                        <Box position="relative" width="48px" height="48px" mb={1}>
                          <Image
                            src={field.image}
                            alt={field.field}
                            fill
                            sizes="48px"
                            style={{ objectFit: 'contain' }}
                          />
                        </Box>
                      )}
                      <Text fontSize="xs" fontWeight="semibold" textAlign="center">
                        {field.field}
                      </Text>
                    </Box>
                  </WrapItem>
                ))}
              </Wrap>
            )}
          </Box>
        </Box>

        {/* Info Sections */}
        <Box
          bgColor={sectionBg}
          borderRadius="md"
          p={4}
          boxShadow="inner"
        >
          {/* Types Section */}
          {digimon.types?.length > 0 && (
            <HStack mb={3} flexWrap="wrap">
              {digimon.types.map((type, index) => (
                <Badge 
                  key={index} 
                  colorScheme="blue" 
                  variant="solid" 
                  px={2} 
                  py={1}
                  borderRadius="md"
                  boxShadow="sm"
                  mb={1}
                >
                  {type.type}
                </Badge>
              ))}
            </HStack>
          )}

          {/* Description */}
          <Heading as="h3" size="md" mb={2} color="gray.700">
            Description
          </Heading>
          <Box 
            height="120px"
            overflowY="auto"
            borderRadius="sm" 
            css={{
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
                background: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '24px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.15)',
                borderRadius: '24px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgba(0, 0, 0, 0.25)',
              },
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0.05)',
            }}
            pb={2}
          >
            <Text fontSize="md" color="gray.600" lineHeight="taller">
              {formattedDescription}
            </Text>
          </Box>
        </Box>

        <Divider />

        {/* Action section - Fixed height area for buttons */}
        <Box mt={4} minH="120px" display="flex" flexDirection="column" justifyContent="flex-end">
          {/* Conditional UI based on ownership and listing status */}
          {mounted && (
            <>
              {/* Listing Information Section */}
              {isListed && (
                <VStack 
                  align="stretch" 
                  spacing={4} 
                  p={4}
                  borderRadius="md"
                  bgColor={accentBg}
                  boxShadow="inner"
                  mb={isOwner ? 0 : 4} /* Add bottom margin if not showing buy button */
                >
                  <HStack spacing={4}>
                    <Box color="blue.500">
                      <IoPricetagOutline size={24} />
                    </Box>
                    <Text fontWeight="bold">Listed Price:</Text>
                    <Text fontSize="lg" fontWeight="extrabold" color="blue.600">
                      {formattedPrice} ETH
                    </Text>
                  </HStack>

                  {seller && !isOwner && (
                    <HStack spacing={4}>
                      <Box color="blue.500">
                        <IoWalletOutline size={24} />
                      </Box>
                      <Text fontWeight="bold">Seller:</Text>
                      <Text fontFamily="mono" fontSize="sm" bgColor="gray.100" p={1} borderRadius="md">
                        {`${seller.substring(0, 6)}...${seller.substring(seller.length - 4)}`}
                      </Text>
                    </HStack>
                  )}

                  {expiresAt && (
                    <HStack spacing={4}>
                      <Box color="blue.500">
                        <IoTimeOutline size={24} />
                      </Box>
                      <Text fontWeight="bold">Time Remaining:</Text>
                      <TimeRemaining expiresAt={expiresAt} />
                    </HStack>
                  )}
                </VStack>
              )}

              {/* List button (only for owners of non-listed Digimons) */}
              {isOwner && !isListed && (
                <Button 
                  onClick={handleNavigateToListing} 
                  colorScheme="blue"
                  leftIcon={<IoPricetagOutline />}
                  size="lg"
                  width="full"
                  borderRadius="md"
                  boxShadow="md"
                  _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                  transition="all 0.2s"
                >
                  List This Digimon For Sale
                </Button>
              )}

              {/* Buy button (only for non-owners of listed Digimons) */}
              {isListed && !isOwner && (
                <Button 
                  onClick={handleBuy} 
                  colorScheme="green" 
                  size="lg"
                  width="full"
                  leftIcon={isBuying ? < FaSpinner /> : <IoWalletOutline />}
                  borderRadius="md"
                  boxShadow="md"
                  _hover={{ 
                    transform: "translateY(-2px)", 
                    boxShadow: "lg",
                    bg: "green.500"
                  }}
                  _active={{
                    transform: "translateY(0)",
                    boxShadow: "sm"
                  }}
                  transition="all 0.2s"
                  isLoading={isBuying}
                  loadingText="Buying..."
                  isDisabled={isBuying}
                >
                  Buy for {formattedPrice} ETH
                </Button>
              )}
            </>
          )}
        </Box>
      </VStack>
    </Box>
  );
}

export default DigimonDisplay;