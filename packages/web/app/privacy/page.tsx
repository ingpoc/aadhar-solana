'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePrivacy } from '@/hooks/usePrivacy';
import { LoadingScreen } from '@/components/Loading';
import { formatDate } from '@/lib/utils';

export default function PrivacyPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { currentNotice, hasAcknowledged, loading, acknowledgeNotice } = usePrivacy();

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;
  if (loading) return <LoadingScreen message="Loading privacy information..." />;

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Center</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Understand how we protect and process your personal data
        </p>
      </div>

      {/* Acknowledgment Status */}
      {currentNotice && (
        <div className={`card p-6 mb-8 border-l-4 ${
          hasAcknowledged ? 'border-green-500' : 'border-yellow-500'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold mb-2">Privacy Notice Status</h2>
              <p className="text-gray-600 mb-2">
                Current Version: <span className="font-medium">{currentNotice.version}</span>
              </p>
              <p className="text-sm text-gray-500">
                Effective from: {formatDate(currentNotice.effectiveDate)}
              </p>
            </div>
            <div className="text-right">
              {hasAcknowledged ? (
                <span className="badge bg-green-100 text-green-800">Acknowledged</span>
              ) : (
                <button
                  onClick={() => currentNotice && acknowledgeNotice(currentNotice.id)}
                  className="btn-primary"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/consent" className="card p-4 hover:shadow-md transition-shadow">
          <span className="text-2xl mb-2 block">📝</span>
          <h3 className="font-semibold">Manage Consents</h3>
          <p className="text-sm text-gray-600">Review and manage your data processing consents</p>
        </Link>
        <Link href="/data-rights" className="card p-4 hover:shadow-md transition-shadow">
          <span className="text-2xl mb-2 block">📋</span>
          <h3 className="font-semibold">Your Data Rights</h3>
          <p className="text-sm text-gray-600">Access, export, or delete your personal data</p>
        </Link>
        <Link href="/activity" className="card p-4 hover:shadow-md transition-shadow">
          <span className="text-2xl mb-2 block">📊</span>
          <h3 className="font-semibold">Activity Log</h3>
          <p className="text-sm text-gray-600">View how your data has been accessed</p>
        </Link>
      </div>

      {/* Privacy Notice Content */}
      {currentNotice?.content && (
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Privacy Notice</h2>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
            <p className="text-gray-600">{currentNotice.content.summary}</p>
          </div>

          {/* Data We Collect */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Data We Collect</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {currentNotice.content.dataCollected.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Purposes */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">How We Use Your Data</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {currentNotice.content.purposes.map((purpose, i) => (
                <li key={i}>{purpose}</li>
              ))}
            </ul>
          </div>

          {/* Retention Periods */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Data Retention</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2">Data Type</th>
                    <th className="pb-2">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  {Object.entries(currentNotice.content.retentionPeriods).map(([type, period]) => (
                    <tr key={type}>
                      <td className="py-1 capitalize">{type.replace(/_/g, ' ')}</td>
                      <td className="py-1">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Your Rights */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Your Rights</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {currentNotice.content.rights.map((right, i) => (
                <li key={i}>{right}</li>
              ))}
            </ul>
          </div>

          {/* Third Parties */}
          {currentNotice.content.thirdParties.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Third Party Sharing</h3>
              <p className="text-gray-600 mb-2">
                We may share your data with the following types of third parties:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {currentNotice.content.thirdParties.map((party, i) => (
                  <li key={i}>{party}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Contact Our Data Protection Officer</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <strong>Name:</strong> {currentNotice.content.contact.dpo}
              </p>
              <p>
                <strong>Email:</strong>{' '}
                <a
                  href={`mailto:${currentNotice.content.contact.email}`}
                  className="underline"
                >
                  {currentNotice.content.contact.email}
                </a>
              </p>
              <p>
                <strong>Address:</strong> {currentNotice.content.contact.address}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Information */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Compliance Framework</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Digital Personal Data Protection Act, 2023
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AadhaarChain fully complies with India&apos;s DPDP Act, ensuring your personal
              data is processed lawfully, fairly, and transparently.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Aadhaar Act, 2016
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We adhere to all requirements of the Aadhaar Act, including mandatory
              masking, purpose limitation, and 5-year audit retention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
