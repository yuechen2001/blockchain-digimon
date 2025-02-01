import NextAuth, { AuthOptions, SessionStrategy, Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getCsrfToken } from 'next-auth/react';

declare module "next-auth" {
  interface Session {
    address?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: {
          label: 'Message',
          type: 'text',
        },
        signature: {
          label: 'Signature',
          type: 'text',
        },
      },
      async authorize(credentials) {
        try {
          const siwe = JSON.parse(credentials?.message || '{}');
          const nextAuthUrl = process.env.NEXTAUTH_URL;
          if (!nextAuthUrl) throw new Error('NEXTAUTH_URL is not set');

          if (siwe.nonce !== (await getCsrfToken())) {
            throw new Error('Invalid nonce.');
          }

          return {
            id: siwe.address,
          };
        } catch (e) {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as SessionStrategy,
  },
  callbacks: {
    async session({ session, token }) {
      session.address = token.sub;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
