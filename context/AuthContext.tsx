'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useWeb3Context } from './Web3Context';
import { signMessage } from '../utils/wallet';

// Helper function to get CSRF token from cookies
function getCsrfHeaders() {
  // Default headers
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Only run in browser environment
  if (typeof document !== 'undefined') {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('next-auth.csrf-token='))
      ?.split('=')[1]
      ?.split('.')[0];
    
    // Only add CSRF token if it exists
    if (csrfToken) {
      headers['csrf-token'] = csrfToken;
    }
  }

  return headers;
}

// Define the structure of a connected wallet
interface ConnectedWallet {
  id: string;
  address: string;
  isActive: boolean;
}

interface User {
  id: string;
  email?: string;
  username?: string;
  connectedWallets?: ConnectedWallet[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isWalletConnected: boolean;
  activeWallet: string | null;
  connectedWallets: ConnectedWallet[];
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  walletLogin: () => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<User | null>;
  unlinkWallet: (walletAddress: string) => Promise<User | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  error: null,
  isWalletConnected: false,
  activeWallet: null,
  connectedWallets: [],
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  walletLogin: async () => {},
  linkWallet: async () => null,
  unlinkWallet: async () => null,
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const { 
    account, 
    isConnected, 
    connect: connectWallet, 
    disconnect: disconnectWallet,
    provider 
  } = useWeb3Context();

  // Derived state for active wallet
  const activeWallet = account || null;
  const connectedWallets = user?.connectedWallets || [];

  // Update user state when session changes
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email || undefined,
        username: session.user.name || undefined,
        connectedWallets: session.user.connectedWallets || [],
      });
    } else if (account) {
      // If no session but wallet is connected
      setUser({
        id: account, // Use wallet address as ID for wallet-only users
        connectedWallets: [{ 
          id: 'temporary-id', 
          address: account, 
          isActive: true 
        }]
      });
    } else {
      setUser(null);
    }
  }, [session, account]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });
      
      if (result?.error) {
        setError(result.error);
        throw new Error(result.error);
      }
      
      // Only redirect to the marketplace/home page after successful login
      if (result?.ok) {
        router.push('/marketplace');
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = useCallback(async (email: string, username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: getCsrfHeaders(),
        body: JSON.stringify({ email, username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Registration failed');
        throw new Error(data.error || 'Registration failed');
      }
      
      // Automatically log the user in after successful registration
      await login(email, password);
      
    } catch (error) {
      console.error("Registration error:", error);
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const walletLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First connect the wallet if not already connected
      if (!isConnected || !account) {
        await connectWallet();
      }
      
      if (!account || !provider) {
        throw new Error("Wallet connection failed");
      }
      
      // Message to sign to authenticate
      const nonceResponse = await fetch('/api/auth/wallet/nonce');
      const { nonce } = await nonceResponse.json();
      const message = `Sign this message to authenticate with Blockchain Digimon: ${nonce}`;
      
      // Use the utility function instead of direct signer
      const signature = await signMessage(message, account);
      
      // Send to backend for verification
      const response = await fetch('/api/auth/wallet/authenticate', {
        method: 'POST',
        headers: getCsrfHeaders(),
        body: JSON.stringify({ 
          walletAddress: account,
          signature,
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Wallet authentication failed');
        throw new Error(data.error || 'Wallet authentication failed');
      }
      
      // If user already has a session, this will add the wallet to their account
      // Otherwise, they're now authenticated via wallet only
      if (data.user) {
        setUser(data.user);
      }
      
      router.refresh();
      return data.user;
      
    } catch (error) {
      console.error("Wallet login error:", error);
      setError(error instanceof Error ? error.message : 'Wallet login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [account, isConnected, connectWallet, provider, router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Sign out from NextAuth session if exists
      await signOut({ redirect: false });
      
      // Disconnect wallet if connected
      if (isConnected) {
        await disconnectWallet();
      }
      
      // Clear user state
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, disconnectWallet, router]);

  const linkWallet = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure user is authenticated via session
      if (!session?.user?.id) {
        throw new Error("You must be logged in to link a wallet");
      }
      
      const response = await fetch('/api/auth/wallet/link', {
        method: 'POST',
        headers: getCsrfHeaders(),
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to link wallet');
        throw new Error(data.error || 'Failed to link wallet');
      }
      
      // Update user state with the new wallet data
      setUser(data);
      router.refresh();
      return data;
      
    } catch (error) {
      console.error("Link wallet error:", error);
      setError(error instanceof Error ? error.message : 'Failed to link wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, router]);

  const unlinkWallet = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure user is authenticated via session
      if (!session?.user?.id) {
        throw new Error("You must be logged in to unlink a wallet");
      }
      
      const response = await fetch('/api/auth/wallet/unlink', {
        method: 'POST',
        headers: getCsrfHeaders(),
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to unlink wallet');
        throw new Error(data.error || 'Failed to unlink wallet');
      }
      
      // Update user state with the updated wallet data
      setUser(data);
      
      // Disconnect wallet if it's the active one
      if (isConnected && account === walletAddress) {
        await disconnectWallet();
      }
      
      router.refresh();
      return data;
      
    } catch (error) {
      console.error("Unlink wallet error:", error);
      setError(error instanceof Error ? error.message : 'Failed to unlink wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, router, isConnected, disconnectWallet, account]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isWalletConnected: isConnected,
        activeWallet,
        connectedWallets,
        login,
        register,
        logout,
        walletLogin,
        linkWallet,
        unlinkWallet,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
