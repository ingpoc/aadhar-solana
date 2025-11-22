'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDataRights } from '@/hooks/useDataRights';
import { DataCategorySelector } from '@/components/data-rights';
import { DataCategory } from '@/types';

export default function AccessRequestPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { submitAccessRequest, actionLoading } = useDataRights(false);

  const [selectedCategories, setSelectedCategories] = useState<DataCategory[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) return;

    const result = await submitAccessRequest(selectedCategories, reason || undefined);
    if (result) {
      router.push('/data-rights/requests');
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Your Data</h1>
        <p className="text-gray-600">
          Request a copy of all personal data we hold about you (DPDP Act Section 11)
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">👁️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">What you&apos;ll receive</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>A summary of all personal data processed</li>
              <li>Details of processing activities</li>
              <li>Information about data sharing with third parties</li>
              <li>Response within 30 days as per DPDP Act</li>
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
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={actionLoading}
            className="input w-full"
            rows={3}
            placeholder="Explain why you're requesting access to this data..."
          />
        </div>

        {/* Terms */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p>
            By submitting this request, you confirm that you are the data principal or an
            authorized representative. False claims may result in legal action under the
            DPDP Act, 2023.
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
            disabled={actionLoading || selectedCategories.length === 0}
            className="btn-primary flex-1"
          >
            {actionLoading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
