import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription, AlertProps, Box, Flex } from '@chakra-ui/react';
import { 
  IoInformationCircleOutline, 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline 
} from 'react-icons/io5';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ClientOnlyAlertProps extends Omit<AlertProps, 'children'> {
  title?: string;
  description?: string;
}

/**
 * A client-only Alert component that prevents hydration mismatch errors by
 * only rendering the Alert component after the client has hydrated.
 * Uses React Icons instead of Chakra UI icons for consistent styling.
 */
const ClientOnlyAlert: React.FC<ClientOnlyAlertProps> = ({
  title,
  description,
  status = 'info',
  ...props
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get the appropriate icon based on alert status
  const getAlertIcon = () => {
    const iconSize = 20;
    
    switch (status) {
      case 'success':
        return <IoCheckmarkCircleOutline size={iconSize} />;
      case 'warning':
        return <FaExclamationTriangle size={iconSize} />;
      case 'error':
        return <IoAlertCircleOutline size={iconSize} />;
      case 'info':
      default:
        return <IoInformationCircleOutline size={iconSize} />;
    }
  };

  // During SSR or before hydration, render a placeholder with similar dimensions
  // but without the Chakra Alert component
  if (!isMounted) {
    return (
      <Box
        p={4}
        borderWidth="1px"
        borderRadius="md"
        width="100%"
      >
        {title && <Box fontWeight="bold">{title}</Box>}
        {description && <Box mt={2}>{description}</Box>}
      </Box>
    );
  }

  // After hydration on the client, render the actual Alert component with React icons
  return (
    <Alert status={status} {...props}>
      <Flex alignItems="center" mr={3} color={`${status}.500`}>
        {getAlertIcon()}
      </Flex>
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
    </Alert>
  );
};

export default ClientOnlyAlert;
