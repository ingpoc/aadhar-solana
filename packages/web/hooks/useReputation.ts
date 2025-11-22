'use client';

import { useState, useCallback, useEffect } from 'react';
import { reputationApi, ReputationScore, ReputationEvent, extractApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UseReputationOptions {
  autoFetch?: boolean;
}

export function useReputation(options: UseReputationOptions = {}) {
  const { autoFetch = true } = options;
  const { identity } = useAuth();

  const [score, setScore] = useState<ReputationScore | null>(null);
  const [history, setHistory] = useState<ReputationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!identity?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await reputationApi.getScore(identity.id);
      setScore(data);
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [identity?.id]);

  const fetchHistory = useCallback(async (page = 1, limit = 20) => {
    if (!identity?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await reputationApi.getHistory(identity.id, { page, limit });
      const events = Array.isArray(data) ? data : data.items || [];
      setHistory(events);
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [identity?.id]);

  useEffect(() => {
    if (autoFetch && identity?.id) {
      fetchScore();
      fetchHistory();
    }
  }, [autoFetch, identity?.id, fetchScore, fetchHistory]);

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'text-amber-600',
      silver: 'text-gray-400',
      gold: 'text-yellow-500',
      platinum: 'text-purple-400',
      diamond: 'text-cyan-400',
    };
    return colors[tier] || 'text-gray-500';
  };

  const getTierBgColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'bg-amber-100',
      silver: 'bg-gray-100',
      gold: 'bg-yellow-100',
      platinum: 'bg-purple-100',
      diamond: 'bg-cyan-100',
    };
    return colors[tier] || 'bg-gray-100';
  };

  return {
    score,
    history,
    loading,
    error,
    fetchScore,
    fetchHistory,
    getTierColor,
    getTierBgColor,
  };
}
