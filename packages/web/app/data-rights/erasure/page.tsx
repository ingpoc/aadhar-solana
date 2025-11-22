'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDataRights } from '@/hooks/useDataRights';
import { DataCategorySelector } from '@/components/data-rights';
import { DataCategory } from '@/types';

export default function ErasureRequestPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { submitErasureRequest, actionLoading } = useDataRights(false);

  const [selectedCategories, setSelectedCategories] = useState<DataCategory[]>([]);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [understandConsequences, setUnderstandConsequences] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0 || !reason || !confirmation || !understandConsequences) return;

    const result = await submitErasureRequest(selectedCategories, reason, confirmation);
    if (result) {
      router.push('/data-rights/requests');
    }
  };

  const canSubmit =
    selectedCategories.length > 0 &&
    reason.length > 10 &&
    confirmation &&
    understandConsequences &&
    !actionLoading;

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Erase Your Data</h1>
        <p className="text-gray-600">
          Request deletion of your personal data (Right to be Forgotten - DPDP Act Section 12)
        </p>
      </div>

      {/* Warning Box */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Important Warning</h3>
            <ul className="text-sm text-red-800 space-y-1">
              <li>Data erasure is permanent and cannot be undone</li>
              <li>Some data may be retained for legal compliance</li>
              <li>Erasure may affect your ability to use certain services</li>
              <li>On-chain data cannot be erased due to blockchain immutability</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DataCategorySelector
          selected={selectedCategories}
          onChange={setSelectedCategories}
          disabled={actionLoading}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Erasure <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={actionLoading}
            className="input w-full"
            rows={3}
            required
            minLength={10}
            placeholder="Please explain why you want this data erased..."
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 10 characters required</p>
        </div>

        {/* Consequences Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Consequences of Data Erasure</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>Your identity records will be permanently deleted</li>
            <li>Active credentials may become invalid</li>
            <li>Reputation score will be reset</li>
            <li>Staking rewards may be forfeited</li>
            <li>You will need to re-verify if you create a new identity</li>
          </ul>
        </div>

        {/* Confirmations */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={understandConsequences}
              onChange={(e) => setUnderstandConsequences(e.target.checked)}
              disabled={actionLoading}
              className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              I understand the consequences of data erasure and that this action cannot be undone
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmation}
              onChange={(e) => setConfirmation(e.target.checked)}
              disabled={actionLoading}
              className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              I confirm that I want to proceed with the erasure of the selected data categories
            </span>
          </label>
        </div>

        {/* Legal Notice */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p>
            Note: Certain data may be retained as required by law, including transaction records
            for tax purposes and data necessary for legal proceedings. On-chain data stored on the
            Solana blockchain cannot be erased due to its immutable nature.
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
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading ? 'Submitting...' : 'Request Erasure'}
          </button>
        </div>
      </form>
    </div>
  );
}
