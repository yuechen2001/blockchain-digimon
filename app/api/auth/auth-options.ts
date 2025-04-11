import type { AuthOptions, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
import { ConnectedWallet } from '../../../types/next-auth';

// Define the type for a wallet from our database
interface WalletData {
  id: string;
  address: string;
  isActive: boolean;
  userId: string;
}

// Extend User type to include connectedWallets
interface CustomUser extends User {
  id: string;
  email?: string;
  name?: string;
  connectedWallets?: ConnectedWallet[];
}

// Environment detection
const isProduction = process.env.DEPLOY_ENV === 'production';
const isDevelopment = !isProduction;

const envConfig = {
  debug: isDevelopment,
  sessionMaxAge: isProduction ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
  cookieSecure: isProduction,
  jwtMaxAge: isProduction ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
};

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          // Find the user by email
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              wallets: true
            }
          });

          if (!user || !user.password) {
            throw new Error('User not found or password not set');
          }

          // Compare the provided password with the stored hash
          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          // Format wallets for the JWT token
          const connectedWallets = user.wallets.map((wallet: WalletData) => ({
            id: wallet.id,
            address: wallet.address,
            isActive: wallet.isActive
          }));

          return {
            id: user.id,
            email: user.email,
            name: user.name, // Use name field instead of username
            connectedWallets
          } as CustomUser;
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: envConfig.sessionMaxAge
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: envConfig.debug,
  useSecureCookies: envConfig.cookieSecure,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: envConfig.cookieSecure
      }
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: envConfig.cookieSecure
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email || undefined;
        token.name = user.name || undefined;
        token.connectedWallets = (user as CustomUser).connectedWallets;
      }
      return token;
    },
    async session({ session, token }: { session: Session, token: JWT }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          email: token.email,
          name: token.name,
          connectedWallets: token.connectedWallets as ConnectedWallet[] | undefined
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  }
};