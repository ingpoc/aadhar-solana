'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useActivity } from '@/hooks/useActivity';
import { LoadingScreen } from '@/components/Loading';
import { formatDate, formatRelativeTime } from '@/lib/utils';

const ACTION_ICONS: Record<string, string> = {
  login: '🔐',
  logout: '🚪',
  identity_created: '🆔',
  verification_initiated: '📝',
  verification_completed: '✅',
  consent_granted: '✓',
  consent_revoked: '✗',
  credential_issued: '📜',
  stake_deposited: '💰',
  stake_withdrawn: '💸',
  data_accessed: '👁️',
  data_exported: '📦',
  settings_updated: '⚙️',
  default: '📋',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-800',
  logout: 'bg-gray-100 text-gray-800',
  identity_created: 'bg-green-100 text-green-800',
  verification_completed: 'bg-green-100 text-green-800',
  consent_granted: 'bg-green-100 text-green-800',
  consent_revoked: 'bg-red-100 text-red-800',
  stake_deposited: 'bg-yellow-100 text-yellow-800',
  data_accessed: 'bg-purple-100 text-purple-800',
  default: 'bg-gray-100 text-gray-800',
};

export default function ActivityPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { auditLogs, total, loading, fetchAuditLogs, exportAuditLogs } = useActivity();

  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (connected) {
      fetchAuditLogs({
        action: actionFilter || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        page,
        limit,
      });
    }
  }, [connected, actionFilter, dateRange, page, fetchAuditLogs]);

  if (!connected) return null;
  if (loading && auditLogs.length === 0) return <LoadingScreen message="Loading activity..." />;

  const handleExport = async (format: 'json' | 'csv') => {
    if (!dateRange.start || !dateRange.end) {
      alert('Please select a date range to export');
      return;
    }
    await exportAuditLogs({
      startDate: dateRange.start,
      endDate: dateRange.end,
      format,
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Log</h1>
          <p className="text-gray-600">
            View your account activity and audit trail
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="btn-outline text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="btn-outline text-sm"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="identity_created">Identity Created</option>
              <option value="verification_completed">Verification</option>
              <option value="consent_granted">Consent Granted</option>
              <option value="consent_revoked">Consent Revoked</option>
              <option value="credential_issued">Credential Issued</option>
              <option value="stake_deposited">Stake Deposited</option>
              <option value="data_accessed">Data Accessed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, start: e.target.value }));
                setPage(1);
              }}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, end: e.target.value }));
                setPage(1);
              }}
              className="input"
            />
          </div>

          {(actionFilter || dateRange.start || dateRange.end) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setActionFilter('');
                  setDateRange({ start: '', end: '' });
                  setPage(1);
                }}
                className="text-sm text-primary hover:underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {auditLogs.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500">No activity found for the selected filters.</p>
          </div>
        ) : (
          auditLogs.map((log) => {
            const icon = ACTION_ICONS[log.action] || ACTION_ICONS.default;
            const colorClass = ACTION_COLORS[log.action] || ACTION_COLORS.default;

            return (
              <div key={log.id} className="card p-4">
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${colorClass}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className={`badge ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-gray-900">
                      {log.resource}
                      {log.resourceId && (
                        <span className="text-gray-500"> #{log.resourceId.slice(0, 8)}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{formatDate(log.timestamp)}</span>
                      <span>{formatRelativeTime(log.timestamp)}</span>
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-mono">
                      {log.hash.slice(0, 16)}...
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-outline"
          >
            Next
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Activity Logs</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>All activities are logged with cryptographic hashes for integrity</li>
          <li>Logs are retained for 5 years as per compliance requirements</li>
          <li>You can export your activity history at any time</li>
          <li>Suspicious activity? Contact support immediately</li>
        </ul>
      </div>
    </div>
  );
}
