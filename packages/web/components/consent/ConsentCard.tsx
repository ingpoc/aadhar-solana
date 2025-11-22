'use client';

import { useState } from 'react';
import { ConsentRecordResponse } from '@/lib/api/endpoints';
import { ConsentStatus } from '@/types';
import { formatDate } from '@/lib/utils';

interface ConsentCardProps {
  consent: ConsentRecordResponse;
  onRevoke: (consentId: string, reason?: string) => Promise<boolean>;
  onViewReceipt: (consentId: string) => Promise<void>;
}

const STATUS_COLORS: Record<string, string> = {
  [ConsentStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [ConsentStatus.REVOKED]: 'bg-red-100 text-red-800',
  [ConsentStatus.EXPIRED]: 'bg-gray-100 text-gray-800',
  [ConsentStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
};

const PURPOSE_LABELS: Record<string, string> = {
  'identity.creation': 'Identity Creation',
  'pii.aadhaar.verification': 'Aadhaar Verification',
  'pii.aadhaar.storage': 'Aadhaar Storage',
  'pii.pan.verification': 'PAN Verification',
  'pii.pan.storage': 'PAN Storage',
  'credential.issuance': 'Credential Issuance',
  'credential.sharing': 'Credential Sharing',
  'reputation.calculation': 'Reputation Calculation',
  'staking.participation': 'Staking Participation',
  'marketing.communications': 'Marketing Communications',
  'analytics.collection': 'Analytics Collection',
  'third_party.sharing': 'Third Party Sharing',
  'cross_border.transfer': 'Cross-Border Transfer',
  'biometric.processing': 'Biometric Processing',
  'automated.decisions': 'Automated Decisions',
  'research.purposes': 'Research Purposes',
  'government.verification': 'Government Verification',
  'data.enrichment': 'Data Enrichment',
};

export function ConsentCard({ consent, onRevoke, onViewReceipt }: ConsentCardProps) {
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isActive = consent.status === ConsentStatus.ACTIVE;
  const purposeLabel = PURPOSE_LABELS[consent.consentType] || consent.consentType;

  const handleRevoke = async () => {
    setLoading(true);
    const success = await onRevoke(consent.id, revokeReason);
    setLoading(false);
    if (success) {
      setShowRevokeModal(false);
      setRevokeReason('');
    }
  };

  const handleViewReceipt = async () => {
    setLoading(true);
    await onViewReceipt(consent.id);
    setLoading(false);
  };

  return (
    <>
      <div className="card p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{purposeLabel}</h3>
              <span className={`badge ${STATUS_COLORS[consent.status] || 'bg-gray-100'}`}>
                {consent.status}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-2">{consent.purpose}</p>

            <div className="flex flex-wrap gap-1 mb-3">
              {consent.dataElements.slice(0, 4).map((element) => (
                <span
                  key={element}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                >
                  {element}
                </span>
              ))}
              {consent.dataElements.length > 4 && (
                <span className="text-xs text-gray-500">
                  +{consent.dataElements.length - 4} more
                </span>
              )}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>Granted: {formatDate(consent.grantedAt)}</p>
              {consent.expiresAt && <p>Expires: {formatDate(consent.expiresAt)}</p>}
              {consent.revokedAt && (
                <p className="text-red-600">Revoked: {formatDate(consent.revokedAt)}</p>
              )}
              {consent.revokedReason && (
                <p className="text-red-600">Reason: {consent.revokedReason}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={handleViewReceipt}
              disabled={loading}
              className="btn-outline text-xs px-3 py-1"
            >
              Receipt
            </button>
            {isActive && (
              <button
                onClick={() => setShowRevokeModal(true)}
                disabled={loading}
                className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition-colors"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Revoke Consent</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to revoke consent for &quot;{purposeLabel}&quot;?
              This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Enter reason for revoking consent..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRevokeModal(false)}
                disabled={loading}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                {loading ? 'Revoking...' : 'Revoke Consent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ConsentCard;
