'use client';

import { useState, useCallback, useEffect } from 'react';
import { stakingApi, StakeInfo, extractApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSolana } from './useSolana';

interface UseStakingOptions {
  autoFetch?: boolean;
}

export function useStaking(options: UseStakingOptions = {}) {
  const { autoFetch = true } = options;
  const { identity } = useAuth();
  const { getBalance } = useSolana();

  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakeInfo = useCallback(async () => {
    if (!identity?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await stakingApi.getInfo(identity.id);
      setStakeInfo(data);
    } catch (err) {
      // Stake info may not exist if user hasn't staked
      setStakeInfo(null);
    } finally {
      setLoading(false);
    }
  }, [identity?.id]);

  const fetchBalance = useCallback(async () => {
    const balance = await getBalance();
    setSolBalance(balance);
  }, [getBalance]);

  const stake = useCallback(async (amount: string, lockPeriodDays: number) => {
    if (!identity?.id) throw new Error('Identity not found');

    setActionLoading(true);
    setError(null);

    try {
      const { data } = await stakingApi.stake({
        identityId: identity.id,
        amount,
        lockPeriodDays,
      });

      // Refresh data after staking
      await fetchStakeInfo();
      await fetchBalance();

      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setActionLoading(false);
    }
  }, [identity?.id, fetchStakeInfo, fetchBalance]);

  const requestUnstake = useCallback(async () => {
    if (!identity?.id) throw new Error('Identity not found');

    setActionLoading(true);
    setError(null);

    try {
      const { data } = await stakingApi.requestUnstake(identity.id);
      await fetchStakeInfo();
      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setActionLoading(false);
    }
  }, [identity?.id, fetchStakeInfo]);

  const completeUnstake = useCallback(async () => {
    if (!identity?.id) throw new Error('Identity not found');

    setActionLoading(true);
    setError(null);

    try {
      const { data } = await stakingApi.completeUnstake(identity.id);
      await fetchStakeInfo();
      await fetchBalance();
      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setActionLoading(false);
    }
  }, [identity?.id, fetchStakeInfo, fetchBalance]);

  const claimRewards = useCallback(async () => {
    if (!identity?.id) throw new Error('Identity not found');

    setActionLoading(true);
    setError(null);

    try {
      const { data } = await stakingApi.claimRewards(identity.id);
      await fetchStakeInfo();
      await fetchBalance();
      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setActionLoading(false);
    }
  }, [identity?.id, fetchStakeInfo, fetchBalance]);

  useEffect(() => {
    if (autoFetch && identity?.id) {
      fetchStakeInfo();
      fetchBalance();
    }
  }, [autoFetch, identity?.id, fetchStakeInfo, fetchBalance]);

  const canUnstake = stakeInfo && !stakeInfo.unstakeRequested &&
    (!stakeInfo.lockedUntil || new Date(stakeInfo.lockedUntil) <= new Date());

  const canCompleteUnstake = stakeInfo?.unstakeRequested;

  return {
    stakeInfo,
    solBalance,
    loading,
    actionLoading,
    error,
    fetchStakeInfo,
    fetchBalance,
    stake,
    requestUnstake,
    completeUnstake,
    claimRewards,
    canUnstake,
    canCompleteUnstake,
  };
}
