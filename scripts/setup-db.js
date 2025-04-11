import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance directly instead of importing
const prisma = new PrismaClient({
  log: ['query'],
});

async function main() {
  // Load environment variables
  dotenv.config();
  
  const deployEnv = process.env.DEPLOY_ENV || 'development';
  const isProd = deployEnv === 'production';
  
  console.log(`Setting up database for environment: ${deployEnv}`);
  
  // Set DATABASE_PROVIDER based on environment
  process.env.DATABASE_PROVIDER = isProd ? 'postgresql' : 'sqlite';
  
  // Use the appropriate database URL
  if (isProd) {
    // Make sure POSTGRES_DATABASE_URL is set in .env for production
    process.env.DATABASE_URL = process.env.POSTGRES_DATABASE_URL;
    console.log('Using PostgreSQL database');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } else {
    // Use the SQLite URL for development
    process.env.DATABASE_URL = process.env.SQLITE_DATABASE_URL || 'file:./prisma/prisma.db';
    console.log('Using SQLite database');
    execSync('npx prisma db push', { stdio: 'inherit' });
  }
  
  console.log('Database setup complete!');
  
  // Close the Prisma client connection when done
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error setting up database:', err);
  process.exit(1);
});