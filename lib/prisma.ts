import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const isProduction = process.env.DEPLOY_ENV === 'production';

// Set DATABASE_URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = isProduction 
    ? process.env.POSTGRES_DATABASE_URL 
    : process.env.SQLITE_DATABASE_URL;
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: isProduction ? [] : ['query'],
});

if (!isProduction) globalForPrisma.prisma = prisma;