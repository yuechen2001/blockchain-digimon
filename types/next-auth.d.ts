import 'next-auth';

// Define the structure of a connected wallet
interface ConnectedWallet {
  id: string;
  address: string;
  isActive: boolean;
}

declare module 'next-auth' {
  /**
   * Returned by useSession, getSession and received as a prop on the SessionProvider React Context
   */
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      connectedWallets?: ConnectedWallet[];
    };
    expires: string;
  }

  /**
   * The shape of the user object returned in the OAuth providers' callback
   * and exposed in `useSession().data.user`
   */
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    connectedWallets?: ConnectedWallet[];
    walletNonce?: string | null;
    walletNonceExpires?: Date | null;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    sub?: string;
    connectedWallets?: ConnectedWallet[];
  }
}