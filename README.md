# Blockchain Digimon NFT Marketplace

A full-stack NFT marketplace application for Digimon digital collectibles, built with Next.js, Prisma, Supabase, and Ethereum smart contracts.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Smart Contracts](#smart-contracts)
- [Authentication](#authentication)
- [Database](#database)
- [Screenshots](#screenshots)
- [Contributing](#contributing)

## 🌟 Overview

Blockchain Digimon is a decentralized marketplace where users can mint, buy, sell, and trade Digimon NFTs. The application combines Web3 technologies with traditional web development to create a seamless user experience for digital collectible enthusiasts.

## ✨ Features

- **User Authentication**: Email/password and wallet-based authentication using NextAuth.js
- **NFT Minting**: Create new Digimon NFTs with metadata stored on IPFS
- **Marketplace**: Buy, sell, and trade Digimon NFTs with ETH
- **Wallet Integration**: Connect your Ethereum wallet (MetaMask, WalletConnect)
- **Profile Management**: View your collection and transaction history
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Web3 Integration**: viem, wagmi, ethers.js

### Backend
- **API Routes**: Next.js API routes
- **Authentication**: NextAuth.js
- **Database ORM**: Prisma
- **Database**: Supabase PostgreSQL / SQLite (development)
- **Caching**: Redis

### Blockchain
- **Development Framework**: Hardhat
- **Smart Contracts**: Solidity
- **Testing**: Hardhat, Chai
- **Networks**: Ethereum (Mainnet, Sepolia)
- **Storage**: IPFS via Pinata

## 🏗️ Architecture

The application follows a hybrid architecture:

1. **Frontend**: Server-side rendered React components with Next.js
2. **Backend API**: Next.js API routes for authentication and database operations
3. **Smart Contracts**: ERC-721 token contract and marketplace contract on Ethereum
4. **Database**: User data and wallet associations in PostgreSQL via Supabase
5. **Storage**: NFT metadata and images stored on IPFS

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or another Ethereum wallet

#### Database & Authentication
- [Supabase](https://supabase.com) account (for PostgreSQL database in production)
- [Redis](https://redis.com) account (for caching)

#### Blockchain Services
- [Moralis](https://moralis.io) account (for blockchain API access)
- [Etherscan](https://etherscan.io) API key (for contract verification)
- [CoinMarketCap](https://coinmarketcap.com/api/) API key (for price feeds)

#### Storage Services
- [Pinata](https://pinata.cloud) account (for IPFS storage of NFT metadata)

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/blockchain-digimon.git
cd blockchain-digimon
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your configuration values.

4. Start the development server:
```bash
npm run dev
```

5. Deploy local contracts:
```bash
# From another terminal
bash scripts/local_project_setup.sh
```

### Database Setup

The project uses Prisma with PostgreSQL (Supabase) for production and SQLite for development:

#### Development Configuration

For local development with SQLite:

1. Update your `schema.prisma` file:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("SQLITE_DATABASE_URL")
}
```

2. Make sure your `.env.local` has the SQLite connection string:
```
SQLITE_DATABASE_URL=file:./prisma.db
```

3. Push the schema and generate the client:
```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

#### Production Configuration

For production with Supabase PostgreSQL:

1. Update your `schema.prisma` file:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

2. Configure your environment variables for Supabase connection pooling:
```
DATABASE_URL=postgres://username:password@pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgres://username:password@aws-0-region.supabase.com:5432/postgres?sslmode=require
```

3. Deploy your schema to the production database:
```bash
npx prisma db push
```

> **Note**: The `directUrl` is required for Prisma migrations when using connection pooling with Supabase. The `DATABASE_URL` uses pgBouncer for connection pooling, while `DIRECT_URL` bypasses the connection pooler for operations that require a direct connection.

## 💼 Smart Contracts

The project includes two main smart contracts:

1. **DigimonToken.sol**: ERC-721 token contract for Digimon NFTs
2. **DigimonMarketplace.sol**: Marketplace contract for buying and selling NFTs

### Deployment

```bash
# Local development
npx hardhat run scripts/deploy.cjs --network localhost

# Test network (Sepolia)
DEPLOY_ENV=test npx hardhat run scripts/deploy.cjs --network sepolia

# Production deployment (Mainnet)
DEPLOY_ENV=production npx hardhat run scripts/deploy.cjs --network mainnet
```

### Contract Verification

Contracts are automatically verified on Etherscan when deployed to public networks.

## 🔐 Authentication

The application supports two authentication methods:

1. **Traditional**: Email/password using NextAuth.js
2. **Web3**: Wallet-based authentication using SIWE (Sign-In with Ethereum)

Authentication is managed through the `AuthContext` provider, which handles user sessions and wallet connections.

## 💾 Database

### Schema

The database schema includes:

- **User**: User accounts with email and password
- **Wallet**: Ethereum wallets linked to user accounts

### Connection Pooling

For Supabase PostgreSQL, connection pooling is configured with the following parameters:

```
DATABASE_URL=postgres://user:password@pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgres://user:password@aws-0-region.supabase.com:5432/postgres?sslmode=require
```

## 📸 Screenshots

### Marketplace
![Digimon Marketplace](docs/images/marketplace.png)
*Browse and purchase Digimon NFTs from the marketplace*

### Welcome Page
![Welcome Page](docs/images/welcome.png)
*The landing page welcomes users to the Digimon NFT Marketplace*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
