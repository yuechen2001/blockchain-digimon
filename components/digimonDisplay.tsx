"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Box, Button, Heading, Text, VStack, HStack, Stack, Input, Badge, Divider, useToast } from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../context/Web3Context';
import Digimon from '../shared/models/Digimon';

interface DigimonDisplayProps {
  digimon: Digimon | null;
  tokenId?: number;
  isListed?: boolean;
  listingPrice?: string;
}

function DigimonDisplay({ digimon, tokenId, isListed, listingPrice }: DigimonDisplayProps) {
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('7');
  const [mounted, setMounted] = useState(false);
  const { contract, account, isConnected } = useWeb3Context();
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || digimon == null) {
    return null;
  }

  const englishDescription = digimon.descriptions?.find(description => description.language === 'en_us');
  const description = englishDescription ? englishDescription.description : 'No English Description available';

  const handleMint = async () => {
    if (!contract || !account) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const mintingFee = ethers.parseEther('0.05');
      const tx = await contract.mintDigimon(digimon.name, { value: mintingFee });
      toast({
        title: 'Minting Digimon',
        description: 'Please wait while your Digimon is being minted...',
        status: 'loading',
        duration: null,
        isClosable: false,
      });
      await tx.wait();
      toast({
        title: 'Success',
        description: 'Successfully minted your Digimon!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Minting Failed',
        description: error instanceof Error ? error.message : 'Failed to mint Digimon',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleList = async () => {
    if (!contract || !account || !tokenId) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const priceInWei = ethers.parseEther(price);
      const durationInDays = parseInt(duration) * 24 * 60 * 60;
      const tx = await contract.listDigimon(tokenId, priceInWei, durationInDays);
      toast({
        title: 'Listing Digimon',
        description: 'Please wait while your Digimon is being listed...',
        status: 'loading',
        duration: null,
        isClosable: false,
      });
      await tx.wait();
      toast({
        title: 'Success',
        description: 'Successfully listed your Digimon!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Listing Failed',
        description: error instanceof Error ? error.message : 'Failed to list Digimon',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleBuy = async () => {
    if (!contract || !account || !tokenId || !listingPrice) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const tx = await contract.buyDigimon(tokenId, { value: ethers.parseEther(listingPrice) });
      toast({
        title: 'Buying Digimon',
        description: 'Please wait while your Digimon is being purchased...',
        status: 'loading',
        duration: null,
        isClosable: false,
      });
      await tx.wait();
      toast({
        title: 'Success',
        description: 'Successfully purchased Digimon!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Failed to buy Digimon',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      p={6}
      bg="chakra-body-bg"
      borderWidth="1px"
      borderRadius="lg"
      borderColor="chakra-border-color"
      boxShadow="lg"
      w="full"
      maxW="2xl"
      mx="auto"
      transition="all 0.3s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: '2xl' }}
    >
      <VStack gap={6} align="stretch">
        {/* Header Section */}
        <HStack justify="space-between" align="center">
          <Heading as="h2" size="xl" fontWeight="bold" color="chakra-text">
            {digimon.name}
          </Heading>
          <HStack gap={2}>
            {digimon.levels.map((level, index) => (
              <Badge 
                key={index} 
                colorScheme="purple" 
                fontSize="sm" 
                px={3} 
                py={1} 
                borderRadius="full"
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
          height="400px" 
          borderRadius="xl" 
          overflow="hidden"
          boxShadow="md"
          bg="chakra-subtle-bg"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Image
            src={digimon.images[0].href}
            alt={digimon.name}
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </Box>

        {/* Action Buttons Section */}
        {isConnected && (
          <VStack gap={4}>
            {!tokenId && (
              <Button 
                onClick={handleMint} 
                colorScheme="teal" 
                size="lg" 
                width="full"
                fontWeight="bold"
                _hover={{ transform: 'translateY(-2px)' }}
              >
                Mint Digimon (0.05 ETH)
              </Button>
            )}

            {tokenId && !isListed && (
              <VStack width="full" gap={4} p={4} borderRadius="xl" borderWidth="1px">
                <Input
                  placeholder="Price in ETH"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  size="lg"
                />
                <Input
                  placeholder="Duration in days"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  type="number"
                  size="lg"
                />
                <Button 
                  onClick={handleList} 
                  colorScheme="purple" 
                  width="full"
                  size="lg"
                >
                  List for Sale
                </Button>
              </VStack>
            )}

            {isListed && (
              <Button 
                onClick={handleBuy} 
                colorScheme="green" 
                width="full"
                size="lg"
                _hover={{ transform: 'translateY(-2px)' }}
              >
                Buy for {listingPrice} ETH
              </Button>
            )}
          </VStack>
        )}

        <Divider />

        {/* Details Section */}
        <Stack gap={4}>
          {/* Types Section */}
          {digimon.types && digimon.types.length > 0 && (
            <Box>
              <Heading as="h3" size="md" mb={2} color="chakra-text">
                Types
              </Heading>
              <HStack gap={2}>
                {digimon.types.map((type, index) => (
                  <Badge 
                    key={index} 
                    colorScheme="blue" 
                    fontSize="sm"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {type?.type || 'Unknown Type'}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {/* Attributes Section */}
          {digimon.attributes && digimon.attributes.length > 0 && (
            <Box>
              <Heading as="h3" size="md" mb={2} color="chakra-text">
                Attributes
              </Heading>
              <HStack gap={2}>
                {digimon.attributes.map((attr, index) => (
                  <Badge 
                    key={index} 
                    colorScheme="orange" 
                    fontSize="sm"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {attr?.attribute || 'Unknown Attribute'}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {/* Fields Section */}
          {digimon.fields && digimon.fields.length > 0 && (
            <Box>
              <Heading as="h3" size="md" mb={2} color="chakra-text">
                Fields
              </Heading>
              <HStack gap={2} flexWrap="wrap">
                {digimon.fields.map((field, index) => (
                  <Badge 
                    key={index} 
                    colorScheme="green" 
                    fontSize="sm"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {field?.field || 'Unknown Field'}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {/* Description Section */}
          <Box>
            <Heading as="h3" size="md" mb={2} color="chakra-text">
              Description
            </Heading>
            <Text color="chakra-text-subtle">
              {description}
            </Text>
          </Box>
        </Stack>
      </VStack>
    </Box>
  );
}

export default DigimonDisplay;
