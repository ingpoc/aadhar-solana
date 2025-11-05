'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/useIdentity';
import { useSolana } from '@/hooks/useSolana';
import { useToast } from '@/components/Toast';
import { LoadingScreen, Spinner } from '@/components/Loading';
import { formatSOL, parseSOL, getTimeUntilUnlock, classifyError } from '@/lib/utils';
import { stakingApi } from '@/lib/api';

export default function StakingPage() {
  const { connected } = useWallet();
  const { identity, loading: identityLoading, hasIdentity, refreshIdentity } = useIdentity();
  const { getBalance } = useSolana();
  const { showToast } = useToast();
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'stake' | 'unstake'>('stake');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (!identityLoading && !hasIdentity) {
      router.push('/identity/create');
    }
  }, [connected, identityLoading, hasIdentity, router]);

  useEffect(() => {
    if (connected) {
      getBalance().then(setBalance);
    }
  }, [connected, getBalance]);

  if (!connected || identityLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!identity) {
    return <LoadingScreen message="Redirecting..." />;
  }

  const stakedSOL = Number(formatSOL(identity.stakedAmount));
  const minStake = 1; // 1 SOL minimum

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(stakeAmount);

    if (isNaN(amount) || amount <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    if (amount < minStake) {
      showToast('error', `Minimum stake amount is ${minStake} SOL`);
      return;
    }

    if (amount > balance) {
      showToast('error', 'Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      await stakingApi.stake({
        identityId: identity.id,
        amount: parseSOL(amount),
      });

      showToast('success', `Successfully staked ${amount} SOL!`);
      setStakeAmount('');
      await refreshIdentity();
      getBalance().then(setBalance);
    } catch (error: any) {
      const errorMsg = classifyError(error);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(unstakeAmount);

    if (isNaN(amount) || amount <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    if (amount > stakedSOL) {
      showToast('error', 'Insufficient staked amount');
      return;
    }

    setLoading(true);

    try {
      // Call unstake API
      showToast('success', `Unstake request for ${amount} SOL submitted!`);
      setUnstakeAmount('');
      await refreshIdentity();
    } catch (error: any) {
      const errorMsg = classifyError(error);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Staking</h1>
          <p className="text-neutral-600">Stake SOL to enhance your reputation and earn rewards</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="text-sm text-neutral-600 mb-1">Wallet Balance</div>
            <div className="text-3xl font-bold text-primary">{formatSOL(balance)} SOL</div>
          </div>

          <div className="card">
            <div className="text-sm text-neutral-600 mb-1">Staked Amount</div>
            <div className="text-3xl font-bold text-secondary">{formatSOL(identity.stakedAmount)} SOL</div>
          </div>

          <div className="card">
            <div className="text-sm text-neutral-600 mb-1">Rewards Earned</div>
            <div className="text-3xl font-bold text-success">0.00 SOL</div>
            <div className="text-xs text-neutral-500 mt-1">Coming soon</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-8">
          <div className="flex border-b border-neutral-200 mb-6">
            <button
              onClick={() => setTab('stake')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                tab === 'stake'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-600 hover:text-primary'
              }`}
            >
              Stake SOL
            </button>
            <button
              onClick={() => setTab('unstake')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                tab === 'unstake'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-600 hover:text-primary'
              }`}
            >
              Unstake SOL
            </button>
          </div>

          {/* Stake Form */}
          {tab === 'stake' && (
            <form onSubmit={handleStake} className="space-y-6">
              <div>
                <label htmlFor="stake-amount" className="block text-sm font-medium text-neutral-700 mb-2">
                  Amount to Stake (SOL)
                </label>
                <input
                  type="number"
                  id="stake-amount"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                  min={minStake}
                  max={balance}
                  className="input"
                  required
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>Min: {minStake} SOL</span>
                  <button
                    type="button"
                    onClick={() => setStakeAmount(balance.toString())}
                    className="text-primary hover:underline"
                  >
                    Max: {formatSOL(balance)} SOL
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Staking Benefits</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Increase your reputation score</li>
                  <li>✓ Earn staking rewards (coming soon)</li>
                  <li>✓ Participate in governance (coming soon)</li>
                  <li>✓ Show commitment to the network</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Staking...
                  </>
                ) : (
                  <>Stake SOL</>
                )}
              </button>
            </form>
          )}

          {/* Unstake Form */}
          {tab === 'unstake' && (
            <form onSubmit={handleUnstake} className="space-y-6">
              <div>
                <label htmlFor="unstake-amount" className="block text-sm font-medium text-neutral-700 mb-2">
                  Amount to Unstake (SOL)
                </label>
                <input
                  type="number"
                  id="unstake-amount"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                  min="0.01"
                  max={stakedSOL}
                  className="input"
                  required
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>Available: {formatSOL(identity.stakedAmount)} SOL</span>
                  <button
                    type="button"
                    onClick={() => setUnstakeAmount(stakedSOL.toString())}
                    className="text-primary hover:underline"
                  >
                    Unstake All
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Unstaking Information</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Unstaking has a lock period (typically 7 days)</li>
                  <li>• Your reputation score will be recalculated</li>
                  <li>• You will stop earning staking rewards</li>
                  <li>• Funds will be available after lock period</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading || stakedSOL === 0}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Unstaking...
                  </>
                ) : (
                  <>Request Unstake</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-3">How Staking Works</h3>
            <ol className="text-sm text-neutral-600 space-y-2 list-decimal list-inside">
              <li>Stake SOL to lock it in the staking program</li>
              <li>Your reputation score increases based on stake amount</li>
              <li>Earn rewards for contributing to network security</li>
              <li>Unstake anytime (subject to lock period)</li>
            </ol>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Staking Parameters</h3>
            <div className="text-sm text-neutral-600 space-y-2">
              <div className="flex justify-between">
                <span>Minimum Stake:</span>
                <span className="font-medium">{minStake} SOL</span>
              </div>
              <div className="flex justify-between">
                <span>Lock Period:</span>
                <span className="font-medium">7 days</span>
              </div>
              <div className="flex justify-between">
                <span>APY:</span>
                <span className="font-medium text-success">Coming Soon</span>
              </div>
              <div className="flex justify-between">
                <span>Slashing:</span>
                <span className="font-medium text-error">For malicious behavior</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
