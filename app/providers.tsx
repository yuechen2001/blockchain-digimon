'use client';

import { SessionProvider } from 'next-auth/react';
import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ChakraProvider } from '@chakra-ui/react';
import { theme as defaultTheme } from '@chakra-ui/theme';

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

const queryClient = new QueryClient();

const theme = extendTheme({
  // Add your theme customizations here
}, defaultTheme);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ChakraProvider theme={theme}>
            {children}
          </ChakraProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
