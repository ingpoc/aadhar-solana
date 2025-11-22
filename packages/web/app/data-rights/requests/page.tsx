'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDataRights } from '@/hooks/useDataRights';
import { RequestCard } from '@/components/data-rights';
import { DataRightsRequestStatus, DataRightsRequestType } from '@/types';
import { LoadingScreen } from '@/components/Loading';

type FilterTab = 'all' | 'pending' | 'completed' | 'rejected';
type TypeFilter = 'all' | DataRightsRequestType;

export default function RequestsPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { requests, loading, cancelRequest, downloadExport, refreshRequests } = useDataRights();

  const [statusFilter, setStatusFilter] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;
  if (loading && requests.length === 0) return <LoadingScreen message="Loading requests..." />;

  const filteredRequests = requests.filter((request) => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        if (
          request.status !== DataRightsRequestStatus.PENDING &&
          request.status !== DataRightsRequestStatus.IN_PROGRESS
        ) {
          return false;
        }
      } else if (statusFilter === 'completed') {
        if (request.status !== DataRightsRequestStatus.COMPLETED) {
          return false;
        }
      } else if (statusFilter === 'rejected') {
        if (
          request.status !== DataRightsRequestStatus.REJECTED &&
          request.status !== DataRightsRequestStatus.CANCELLED
        ) {
          return false;
        }
      }
    }

    // Type filter
    if (typeFilter !== 'all' && request.requestType !== typeFilter) {
      return false;
    }

    return true;
  });

  const pendingCount = requests.filter(
    (r) =>
      r.status === DataRightsRequestStatus.PENDING ||
      r.status === DataRightsRequestStatus.IN_PROGRESS
  ).length;
  const completedCount = requests.filter(
    (r) => r.status === DataRightsRequestStatus.COMPLETED
  ).length;
  const rejectedCount = requests.filter(
    (r) =>
      r.status === DataRightsRequestStatus.REJECTED ||
      r.status === DataRightsRequestStatus.CANCELLED
  ).length;

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <button
            onClick={() => router.push('/data-rights')}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Data Rights
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Requests</h1>
          <p className="text-gray-600">Track and manage your data rights requests</p>
        </div>
        <button onClick={() => refreshRequests()} disabled={loading} className="btn-outline">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All', count: requests.length },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'completed', label: 'Completed', count: completedCount },
            { key: 'rejected', label: 'Rejected/Cancelled', count: rejectedCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as FilterTab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="input md:ml-auto md:w-48"
        >
          <option value="all">All Types</option>
          <option value={DataRightsRequestType.ACCESS}>Data Access</option>
          <option value={DataRightsRequestType.ERASURE}>Data Erasure</option>
          <option value={DataRightsRequestType.CORRECTION}>Data Correction</option>
          <option value={DataRightsRequestType.PORTABILITY}>Data Export</option>
          <option value={DataRightsRequestType.GRIEVANCE}>Grievance</option>
        </select>
      </div>

      {/* Request List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500 mb-4">No requests found matching your filters.</p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="btn-outline"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onCancel={cancelRequest}
              onDownload={downloadExport}
            />
          ))
        )}
      </div>

      {/* Info */}
      {requests.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {filteredRequests.length} of {requests.length} requests
        </div>
      )}
    </div>
  );
}
