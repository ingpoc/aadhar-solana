'use client';

import { useState } from 'react';
import { ConsentPurposeResponse } from '@/lib/api/endpoints';
import { ConsentType } from '@/types';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purpose: ConsentPurposeResponse;
  onGrant: (
    consentType: ConsentType,
    options?: {
      dataElements?: string[];
      expiresInDays?: number;
    }
  ) => Promise<boolean>;
}

export function ConsentModal({ isOpen, onClose, purpose, onGrant }: ConsentModalProps) {
  const [selectedElements, setSelectedElements] = useState<string[]>(purpose.dataElements);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGrant = async () => {
    setLoading(true);
    const success = await onGrant(purpose.type as ConsentType, {
      dataElements: selectedElements,
      expiresInDays,
    });
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  const toggleElement = (element: string) => {
    setSelectedElements((prev) =>
      prev.includes(element) ? prev.filter((e) => e !== element) : [...prev, element]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{purpose.name}</h2>
              {purpose.required && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded mt-1 inline-block">
                  Required
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-4">{purpose.description}</p>

          {/* Data Elements */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Data Elements</h3>
            <div className="space-y-2">
              {purpose.dataElements.map((element) => (
                <label key={element} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedElements.includes(element)}
                    onChange={() => toggleElement(element)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{element}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="text-blue-800 font-medium mb-1">Retention Period</p>
                <p className="text-blue-700">{purpose.retentionPeriod}</p>
                {purpose.thirdParties.length > 0 && (
                  <>
                    <p className="text-blue-800 font-medium mt-2 mb-1">Third Parties</p>
                    <p className="text-blue-700">{purpose.thirdParties.join(', ')}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mb-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consent Expiry (optional)
                </label>
                <select
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)}
                  className="input w-full"
                >
                  <option value="">No expiry</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">6 months</option>
                  <option value="365">1 year</option>
                </select>
              </div>
            )}
          </div>

          {/* Legal Notice */}
          <div className="text-xs text-gray-500 mb-4">
            <p>
              By granting consent, you agree to the processing of your personal data as described above
              in accordance with the Digital Personal Data Protection Act, 2023. You may withdraw
              your consent at any time.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} disabled={loading} className="btn-outline">
              Cancel
            </button>
            <button
              onClick={handleGrant}
              disabled={loading || selectedElements.length === 0}
              className="btn-primary"
            >
              {loading ? 'Processing...' : 'Grant Consent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsentModal;
