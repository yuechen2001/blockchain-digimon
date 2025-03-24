import { useQuery } from '@tanstack/react-query';

/**
 * Fetches Digimon data from IPFS, trying multiple gateways for reliability
 * @param hash IPFS hash (without the ipfs:// prefix)
 * @returns The JSON data of the Digimon
 */
export const fetchDigimonFromIPFS = async (hash: string) => {
  const IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://dweb.link/ipfs/',
    'https://ipfs.fleek.co/ipfs/'
  ];

  try {
    const response = await fetch(`/api/ipfs/${hash}`);
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.error('[IPFS] Error with local proxy:', error);
  }

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${hash}`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.error(`[IPFS] Error with gateway ${gateway}:`, error);
    }
  }

  throw new Error('Failed to fetch from all IPFS gateways');
};

/**
 * Custom hook for fetching Digimon data from IPFS with caching
 * Uses React Query for automatic caching, refetching, and error handling
 */
export const useDigimonData = (ipfsHash: string) => {
  const result = useQuery({
    queryKey: ['digimon', ipfsHash],
    queryFn: () => fetchDigimonFromIPFS(ipfsHash),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !!ipfsHash,
  });

  return {
    digimonData: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch
  };
};
