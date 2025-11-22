'use client';

import { useState, useCallback, useEffect } from 'react';
import { credentialsApi, Credential, extractApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UseCredentialsOptions {
  autoFetch?: boolean;
  type?: string;
}

export function useCredentials(options: UseCredentialsOptions = {}) {
  const { autoFetch = true, type } = options;
  const { identity } = useAuth();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    if (!identity?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await credentialsApi.getByIdentity(identity.id);
      let filtered = Array.isArray(data) ? data : data.items || [];

      if (type) {
        filtered = filtered.filter(c => c.credentialType === type);
      }

      setCredentials(filtered);
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [identity?.id, type]);

  const verifyCredential = useCallback(async (credentialId: string) => {
    try {
      const { data } = await credentialsApi.verify(credentialId);
      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      throw new Error(apiError.message);
    }
  }, []);

  useEffect(() => {
    if (autoFetch && identity?.id) {
      fetchCredentials();
    }
  }, [autoFetch, identity?.id, fetchCredentials]);

  return {
    credentials,
    loading,
    error,
    fetchCredentials,
    verifyCredential,
  };
}
