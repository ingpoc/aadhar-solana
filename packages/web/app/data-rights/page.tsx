'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDataRights } from '@/hooks/useDataRights';
import { RequestCard } from '@/components/data-rights';
import { LoadingScreen } from '@/components/Loading';

interface DataRightCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  deadline: string;
  color: string;
}

function DataRightCard({ title, description, icon, href, deadline, color }: DataRightCardProps) {
  return (
    <Link
      href={href}
      className={`card p-6 hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 ${color}`}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Response within {deadline}
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

export default function DataRightsPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const {
    requests,
    loading,
    cancelRequest,
    downloadExport,
    pendingRequestsCount,
    completedRequestsCount,
  } = useDataRights();

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;
  if (loading && requests.length === 0) return <LoadingScreen message="Loading data rights..." />;

  const recentRequests = requests.slice(0, 3);

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Data Rights</h1>
        <p className="text-gray-600">
          Exercise your rights under the Digital Personal Data Protection Act, 2023
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-sm text-gray-500">Pending Requests</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingRequestsCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600">{completedRequestsCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
        </div>
      </div>

      {/* Data Rights Options */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Submit a Request</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataRightCard
            title="Access Your Data"
            description="Request a copy of all personal data we hold about you"
            icon="👁️"
            href="/data-rights/access"
            deadline="30 days"
            color="border-blue-500"
          />
          <DataRightCard
            title="Erase Your Data"
            description="Request deletion of your personal data (right to be forgotten)"
            icon="🗑️"
            href="/data-rights/erasure"
            deadline="30 days"
            color="border-red-500"
          />
          <DataRightCard
            title="Correct Your Data"
            description="Request corrections to inaccurate or incomplete personal data"
            icon="✏️"
            href="/data-rights/correction"
            deadline="30 days"
            color="border-yellow-500"
          />
          <DataRightCard
            title="Export Your Data"
            description="Download your data in a portable format (JSON, CSV, or XML)"
            icon="📦"
            href="/data-rights/portability"
            deadline="30 days"
            color="border-green-500"
          />
          <DataRightCard
            title="File a Grievance"
            description="Submit a complaint to the Data Protection Board of India"
            icon="⚠️"
            href="/data-rights/grievance"
            deadline="30 days"
            color="border-orange-500"
          />
        </div>
      </div>

      {/* Recent Requests */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Requests</h2>
          {requests.length > 3 && (
            <Link href="/data-rights/requests" className="text-primary hover:underline text-sm">
              View All ({requests.length})
            </Link>
          )}
        </div>

        {recentRequests.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500 mb-4">You haven&apos;t submitted any requests yet.</p>
            <p className="text-sm text-gray-400">
              Use the options above to exercise your data rights.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onCancel={cancelRequest}
                onDownload={downloadExport}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          Understanding Your Rights (DPDP Act 2023)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium mb-1">Right to Access (Section 11)</p>
            <p className="text-blue-700">
              You can request a summary of all personal data processed and the processing
              activities.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Right to Correction & Erasure (Section 12)</p>
            <p className="text-blue-700">
              You can request correction of inaccurate data or erasure of data no longer necessary.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Right to Grievance Redressal (Section 13)</p>
            <p className="text-blue-700">
              You can file complaints with the Data Protection Board if your rights are violated.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Response Timeline</p>
            <p className="text-blue-700">
              All requests must be responded to within 30 days as per DPDP Act requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
