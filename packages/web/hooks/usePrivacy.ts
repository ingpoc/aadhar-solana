'use client';

import { useState, useEffect, useCallback } from 'react';
import { privacyApi, PrivacyNoticeResponse } from '@/lib/api/endpoints';
import { useToast } from '@/components/Toast';

interface UsePrivacyReturn {
  currentNotice: PrivacyNoticeResponse | null;
  noticeHistory: PrivacyNoticeResponse[];
  hasAcknowledged: boolean;
  loading: boolean;
  error: string | null;
  acknowledgeNotice: (noticeId: string) => Promise<boolean>;
  refreshNotice: () => Promise<void>;
  checkAcknowledgment: () => Promise<boolean>;
}

export function usePrivacy(autoFetch: boolean = true): UsePrivacyReturn {
  const [currentNotice, setCurrentNotice] = useState<PrivacyNoticeResponse | null>(null);
  const [noticeHistory, setNoticeHistory] = useState<PrivacyNoticeResponse[]>([]);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchCurrentNotice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await privacyApi.getCurrentNotice();
      setCurrentNotice(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch privacy notice';
      setError(message);
      console.error('Error fetching privacy notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNoticeHistory = useCallback(async () => {
    try {
      const response = await privacyApi.getNoticeHistory();
      setNoticeHistory(response.data || []);
    } catch (err: unknown) {
      console.error('Error fetching notice history:', err);
    }
  }, []);

  const checkAcknowledgment = useCallback(async (): Promise<boolean> => {
    try {
      const response = await privacyApi.hasAcknowledged();
      setHasAcknowledged(response.data.acknowledged);
      if (response.data.notice) {
        setCurrentNotice(response.data.notice);
      }
      return response.data.acknowledged;
    } catch (err: unknown) {
      console.error('Error checking acknowledgment:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchCurrentNotice();
      checkAcknowledgment();
    }
  }, [autoFetch, fetchCurrentNotice, checkAcknowledgment]);

  const acknowledgeNotice = useCallback(
    async (noticeId: string): Promise<boolean> => {
      setLoading(true);
      try {
        await privacyApi.acknowledgeNotice(noticeId);
        setHasAcknowledged(true);
        showToast('Privacy notice acknowledged', 'success');
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to acknowledge privacy notice';
        setError(message);
        showToast(message, 'error');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  return {
    currentNotice,
    noticeHistory,
    hasAcknowledged,
    loading,
    error,
    acknowledgeNotice,
    refreshNotice: fetchCurrentNotice,
    checkAcknowledgment,
  };
}

export default usePrivacy;
