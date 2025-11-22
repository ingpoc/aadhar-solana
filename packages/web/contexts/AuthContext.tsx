'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { authApi, tokenManager, Identity, identityApi } from '@/lib/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email?: string;
    did?: string;
    solanaPublicKey?: string;
  } | null;
  identity: Identity | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();

  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    identity: null,
  });

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenManager.getAccessToken();
      if (token) {
        try {
          const { data: user } = await authApi.getMe();
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            user,
            isLoading: false,
          }));

          // Fetch identity if user has solanaPublicKey
          if (user.solanaPublicKey) {
            try {
              const { data: identity } = await identityApi.getByPublicKey(user.solanaPublicKey);
              setState(prev => ({ ...prev, identity }));
            } catch {
              // Identity may not exist yet
            }
          }
        } catch {
          tokenManager.clearTokens();
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  // Listen for logout events (from token refresh failure)
  useEffect(() => {
    const handleLogout = () => {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        identity: null,
      });
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Auto-login when wallet connects
  useEffect(() => {
    if (connected && publicKey && !state.isAuthenticated && !state.isLoading) {
      // Don't auto-login, let user explicitly call login
    }
  }, [connected, publicKey, state.isAuthenticated, state.isLoading]);

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get nonce from server
      const { data: nonceData } = await authApi.getNonce();

      // Sign the message
      const messageBytes = new TextEncoder().encode(nonceData.message);
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // Authenticate with server
      const { data: tokens } = await authApi.authenticateWallet({
        solanaPublicKey: publicKey.toString(),
        signature: signatureBase58,
        message: nonceData.message,
      });

      // Store tokens
      tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);

      // Get user info
      const { data: user } = await authApi.getMe();

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user,
        isLoading: false,
      }));

      // Fetch identity
      try {
        const { data: identity } = await identityApi.getByPublicKey(publicKey.toString());
        setState(prev => ({ ...prev, identity }));
      } catch {
        // Identity may not exist yet
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(async () => {
    const refreshToken = tokenManager.getRefreshToken();

    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Ignore logout errors
    }

    tokenManager.clearTokens();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      identity: null,
    });

    // Optionally disconnect wallet
    // await disconnect();
  }, []);

  const refreshIdentity = useCallback(async () => {
    if (!state.user?.solanaPublicKey) return;

    try {
      const { data: identity } = await identityApi.getByPublicKey(state.user.solanaPublicKey);
      setState(prev => ({ ...prev, identity }));
    } catch {
      // Identity may not exist
    }
  }, [state.user?.solanaPublicKey]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshIdentity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
