'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDataRights } from '@/hooks/useDataRights';

const GRIEVANCE_CATEGORIES = [
  { value: 'consent_violation', label: 'Consent Violation', description: 'Data processed without valid consent' },
  { value: 'access_denial', label: 'Access Request Denial', description: 'Access to personal data was denied' },
  { value: 'erasure_failure', label: 'Erasure Request Failure', description: 'Data was not erased as requested' },
  { value: 'correction_denial', label: 'Correction Request Denial', description: 'Data correction was not processed' },
  { value: 'security_breach', label: 'Security Breach', description: 'Personal data was compromised' },
  { value: 'unauthorized_sharing', label: 'Unauthorized Data Sharing', description: 'Data shared without authorization' },
  { value: 'excessive_data', label: 'Excessive Data Collection', description: 'More data collected than necessary' },
  { value: 'other', label: 'Other', description: 'Other data protection concern' },
];

export default function GrievancePage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { submitGrievance, actionLoading } = useDataRights(false);

  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [previousRequestId, setPreviousRequestId] = useState('');
  const [acknowledgment, setAcknowledgment] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject || !description || !acknowledgment) return;

    const result = await submitGrievance({
      category,
      subject,
      description,
      previousRequestId: previousRequestId || undefined,
    });
    if (result) {
      router.push('/data-rights/requests');
    }
  };

  const canSubmit =
    category && subject && description.length >= 50 && acknowledgment && !actionLoading;

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">File a Grievance</h1>
        <p className="text-gray-600">
          Submit a complaint to the Data Protection Board of India (DPDP Act Section 13)
        </p>
      </div>

      {/* Warning Box */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-orange-900 mb-1">Before Filing a Grievance</h3>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>Ensure you have first submitted a request through our data rights portal</li>
              <li>Allow 30 days for processing before escalating</li>
              <li>Gather all relevant documentation and reference numbers</li>
              <li>False or frivolous complaints may have legal consequences</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Grievance Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GRIEVANCE_CATEGORIES.map((cat) => {
              const isSelected = category === cat.value;

              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  disabled={actionLoading}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{cat.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{cat.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={actionLoading}
            required
            maxLength={200}
            className="input w-full"
            placeholder="Brief description of your grievance"
          />
          <p className="text-xs text-gray-500 mt-1">{subject.length}/200 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={actionLoading}
            className="input w-full"
            rows={6}
            required
            minLength={50}
            placeholder="Provide a detailed description of your grievance, including dates, actions taken, and any relevant reference numbers..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {description.length}/50 minimum characters
            {description.length < 50 && ` (${50 - description.length} more required)`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Previous Request ID (optional)
          </label>
          <input
            type="text"
            value={previousRequestId}
            onChange={(e) => setPreviousRequestId(e.target.value)}
            disabled={actionLoading}
            className="input w-full"
            placeholder="Enter the ID of a related data rights request"
          />
          <p className="text-xs text-gray-500 mt-1">
            If this grievance relates to a previous request, enter the request ID
          </p>
        </div>

        {/* DPB Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Data Protection Board of India
          </h4>
          <p className="text-sm text-blue-800 mb-2">
            Your grievance will be submitted to the Data Protection Board of India as established
            under the Digital Personal Data Protection Act, 2023.
          </p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>The Board will acknowledge receipt within 7 days</li>
            <li>Investigation may take up to 30 days</li>
            <li>You may be contacted for additional information</li>
          </ul>
        </div>

        {/* Acknowledgment */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledgment}
            onChange={(e) => setAcknowledgment(e.target.checked)}
            disabled={actionLoading}
            className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">
            I acknowledge that filing a false or frivolous grievance may result in penalties
            under the DPDP Act, 2023. I confirm that the information provided is true and
            accurate to the best of my knowledge.
          </span>
        </label>

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
            className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading ? 'Submitting...' : 'Submit Grievance'}
          </button>
        </div>
      </form>
    </div>
  );
}
