'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/useIdentity';
import { useCredentials } from '@/hooks/useCredentials';
import { LoadingScreen, Spinner } from '@/components/Loading';
import { formatDate, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { Credential } from '@/types';

type FilterType = 'all' | 'active' | 'expired' | 'revoked';

export default function CredentialsPage() {
  const { connected } = useWallet();
  const { identity, loading: identityLoading, hasIdentity } = useIdentity();
  const { credentials, loading: credentialsLoading, verifyCredential, fetchCredentials } = useCredentials();
  const { showToast } = useToast();
  const router = useRouter();

  const [filter, setFilter] = useState<FilterType>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);

  // Redirect if not connected or no identity
  if (!connected) {
    router.push('/');
    return <LoadingScreen message="Redirecting..." />;
  }

  if (identityLoading) {
    return <LoadingScreen message="Loading identity..." />;
  }

  if (!hasIdentity) {
    router.push('/identity/create');
    return <LoadingScreen message="Redirecting..." />;
  }

  const isExpired = (cred: Credential) => {
    if (!cred.expiresAt) return false;
    return new Date(cred.expiresAt) < new Date();
  };

  const isActive = (cred: Credential) => {
    if (cred.revoked) return false;
    if (isExpired(cred)) return false;
    return true;
  };

  const filteredCredentials = credentials.filter((cred) => {
    if (filter === 'all') return true;
    if (filter === 'revoked') return cred.revoked;
    if (filter === 'expired') return isExpired(cred);
    if (filter === 'active') return isActive(cred);
    return true;
  });

  const handleVerify = async (credentialId: string) => {
    setVerifyingId(credentialId);
    try {
      const result = await verifyCredential(credentialId);
      if (result.valid) {
        showToast('success', 'Credential verified successfully');
      } else {
        showToast('error', 'Credential verification failed');
      }
      fetchCredentials();
    } catch (err: any) {
      showToast('error', err.message || 'Verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleCopyId = async (credentialId: string) => {
    const success = await copyToClipboard(credentialId);
    if (success) {
      showToast('success', 'Credential ID copied');
    }
  };

  const getCredentialIcon = (type: string): string => {
    const icons: Record<string, string> = {
      AadhaarVerification: '🆔',
      PANVerification: '💳',
      EducationalDegree: '🎓',
      EmploymentProof: '💼',
      BankAccountVerification: '🏦',
      AddressProof: '🏠',
      VoterIdVerification: '🗳️',
      DrivingLicenseVerification: '🚗',
    };
    return icons[type] || '📜';
  };

  const getCredentialTypeName = (type: string): string => {
    const names: Record<string, string> = {
      AadhaarVerification: 'Aadhaar Verification',
      PANVerification: 'PAN Verification',
      EducationalDegree: 'Educational Degree',
      EmploymentProof: 'Employment Proof',
      BankAccountVerification: 'Bank Account',
      AddressProof: 'Address Proof',
      VoterIdVerification: 'Voter ID',
      DrivingLicenseVerification: 'Driving License',
    };
    return names[type] || type;
  };

  const filterCounts = {
    all: credentials.length,
    active: credentials.filter(isActive).length,
    expired: credentials.filter(isExpired).length,
    revoked: credentials.filter((c) => c.revoked).length,
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Credentials</h1>
          <p className="text-neutral-600">Manage your verifiable credentials</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['all', 'active', 'expired', 'revoked'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {f} ({filterCounts[f]})
            </button>
          ))}
        </div>

        {/* Credentials Grid */}
        {credentialsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredCredentials.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-xl font-semibold mb-2">No Credentials Found</h3>
            <p className="text-neutral-600 mb-6">
              {filter === 'all'
                ? "You don't have any credentials yet."
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
              <CredentialCard
                key={credential.id}
                credential={credential}
                icon={getCredentialIcon(credential.credentialType)}
                typeName={getCredentialTypeName(credential.credentialType)}
                isVerifying={verifyingId === credential.credentialId}
                onVerify={() => handleVerify(credential.credentialId)}
                onCopyId={() => handleCopyId(credential.credentialId)}
                onViewDetails={() => setSelectedCredential(credential)}
              />
            ))}
          </div>
        )}

        {/* Credential Detail Modal */}
        {selectedCredential && (
          <CredentialDetailModal
            credential={selectedCredential}
            icon={getCredentialIcon(selectedCredential.credentialType)}
            typeName={getCredentialTypeName(selectedCredential.credentialType)}
            onClose={() => setSelectedCredential(null)}
            onVerify={() => handleVerify(selectedCredential.credentialId)}
            isVerifying={verifyingId === selectedCredential.credentialId}
          />
        )}
      </div>
    </div>
  );
}

