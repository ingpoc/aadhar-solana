'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDataRights } from '@/hooks/useDataRights';
import { DataCategorySelector } from '@/components/data-rights';
import { DataCategory } from '@/types';

type ExportFormat = 'json' | 'csv' | 'xml';

const FORMAT_INFO: Record<ExportFormat, { label: string; description: string; icon: string }> = {
  json: {
    label: 'JSON',
    description: 'Machine-readable format, ideal for developers and data import',
    icon: '{ }',
  },
  csv: {
    label: 'CSV',
    description: 'Spreadsheet format, easy to open in Excel or Google Sheets',
    icon: '📊',
  },
  xml: {
    label: 'XML',
    description: 'Structured format, compatible with many enterprise systems',
    icon: '📄',
  },
};

export default function PortabilityRequestPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { submitPortabilityRequest, actionLoading } = useDataRights(false);

  const [selectedCategories, setSelectedCategories] = useState<DataCategory[]>([]);
  const [format, setFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) return;

    const result = await submitPortabilityRequest(selectedCategories, format);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Export Your Data</h1>
        <p className="text-gray-600">
          Download your data in a portable format to transfer to another service
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <h3 className="font-semibold text-green-900 mb-1">Data Portability</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>Export your data in standard, machine-readable formats</li>
              <li>Use your data with other services</li>
              <li>Download link will be available for 7 days</li>
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

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((fmt) => {
              const info = FORMAT_INFO[fmt];
              const isSelected = format === fmt;

              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  disabled={actionLoading}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{info.icon}</div>
                  <div className="font-medium text-gray-900">{info.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{info.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* What's Included */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">What&apos;s Included in Your Export</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>All data from selected categories</li>
            <li>Associated metadata and timestamps</li>
            <li>Data schema documentation (in JSON format)</li>
            <li>Export manifest with data descriptions</li>
          </ul>
        </div>

        {/* Legal Notice */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p>
            Note: Some data may be excluded from export due to privacy regulations or third-party
            restrictions. On-chain data references will be included but actual blockchain data
            must be retrieved from Solana directly.
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
            {actionLoading ? 'Submitting...' : 'Request Export'}
          </button>
        </div>
      </form>
    </div>
  );
}
