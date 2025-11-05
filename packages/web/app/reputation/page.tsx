'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/useIdentity';
import { LoadingScreen, Spinner } from '@/components/Loading';
import { getReputationColor, getReputationBadge, formatDate } from '@/lib/utils';
import { ReputationHistory } from '@/types';

export default function ReputationPage() {
  const { connected } = useWallet();
  const { identity, loading: identityLoading, hasIdentity } = useIdentity();
  const router = useRouter();

  const [history, setHistory] = useState<ReputationHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (!identityLoading && !hasIdentity) {
      router.push('/identity/create');
    }
  }, [connected, identityLoading, hasIdentity, router]);

  useEffect(() => {
    // Simulate fetching reputation history
    const mockHistory: ReputationHistory[] = [
      {
        id: '1',
        identityId: identity?.id || '',
        eventType: 'Identity Created',
        scoreDelta: 500,
        newScore: 500,
        description: 'Initial reputation score',
        createdAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        identityId: identity?.id || '',
        eventType: 'Aadhaar Verified',
        scoreDelta: 100,
        newScore: 600,
        description: 'Aadhaar verification completed',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: '3',
        identityId: identity?.id || '',
        eventType: 'PAN Verified',
        scoreDelta: 50,
        newScore: 650,
        description: 'PAN verification completed',
        createdAt: new Date('2024-02-20'),
      },
    ];

    setTimeout(() => {
      setHistory(mockHistory);
      setLoading(false);
    }, 1000);
  }, [identity]);

  if (!connected || identityLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!identity) {
    return <LoadingScreen message="Redirecting..." />;
  }

  const score = identity.reputationScore;
  const badge = getReputationBadge(score);
  const color = getReputationColor(score);

  // Calculate breakdown (simplified)
  const breakdown = {
    baseScore: 500,
    verificationBonus: Math.max(0, score - 500),
    activityScore: 0,
    penaltyScore: 0,
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reputation Score</h1>
          <p className="text-neutral-600">Track your on-chain reputation and score history</p>
        </div>

        {/* Score Card */}
        <div className="card mb-8 text-center">
          <div className={`text-8xl font-bold mb-4 ${color}`}>{score}</div>
          <div className="badge badge-info text-lg mb-6">{badge}</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div>
              <div className="text-sm text-neutral-600">Base Score</div>
              <div className="text-2xl font-bold text-neutral-800">{breakdown.baseScore}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Verification Bonus</div>
              <div className="text-2xl font-bold text-success">+{breakdown.verificationBonus}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Activity Score</div>
              <div className="text-2xl font-bold text-blue-600">+{breakdown.activityScore}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Penalties</div>
              <div className="text-2xl font-bold text-error">-{breakdown.penaltyScore}</div>
            </div>
          </div>
        </div>

        {/* Score Ranges Info */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Score Ranges</h2>
          <div className="space-y-3">
            <ScoreRange min={900} max={1000} label="Excellent" color="green" />
            <ScoreRange min={800} max={899} label="Very Good" color="blue" />
            <ScoreRange min={600} max={799} label="Good" color="blue" />
            <ScoreRange min={400} max={599} label="Fair" color="yellow" />
            <ScoreRange min={200} max={399} label="Poor" color="orange" />
            <ScoreRange min={0} max={199} label="Very Poor" color="red" />
          </div>
        </div>

        {/* History */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Score History</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-neutral-600">No history yet</div>
          ) : (
            <div className="space-y-4">
              {history.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 pb-4 border-b border-neutral-200 last:border-0"
                >
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.scoreDelta > 0
                          ? 'bg-green-100 text-success'
                          : event.scoreDelta < 0
                          ? 'bg-red-100 text-error'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {event.scoreDelta > 0 ? '+' : event.scoreDelta < 0 ? '-' : '='}{' '}
                      {Math.abs(event.scoreDelta)}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold">{event.eventType}</div>
                    <div className="text-sm text-neutral-600">{event.description}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {formatDate(event.createdAt, true)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm text-neutral-600">
                      New Score: <span className="font-bold">{event.newScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How to Improve */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How to Improve Your Score</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ Complete identity verifications (Aadhaar, PAN, etc.)</li>
            <li>✓ Maintain active staking</li>
            <li>✓ Participate in the network regularly</li>
            <li>✓ Issue and verify credentials</li>
            <li>✗ Avoid malicious behavior that results in penalties</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScoreRange({
  min,
  max,
  label,
  color,
}: {
  min: number;
  max: number;
  label: string;
  color: string;
}) {
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}></div>
      <div className="flex-1">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-neutral-600 ml-2">
          ({min} - {max})
        </span>
      </div>
    </div>
  );
}