interface CredentialCardProps {
  credential: Credential;
  icon: string;
  typeName: string;
  isVerifying: boolean;
  onVerify: () => void;
  onCopyId: () => void;
  onViewDetails: () => void;
}

function CredentialCard({
  credential,
  icon,
  typeName,
  isVerifying,
  onVerify,
  onCopyId,
  onViewDetails,
}: CredentialCardProps) {
  const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date();

  return (
    <div className="card hover:shadow-xl transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="text-3xl">{icon}</div>
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

      <h3 className="font-semibold text-lg mb-2">{typeName}</h3>

      <div className="space-y-2 text-sm text-neutral-600 mb-4">
        <div>
          <span className="font-medium">Issued:</span> {formatDate(credential.issuedAt)}
        </div>
        {credential.expiresAt && (
          <div>
            <span className="font-medium">Expires:</span> {formatDate(credential.expiresAt)}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-medium">ID:</span>
          <code className="text-xs truncate flex-1">{credential.credentialId}</code>
          <button onClick={onCopyId} className="text-primary hover:underline text-xs">
            Copy
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onViewDetails} className="btn-outline flex-1">
          Details
        </button>
        <button
          onClick={onVerify}
          disabled={isVerifying || credential.revoked}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {isVerifying ? <Spinner size="sm" /> : 'Verify'}
        </button>
      </div>
    </div>
  );
}

interface CredentialDetailModalProps {
  credential: Credential;
  icon: string;
  typeName: string;
  onClose: () => void;
  onVerify: () => void;
  isVerifying: boolean;
}

function CredentialDetailModal({
  credential,
  icon,
  typeName,
  onClose,
  onVerify,
  isVerifying,
}: CredentialDetailModalProps) {
  const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{icon}</div>
              <div>
                <h2 className="text-xl font-bold">{typeName}</h2>
                <div className="mt-1">
                  {credential.revoked ? (
                    <span className="badge badge-error">Revoked</span>
                  ) : isExpired ? (
                    <span className="badge badge-warning">Expired</span>
                  ) : (
                    <span className="badge badge-success">Active</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-neutral-600 mb-1 block">Credential ID</label>
              <code className="block px-3 py-2 bg-neutral-100 rounded text-sm font-mono break-all">
                {credential.credentialId}
              </code>
            </div>

            <div>
              <label className="text-sm text-neutral-600 mb-1 block">Identity ID</label>
              <code className="block px-3 py-2 bg-neutral-100 rounded text-sm font-mono break-all">
                {credential.identityId}
              </code>
            </div>

            {credential.issuerId && (
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Issuer</label>
                <code className="block px-3 py-2 bg-neutral-100 rounded text-sm font-mono break-all">
                  {credential.issuerId}
                </code>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Issued At</label>
                <div className="font-medium">{formatDate(credential.issuedAt)}</div>
              </div>
              {credential.expiresAt && (
                <div>
                  <label className="text-sm text-neutral-600 mb-1 block">Expires At</label>
                  <div className="font-medium">{formatDate(credential.expiresAt)}</div>
                </div>
              )}
            </div>

            {credential.proofHash && (
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Proof Hash</label>
                <code className="block px-3 py-2 bg-neutral-100 rounded text-sm font-mono break-all">
                  {credential.proofHash}
                </code>
              </div>
            )}

            {credential.revoked && credential.revokedAt && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-red-800 font-medium">This credential has been revoked</div>
                <div className="text-red-600 text-sm">
                  Revoked on: {formatDate(credential.revokedAt)}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-outline flex-1">
              Close
            </button>
            {!credential.revoked && (
              <button
                onClick={onVerify}
                disabled={isVerifying}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isVerifying ? <Spinner size="sm" /> : 'Verify On-Chain'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
