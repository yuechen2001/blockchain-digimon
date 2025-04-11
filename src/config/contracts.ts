/**
 * Contract configuration using environment variables
 * This replaces the addresses.json approach with a more deployment-friendly solution
 */

export const contractAddresses = {
  DigimonToken: process.env.NEXT_PUBLIC_DIGIMON_TOKEN_ADDRESS || "",
  DigimonMarketplace: process.env.NEXT_PUBLIC_DIGIMON_MARKETPLACE_ADDRESS || "",
  networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || "localhost"
};

// Log a warning if addresses are not set in production
if (process.env.DEPLOY_ENV === 'production' && 
    (!contractAddresses.DigimonToken || !contractAddresses.DigimonMarketplace)) {
  console.warn(
    'Warning: Contract addresses not properly set in environment variables. ' +
    'Make sure to set NEXT_PUBLIC_DIGIMON_TOKEN_ADDRESS and ' +
    'NEXT_PUBLIC_DIGIMON_MARKETPLACE_ADDRESS in your Vercel environment variables.'
  );
}

export default contractAddresses;
