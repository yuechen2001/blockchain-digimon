'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  walletAddress?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<User>;
  unlinkWallet: () => Promise<User>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  linkWallet: async () => ({} as User),
  unlinkWallet: async () => ({} as User),
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(
    session?.user as User | null || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update user state when session changes
  React.useEffect(() => {
    if (session?.user) {
      setUser(session.user as User);
    } else {
      setUser(null);
    }
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Redirect to marketplace after successful login
      router.push('/marketplace');
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during login');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during registration');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during logout');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const linkWallet = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);
    if (!session?.user?.email || user?.walletAddress === walletAddress) {
      console.log('Early return - session:', session?.user?.email, 'current wallet:', user?.walletAddress, 'new wallet:', walletAddress);
      return user;
    }

    try {
      console.log('Linking wallet:', walletAddress);
      const response = await fetch('/api/user/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to link wallet');
      }

      const updatedUser = await response.json();
      console.log('Link wallet response:', updatedUser);

      // Update the session with the new user data
      await updateSession({
        ...session,
        user: updatedUser,
      });
      console.log('Session updated with user:', updatedUser);

      // Update local user state
      setUser(updatedUser);
      console.log('Local user state updated:', updatedUser);

      return updatedUser;
    } catch (error) {
      console.error('Link wallet error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while linking wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, user, updateSession]);

  const unlinkWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!session?.user?.email) {
      return user;
    }

    try {
      const response = await fetch('/api/user/unlink-wallet', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unlink wallet');
      }

      const updatedUser = await response.json();

      // Update the session to remove the wallet address
      await updateSession({
        ...session,
        user: updatedUser,
      });

      // Update local user state
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Unlink wallet error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while unlinking wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, updateSession, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        linkWallet,
        unlinkWallet,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
