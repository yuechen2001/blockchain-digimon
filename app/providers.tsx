'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '../config/wagmi';
import { Web3Provider } from '../context/Web3Context';
import { AuthProvider } from '../context/AuthContext';
import { SessionProvider } from 'next-auth/react';
import theme from './theme';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ChakraProvider theme={theme}>
            <AuthProvider>
              <Web3Provider>
                {children}
              </Web3Provider>
            </AuthProvider>
          </ChakraProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
