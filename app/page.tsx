'use client';

import { useConnect, useDisconnect, useAccount, useSignMessage } from 'wagmi';
import { signIn, getCsrfToken } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Button, 
  Spinner, 
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  VStack,
  Center,
  useToast
} from '@chakra-ui/react';
import { SiweMessage } from 'siwe';

export default function Home() {
  // Hooks
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { connect, connectors } = useConnect({
    mutation: {
      onSuccess() {
        setIsConnecting(false);
        onClose();
      },
      onError() {
        setIsConnecting(false);
        onClose();
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to wallet',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  });
  const { disconnect } = useDisconnect();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // State
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async (connector: any) => {
    try {
      setIsConnecting(true);
      onOpen();
      if (!connector) {
        throw new Error('No connector available');
      }
      await connect({ connector });
    } catch (error) {
      setIsConnecting(false);
      onClose();
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSignIn = async () => {
    try {
      setIsSigning(true);
      onOpen();

      if (!address) {
        throw new Error('Wallet not connected');
      }

      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to Digimon Marketplace',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce: csrfToken,
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      const response = await signIn('credentials', {
        message: JSON.stringify(message),
        redirect: false,
        signature,
        callbackUrl: '/home',
      });

      if (!response?.ok) {
        throw new Error('Sign in failed');
      }

      router.push('/home');
    } catch (error) {
      toast({
        title: 'Authentication Error',
        description: error instanceof Error ? error.message : 'Failed to sign in',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSigning(false);
      onClose();
    }
  };

  if (!mounted) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.100"
      >
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.100"
      position="relative"
    >
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        isCentered 
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay
          bg='blackAlpha.800'
          backdropFilter='blur(10px)'
        />
        <ModalContent 
          bg="white" 
          p={8}
          boxShadow="xl"
          borderRadius="xl"
        >
          <ModalBody>
            <Center>
              <VStack spacing={6}>
                <Spinner 
                  size="xl" 
                  color="blue.500" 
                  thickness="4px"
                  speed="0.65s"
                  emptyColor="gray.200"
                />
                <Text 
                  fontSize="lg"
                  fontWeight="semibold"
                  color="gray.700"
                >
                  {isConnecting ? 'Connecting to MetaMask...' : 'Signing Message...'}
                </Text>
              </VStack>
            </Center>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Box
        bg="white"
        p={8}
        rounded="lg"
        shadow="md"
        w="96"
        position="relative"
      >
        <Heading
          as="h1"
          size="lg"
          mb={6}
          textAlign="center"
        >
          Login to Digimon
        </Heading>
        
        {!isConnected ? (
          <Button
            onClick={() => handleConnect(connectors[0])}
            isLoading={isConnecting}
            loadingText="Connecting..."
            colorScheme="blue"
            w="full"
            size="lg"
            mb={4}
            disabled={isConnecting}
          >
            Connect MetaMask
          </Button>
        ) : (
          <Button
            onClick={handleSignIn}
            isLoading={isSigning}
            loadingText="Signing..."
            colorScheme="green"
            w="full"
            size="lg"
            mb={4}
            disabled={isSigning}
          >
            Sign Message to Login
          </Button>
        )}
        
        {isConnected && (
          <Button
            onClick={() => disconnect()}
            colorScheme="red"
            variant="outline"
            w="full"
            size="lg"
            disabled={isConnecting || isSigning}
          >
            Disconnect Wallet
          </Button>
        )}
      </Box>
    </Box>
  );
}
