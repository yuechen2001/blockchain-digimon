import { AuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { getCsrfToken } from "next-auth/react";
import { SiweMessage } from "siwe";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: {
          label: "Message",
          type: "text",
        },
        signature: {
          label: "Signature",
          type: "text",
        },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.message || !credentials?.signature) {
            return null;
          }

          const siwe = new SiweMessage(JSON.parse(credentials.message));
          const host = req.headers?.host || 'localhost:3000';
          
          // Verify domain
          if (siwe.domain !== host) {
            return null;
          }

          // Verify CSRF token
          const csrfToken = await getCsrfToken({ req: { headers: req.headers } });
          if (!csrfToken || siwe.nonce !== csrfToken) {
            return null;
          }

          // Verify signature
          const verifyResult = await siwe.verify({ 
            signature: credentials.signature,
            time: new Date().toISOString()
          });
          
          if (!verifyResult.success) {
            return null;
          }

          return {
            id: siwe.address,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      session.address = token.sub;
      session.user = {
        name: token.sub,
      };
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };