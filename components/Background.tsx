'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import Image from 'next/image';

interface BackgroundProps {
  children: React.ReactNode;
}

const Background: React.FC<BackgroundProps> = ({ children }) => {
  return (
    <Box position="relative" minH="100vh" overflow="hidden">
      {/* Background Image */}
      <Box position="absolute" top={0} left={0} right={0} bottom={0} zIndex={0}>
        <Image
          src="/digimonbanner.jpg"
          alt="Digimon Banner"
          fill
          style={{ objectFit: 'cover' }}
          priority
          quality={100}
        />
      </Box>

      {/* Dark Overlay */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="blackAlpha.700"
        zIndex={1}
      />

      {/* Content */}
      <Box position="relative" zIndex={2}>{children}</Box>
    </Box>
  );
};

export default Background;
