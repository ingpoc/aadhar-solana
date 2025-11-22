'use client';

import { useState, useEffect, useCallback } from 'react';
import { consentApi, ConsentRecordResponse, ConsentPurposeResponse } from '@/lib/api/endpoints';
import { ConsentType, ConsentStatus } from '@/types';
import { useToast } from '@/components/Toast';

interface UseConsentReturn {
  consents: ConsentRecordResponse[];
  purposes: ConsentPurposeResponse[];
  loading: boolean;
  error: string | null;
  grantConsent: (
    consentType: ConsentType,
    options?: {
      purpose?: string;
      dataElements?: string[];
      expiresInDays?: number;
    }
  ) => Promise<ConsentRecordResponse | null>;
  revokeConsent: (consentId: string, reason?: string) => Promise<boolean>;
  checkConsent: (consentType: ConsentType) => Promise<boolean>;
  getReceipt: (consentId: string) => Promise<string | null>;
  refreshConsents: () => Promise<void>;
  getConsentByType: (consentType: ConsentType) => ConsentRecordResponse | undefined;
  hasActiveConsent: (consentType: ConsentType) => boolean;
  activeConsentsCount: number;
  revokedConsentsCount: number;
}

export function useConsent(autoFetch: boolean = true): UseConsentReturn {
  const [consents, setConsents] = useState<ConsentRecordResponse[]>([]);
  const [purposes, setPurposes] = useState<ConsentPurposeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await consentApi.getAll();
      setConsents(response.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch consents';
      setError(message);
      console.error('Error fetching consents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPurposes = useCallback(async () => {
    try {
      const response = await consentApi.getPurposes();
      setPurposes(response.data || []);
    } catch (err: unknown) {
      console.error('Error fetching consent purposes:', err);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchConsents();
      fetchPurposes();
    }
  }, [autoFetch, fetchConsents, fetchPurposes]);

  const grantConsent = useCallback(
    async (
      consentType: ConsentType,
      options?: {
        purpose?: string;
        dataElements?: string[];
        expiresInDays?: number;
      }
    ): Promise<ConsentRecordResponse | null> => {
      setLoading(true);
      try {
        const response = await consentApi.grantConsent({
          consentType,
          purpose: options?.purpose,
          dataElements: options?.dataElements,
          expiresInDays: options?.expiresInDays,
        });

        const newConsent = response.data;
        setConsents((prev) => [...prev.filter((c) => c.consentType !== consentType), newConsent]);
        showToast('Consent granted successfully', 'success');
        return newConsent;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to grant consent';
        setError(message);
        showToast(message, 'error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const revokeConsent = useCallback(
    async (consentId: string, reason?: string): Promise<boolean> => {
      setLoading(true);
      try {
        await consentApi.revokeConsent(consentId, reason);
        setConsents((prev) =>
          prev.map((c) =>
            c.id === consentId
              ? { ...c, status: ConsentStatus.REVOKED, revokedAt: new Date().toISOString(), revokedReason: reason }
              : c
          )
        );
        showToast('Consent revoked successfully', 'success');
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to revoke consent';
        setError(message);
        showToast(message, 'error');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const checkConsent = useCallback(async (consentType: ConsentType): Promise<boolean> => {
    try {
      const response = await consentApi.checkConsent(consentType);
      return response.data.hasConsent;
    } catch (err: unknown) {
      console.error('Error checking consent:', err);
      return false;
    }
  }, []);

  const getReceipt = useCallback(async (consentId: string): Promise<string | null> => {
    try {
      const response = await consentApi.getReceipt(consentId);
      return response.data.receipt;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get consent receipt';
      showToast(message, 'error');
      return null;
    }
  }, [showToast]);

  const getConsentByType = useCallback(
    (consentType: ConsentType): ConsentRecordResponse | undefined => {
      return consents.find((c) => c.consentType === consentType && c.status === ConsentStatus.ACTIVE);
    },
    [consents]
  );

  const hasActiveConsent = useCallback(
    (consentType: ConsentType): boolean => {
      return consents.some((c) => c.consentType === consentType && c.status === ConsentStatus.ACTIVE);
    },
    [consents]
  );

  const activeConsentsCount = consents.filter((c) => c.status === ConsentStatus.ACTIVE).length;
  const revokedConsentsCount = consents.filter((c) => c.status === ConsentStatus.REVOKED).length;

  return {
    consents,
    purposes,
    loading,
    error,
    grantConsent,
    revokeConsent,
    checkConsent,
    getReceipt,
    refreshConsents: fetchConsents,
    getConsentByType,
    hasActiveConsent,
    activeConsentsCount,
    revokedConsentsCount,
  };
}

export default useConsent;
