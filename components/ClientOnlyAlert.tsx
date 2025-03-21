'use client';

import React, { useEffect, useState } from 'react';
import { Alert, AlertIcon, AlertTitle, AlertDescription, AlertProps, Box } from '@chakra-ui/react';

interface ClientOnlyAlertProps extends Omit<AlertProps, 'children'> {
  title?: string;
  description?: string;
}

/**
 * A client-only Alert component that prevents hydration mismatch errors by
 * only rendering the Alert component after the client has hydrated.
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

  // After hydration on the client, render the actual Alert component
  return (
    <Alert status={status} {...props}>
      <AlertIcon />
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
    </Alert>
  );
};

export default ClientOnlyAlert;
