'use client';

import { SessionProvider } from 'next-auth/react';
import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ChakraProvider } from '@chakra-ui/react';

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ChakraProvider>
            {children}
          </ChakraProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
