'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useIdentity } from '@/hooks/useIdentity';
import { useSolana } from '@/hooks/useSolana';
import { LoadingScreen } from '@/components/Loading';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  truncateAddress,
  formatSOL,
  parseVerificationBitmap,
  countVerifications,
  getReputationColor,
  getReputationBadge,
  copyToClipboard,
} from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const { identity, loading, hasIdentity } = useIdentity();
  const { getBalance } = useSolana();
  const { showToast } = useToast();
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (publicKey) {
      getBalance().then(setBalance);
    }
  }, [publicKey, getBalance]);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (!loading && !hasIdentity) {
      router.push('/identity/create');
    }
  }, [connected, loading, hasIdentity, router]);

  if (!connected || loading) {
    return <LoadingScreen message="Loading your identity..." />;
  }

  if (!identity) {
    return <LoadingScreen message="Redirecting..." />;
  }

  const verifications = parseVerificationBitmap(identity.verificationBitmap);
  const verificationCount = countVerifications(verifications);
  const reputationColor = getReputationColor(identity.reputationScore);
  const reputationBadge = getReputationBadge(identity.reputationScore);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      showToast('success', `${label} copied to clipboard`);
    } else {
      showToast('error', 'Failed to copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Identity Dashboard</h1>
          <p className="text-neutral-600">Manage your decentralized identity and credentials</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Identity Card */}
          <div className="lg:col-span-2 card">
            <h2 className="text-xl font-semibold mb-4">Identity Information</h2>

            <div className="space-y-4">
              {/* DID */}
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">
                  Decentralized Identifier (DID)
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-neutral-100 rounded text-sm font-mono">
                    {identity.did}
                  </code>
                  <button
                    onClick={() => handleCopy(identity.did, 'DID')}
                    className="btn-outline px-3 py-2 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Public Key */}
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Solana Public Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-neutral-100 rounded text-sm font-mono">
                    {identity.solanaPublicKey}
                  </code>
                  <button
                    onClick={() => handleCopy(identity.solanaPublicKey, 'Public Key')}
                    className="btn-outline px-3 py-2 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Wallet Balance</label>
                <div className="text-2xl font-bold text-primary">{formatSOL(balance)} SOL</div>
              </div>

              {/* Staked Amount */}
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Staked Amount</label>
                <div className="text-2xl font-bold text-secondary">
                  {formatSOL(identity.stakedAmount)} SOL
                </div>
              </div>
            </div>
          </div>

          {/* Reputation Card */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Reputation Score</h2>
            <div className="text-center">
              <div className={`text-6xl font-bold mb-2 ${reputationColor}`}>
                {identity.reputationScore}
              </div>
              <div className={`badge badge-info text-lg`}>{reputationBadge}</div>
              <Link href="/reputation" className="btn-outline mt-4 w-full">
                View Details
              </Link>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Verification Status</h2>
            <span className="text-sm text-neutral-600">
              {verificationCount} of 6 verifications completed
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <VerificationBadge
              label="Aadhaar"
              verified={verifications.aadhaar}
              icon="🆔"
            />
            <VerificationBadge label="PAN" verified={verifications.pan} icon="💳" />
            <VerificationBadge
              label="Education"
              verified={verifications.educational}
              icon="🎓"
            />
            <VerificationBadge label="Email" verified={verifications.email} icon="📧" />
            <VerificationBadge label="Phone" verified={verifications.phone} icon="📱" />
            <VerificationBadge
              label="Bank Account"
              verified={verifications.bankAccount}
              icon="🏦"
            />
          </div>

          <Link href="/verification" className="btn-primary mt-6 w-full">
            Request New Verification
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/verification" className="card hover:shadow-xl text-center">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="font-semibold">Get Verified</h3>
            <p className="text-sm text-neutral-600">Request verification</p>
          </Link>

          <Link href="/credentials" className="card hover:shadow-xl text-center">
            <div className="text-4xl mb-2">📜</div>
            <h3 className="font-semibold">Credentials</h3>
            <p className="text-sm text-neutral-600">View your credentials</p>
          </Link>

          <Link href="/staking" className="card hover:shadow-xl text-center">
            <div className="text-4xl mb-2">💰</div>
            <h3 className="font-semibold">Staking</h3>
            <p className="text-sm text-neutral-600">Stake SOL</p>
          </Link>

          <Link href="/reputation" className="card hover:shadow-xl text-center">
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="font-semibold">Reputation</h3>
            <p className="text-sm text-neutral-600">View history</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({
  label,
  verified,
  icon,
}: {
  label: string;
  verified: boolean;
  icon: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
        verified
          ? 'border-success bg-green-50'
          : 'border-neutral-300 bg-neutral-50'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="font-medium text-sm">{label}</div>
        <div className={`text-xs ${verified ? 'text-success' : 'text-neutral-500'}`}>
          {verified ? 'Verified ✓' : 'Not verified'}
        </div>
      </div>
    </div>
  );
}
