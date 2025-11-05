'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/useIdentity';
import { LoadingScreen, Spinner } from '@/components/Loading';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { Credential } from '@/types';

export default function CredentialsPage() {
  const { connected } = useWallet();
  const { identity, loading: identityLoading, hasIdentity } = useIdentity();
  const router = useRouter();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (!identityLoading && !hasIdentity) {
      router.push('/identity/create');
    }
  }, [connected, identityLoading, hasIdentity, router]);

  useEffect(() => {
    // Simulate fetching credentials
    // In real implementation, fetch from API
    const mockCredentials: Credential[] = [
      {
        id: '1',
        credentialId: 'cred_aadhaar_001',
        identityId: identity?.id || '',
        credentialType: 'Aadhaar Verification',
        issuedAt: new Date('2024-01-15'),
        revoked: false,
        proofHash: '0x1234...5678',
      },
      {
        id: '2',
        credentialId: 'cred_pan_001',
        identityId: identity?.id || '',
        credentialType: 'PAN Verification',
        issuedAt: new Date('2024-02-20'),
        revoked: false,
        proofHash: '0xabcd...efgh',
      },
    ];

    setTimeout(() => {
      setCredentials(mockCredentials);
      setLoading(false);
    }, 1000);
  }, [identity]);

  if (!connected || identityLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!identity) {
    return <LoadingScreen message="Redirecting..." />;
  }

  const filteredCredentials = credentials.filter((cred) => {
    if (filter === 'all') return true;
    if (filter === 'revoked') return cred.revoked;
    if (filter === 'expired') {
      if (!cred.expiresAt) return false;
      return new Date(cred.expiresAt) < new Date();
    }
    if (filter === 'active') {
      if (cred.revoked) return false;
      if (cred.expiresAt && new Date(cred.expiresAt) < new Date()) return false;
      return true;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Credentials</h1>
          <p className="text-neutral-600">Manage your verifiable credentials</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'active', 'expired', 'revoked'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {f}
              {f === 'all' && ` (${credentials.length})`}
            </button>
          ))}
        </div>

        {/* Credentials Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredCredentials.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-xl font-semibold mb-2">No Credentials Found</h3>
            <p className="text-neutral-600 mb-6">
              {filter === 'all'
                ? 'You don\'t have any credentials yet.'
                : `No ${filter} credentials found.`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/verification')}
                className="btn-primary inline-block"
              >
                Get Verified
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCredentials.map((credential) => (
              <CredentialCard key={credential.id} credential={credential} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CredentialCard({ credential }: { credential: Credential }) {
  const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date();

  return (
    <div className="card hover:shadow-xl transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="text-3xl">📜</div>
        <div>
          {credential.revoked ? (
            <span className="badge badge-error">Revoked</span>
          ) : isExpired ? (
            <span className="badge badge-warning">Expired</span>
          ) : (
            <span className="badge badge-success">Active</span>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-lg mb-2">{credential.credentialType}</h3>

      <div className="space-y-2 text-sm text-neutral-600 mb-4">
        <div>
          <span className="font-medium">Issued:</span>{' '}
          {formatDate(credential.issuedAt)}
        </div>
        {credential.expiresAt && (
          <div>
            <span className="font-medium">Expires:</span>{' '}
            {formatDate(credential.expiresAt)}
          </div>
        )}
        <div>
          <span className="font-medium">ID:</span>{' '}
          <code className="text-xs">{credential.credentialId}</code>
        </div>
      </div>

      <button
        onClick={() => {
          /* Navigate to detail page */
        }}
        className="btn-outline w-full"
      >
        View Details
      </button>
    </div>
  );
}
