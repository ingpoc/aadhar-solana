'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { identityApi } from '@/lib/api';
import { Identity } from '@/types';
import { generateDID } from '@/lib/utils';

export function useIdentity() {
  const { publicKey, connected } = useWallet();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIdentity = useCallback(async () => {
    if (!publicKey || !connected) {
      setIdentity(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const did = generateDID(publicKey);
      const response = await identityApi.getById(did);
      setIdentity(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Identity doesn't exist yet
        setIdentity(null);
      } else {
        setError(err.message || 'Failed to fetch identity');
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected]);

  const createIdentity = useCallback(
    async (phoneNumber?: string) => {
      if (!publicKey || !connected) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const did = generateDID(publicKey);
        const response = await identityApi.create({
          userId: publicKey.toBase58(), // Using public key as user ID for now
          solanaPublicKey: publicKey.toBase58(),
          did,
          phoneNumber: phoneNumber || '',
        });

        setIdentity(response.data);
        return response.data;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to create identity';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connected]
  );

  const refreshIdentity = useCallback(() => {
    return fetchIdentity();
  }, [fetchIdentity]);

  useEffect(() => {
    fetchIdentity();
  }, [fetchIdentity]);

  return {
    identity,
    loading,
    error,
    createIdentity,
    refreshIdentity,
    hasIdentity: !!identity,
  };
}
