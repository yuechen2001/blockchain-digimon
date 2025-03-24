import React from 'react';
import { Spinner, Text, VStack } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
}

/**
 * A reusable loading spinner component with optional message
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <VStack spacing={4} w="100%" justifyContent="center" py={10}>
      <Spinner 
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="blue.500"
        size="xl"
      />
      <Text fontSize="lg" fontWeight="medium" textAlign="center">
        {message}
      </Text>
    </VStack>
  );
};

export default LoadingSpinner;
