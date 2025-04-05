"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Box, Heading, Text, VStack, HStack, Badge, Divider, Button, useToast, Wrap, WrapItem, useColorModeValue } from '@chakra-ui/react';
import Digimon from '../shared/models/Digimon';
import { IoWalletOutline, IoTimeOutline, IoPricetagOutline } from 'react-icons/io5';
import { FaSpinner } from 'react-icons/fa';
import TimeRemaining from './TimeRemaining';
import { useRouter } from 'next/navigation';
import { useDigimonPurchase } from '../hooks/useDigimonPurchase';

interface DigimonDisplayProps {
  digimon: Digimon | null;
  tokenId: string;
  isListed: boolean;
  listingPrice: string;
  isOwner: boolean;
  seller: string;
  expiresAt: number;
  onPurchaseComplete: () => void;
}

/**
 * DigimonDisplay component that renders the appropriate UI based on the digimon ownership and listing status
 */
function DigimonDisplay(props: DigimonDisplayProps) {
  const { digimon, tokenId, isListed, listingPrice, isOwner, seller, expiresAt, onPurchaseComplete } = props;
  const [mounted, setMounted] = useState(false);
  const toast = useToast();
  const router = useRouter();

  // Use our custom hooks with the onPurchaseComplete callback
  const { purchaseDigimon, isBuying } = useDigimonPurchase(onPurchaseComplete);
  
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

  // Format the price for display, ensuring it has appropriate precision
  const getFormattedPrice = () => {
    if (!listingPrice) return '0';
    
    // If the price has lots of decimal places, limit to 4 decimal places for better display
    const price = parseFloat(listingPrice);
    return price.toFixed(price < 0.01 ? 4 : 2);
  };

  // Handle buying a Digimon
  const handleBuy = useCallback(async () => {
    await purchaseDigimon(tokenId, listingPrice);
  }, [purchaseDigimon, tokenId, listingPrice]);

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

  // Format price for UI
  const formattedPrice = getFormattedPrice();

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
      
      {isOwner && mounted && <OwnerBadge />}

      {mounted && <DigimonDetails digimon={digimon} accentBg={accentBg} sectionBg={sectionBg} cardBg={cardBg} />}
      
      <VStack gap={{ base: 4, md: 6 }} align="stretch" position="relative" zIndex={1}>
        
        <Divider />

        {/* Show listing information if token is listed */}
        {isListed && mounted && (
          <ListingInfo 
            isListed={isListed} 
            isOwner={isOwner} 
            formattedPrice={formattedPrice} 
            seller={seller} 
            expiresAt={expiresAt} 
            accentBg={accentBg} 
          />
        )}

        {/* Action section - Fixed height area for buttons */}
        <Box mt={4} minH="120px" display="flex" flexDirection="column" justifyContent="flex-end">
          {/* Conditional UI based on ownership and listing status */}
          {mounted && (
            <PurchaseButton 
              isListed={isListed} 
              isOwner={isOwner} 
              formattedPrice={formattedPrice} 
              handleBuy={handleBuy} 
              isBuying={isBuying} 
            />
          )}
          {mounted && (
            <ListingButton 
              isOwner={isOwner} 
              isListed={isListed} 
              handleNavigateToListing={handleNavigateToListing} 
            />
          )}
        </Box>
      </VStack>
    </Box>
  );
}

function OwnerBadge() {
  return (
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
      );
}

function DigimonDetails(props: {digimon: Digimon, accentBg: string, sectionBg: string, cardBg: string}) {
  const { digimon, accentBg, sectionBg, cardBg } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure description is properly displayed or show a placeholder
  const getDescription = () => {
    const englishDescription = digimon?.descriptions?.find(desc => desc.language === 'en_us');
    return englishDescription ? englishDescription.description : 'No English Description available';
  };

  const formattedDescription = getDescription();
  
  return (
    <>
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
    mt={3} 
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
                w="100px"
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

  {/* Divider */}
  <Divider my={4} />

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
  </>
  );
}

function ListingInfo(props: {isListed: boolean, isOwner: boolean, formattedPrice: string, seller: string, expiresAt: number, accentBg: string}) {
  const {isListed, isOwner, formattedPrice, seller, expiresAt, accentBg} = props;
  return (
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

          {expiresAt > 0 && (
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
    </>
  )
}

function PurchaseButton(props: {isListed: boolean, isOwner: boolean, formattedPrice: string, handleBuy: () => void, isBuying: boolean}) {
  const {isListed, isOwner, formattedPrice, handleBuy, isBuying} = props;
  {/* Buy button (only for non-owners of listed Digimons) */}
  if (isListed && !isOwner) {
    return (
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
  
  return null;
}

function ListingButton(props: {isOwner: boolean, isListed: boolean, handleNavigateToListing: () => void}) {
  const {isOwner, isListed, handleNavigateToListing} = props;
  {/* List button (only for owners of non-listed Digimons) */}
  if (isOwner && !isListed) {
    return (
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
  
  return null;
}

export default DigimonDisplay;