'use client';

import { useConnect, useDisconnect, useAccount, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { signIn, getCsrfToken } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Box, Heading, Button } from '@chakra-ui/react';

export default function Home() {
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      
      if (isConnected) {
        await disconnect();
      }

      await connect({ connector: injected() });
      if (!address) throw new Error('No account found');

      const message = {
        address: address,
        chain: 1,
        nonce: await getCsrfToken(),
        uri: window.location.origin,
        version: '1',
        statement: 'Sign in with your wallet to access the Digimon application.',
      };

      const signature = await signMessageAsync({
        message: JSON.stringify(message),
      });

      const response = await signIn('credentials', {
        message: JSON.stringify(message),
        signature,
        redirect: false,
      });

      if (response?.ok) {
        router.push('/home');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.100"
    >
      <Box
        bg="white"
        p={8}
        rounded="lg"
        shadow="md"
        w="96"
      >
        <Heading
          as="h1"
          size="lg"
          mb={6}
          textAlign="center"
        >
          Login to Digimon
        </Heading>
        <Button
          onClick={handleLogin}
          isLoading={isLoading}
          colorScheme="blue"
          w="full"
          size="lg"
        >
          {isLoading ? 'Connecting...' : 'Connect with MetaMask'}
        </Button>
      </Box>
    </Box>
  );
}
