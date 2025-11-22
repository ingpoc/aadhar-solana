'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDataRights } from '@/hooks/useDataRights';

const CORRECTABLE_FIELDS = [
  { value: 'full_name', label: 'Full Name' },
  { value: 'date_of_birth', label: 'Date of Birth' },
  { value: 'address', label: 'Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email Address' },
  { value: 'other', label: 'Other' },
];

export default function CorrectionRequestPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { submitCorrectionRequest, actionLoading } = useDataRights(false);

  const [field, setField] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [correctedValue, setCorrectedValue] = useState('');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!field || !currentValue || !correctedValue || !reason || !confirmation) return;

    const result = await submitCorrectionRequest({
      field,
      currentValue,
      correctedValue,
      reason,
    });
    if (result) {
      router.push('/data-rights/requests');
    }
  };

  const canSubmit =
    field && currentValue && correctedValue && reason && confirmation && !actionLoading;

  return (
    <div className="container-custom py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Correct Your Data</h1>
        <p className="text-gray-600">
          Request corrections to inaccurate or incomplete personal data (DPDP Act Section 12)
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✏️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Correction Process</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>Your request will be reviewed within 30 days</li>
              <li>You may be asked to provide supporting documents</li>
              <li>Once approved, all records will be updated</li>
              <li>You&apos;ll be notified of the outcome via email</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field to Correct <span className="text-red-500">*</span>
          </label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            disabled={actionLoading}
            required
            className="input w-full"
          >
            <option value="">Select a field...</option>
            {CORRECTABLE_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current (Incorrect) Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            disabled={actionLoading}
            required
            className="input w-full"
            placeholder="Enter the current incorrect value"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Corrected Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={correctedValue}
            onChange={(e) => setCorrectedValue(e.target.value)}
            disabled={actionLoading}
            required
            className="input w-full"
            placeholder="Enter the correct value"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Correction <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={actionLoading}
            className="input w-full"
            rows={3}
            required
            placeholder="Explain why this data needs to be corrected..."
          />
        </div>

        {/* Confirmation */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmation}
            onChange={(e) => setConfirmation(e.target.checked)}
            disabled={actionLoading}
            className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">
            I confirm that the corrected information I have provided is accurate and I may be
            required to provide supporting documentation
          </span>
        </label>

        {/* Legal Notice */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p>
            Note: Providing false information in a correction request may result in legal action.
            Some fields may require verification before correction can be processed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={actionLoading}
            className="btn-outline flex-1"
          >
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className="btn-primary flex-1">
            {actionLoading ? 'Submitting...' : 'Submit Correction'}
          </button>
        </div>
      </form>
    </div>
  );
}
