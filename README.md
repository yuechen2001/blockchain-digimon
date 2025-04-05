This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Blockchain Components

This project includes Ethereum smart contracts for a Digimon NFT marketplace built with Hardhat.

### Local Development Setup

To set up the local blockchain environment and deploy the contracts:

```bash
# From the project root
bash scripts/local_project_setup.sh
```

This script will:
1. Start a local Hardhat node
2. Deploy the DigimonToken and DigimonMarketplace contracts
3. Initialize the contracts with test data

### Deployment System

The project includes an infrastructure-as-code deployment system that supports multiple environments:

```bash
# Local development
npx hardhat run scripts/deploy.cjs --network localhost

# Test network (Sepolia)
DEPLOY_ENV=test npx hardhat run scripts/deploy.cjs --network sepolia

# Production deployment (Mainnet)
DEPLOY_ENV=production npx hardhat run scripts/deploy.cjs --network mainnet
```

Deployment information is saved to:
- `deployments/{environment}.json` - Complete deployment records
- `src/config/addresses.json` - Contract addresses for frontend use
- `src/abis/` - Contract ABIs for frontend integration

Configuration for different environments is managed in `deploy-config.cjs`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
