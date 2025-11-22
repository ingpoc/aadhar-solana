'use client';

import Link from 'next/link';
import { DataRightsRequestResponse } from '@/lib/api/endpoints';
import { DataRightsRequestStatus, DataRightsRequestType } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface RequestCardProps {
  request: DataRightsRequestResponse;
  onCancel?: (id: string) => Promise<boolean>;
  onDownload?: (id: string) => Promise<void>;
}

const STATUS_COLORS: Record<string, string> = {
  [DataRightsRequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [DataRightsRequestStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [DataRightsRequestStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [DataRightsRequestStatus.REJECTED]: 'bg-red-100 text-red-800',
  [DataRightsRequestStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
};

const TYPE_LABELS: Record<string, string> = {
  [DataRightsRequestType.ACCESS]: 'Data Access',
  [DataRightsRequestType.ERASURE]: 'Data Erasure',
  [DataRightsRequestType.CORRECTION]: 'Data Correction',
  [DataRightsRequestType.PORTABILITY]: 'Data Export',
  [DataRightsRequestType.GRIEVANCE]: 'Grievance',
};

const TYPE_ICONS: Record<string, string> = {
  [DataRightsRequestType.ACCESS]: '👁️',
  [DataRightsRequestType.ERASURE]: '🗑️',
  [DataRightsRequestType.CORRECTION]: '✏️',
  [DataRightsRequestType.PORTABILITY]: '📦',
  [DataRightsRequestType.GRIEVANCE]: '⚠️',
};

export function RequestCard({ request, onCancel, onDownload }: RequestCardProps) {
  const deadline = new Date(request.deadline);
  const now = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0 && request.status !== DataRightsRequestStatus.COMPLETED;
  const canCancel =
    request.status === DataRightsRequestStatus.PENDING ||
    request.status === DataRightsRequestStatus.IN_PROGRESS;
  const canDownload =
    request.status === DataRightsRequestStatus.COMPLETED &&
    request.requestType === DataRightsRequestType.PORTABILITY &&
    request.exportFileUrl;

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{TYPE_ICONS[request.requestType] || '📋'}</span>
            <h3 className="font-semibold text-gray-900">
              {TYPE_LABELS[request.requestType] || request.requestType}
            </h3>
            <span className={`badge ${STATUS_COLORS[request.status] || 'bg-gray-100'}`}>
              {request.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {request.dataCategories.slice(0, 4).map((category) => (
              <span
                key={category}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
              >
                {category}
              </span>
            ))}
            {request.dataCategories.length > 4 && (
              <span className="text-xs text-gray-500">
                +{request.dataCategories.length - 4} more
              </span>
            )}
          </div>

          {request.reason && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{request.reason}</p>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>Submitted: {formatDate(request.createdAt)}</p>
            <p className={isOverdue ? 'text-red-600 font-medium' : ''}>
              Deadline: {formatDate(request.deadline)}
              {daysRemaining > 0 && ` (${daysRemaining} days remaining)`}
              {isOverdue && ' (Overdue)'}
            </p>
            {request.processedAt && <p>Processed: {formatDate(request.processedAt)}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <Link
            href={`/data-rights/requests/${request.id}`}
            className="btn-outline text-xs px-3 py-1 text-center"
          >
            Details
          </Link>
          {canDownload && onDownload && (
            <button
              onClick={() => onDownload(request.id)}
              className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition-colors"
            >
              Download
            </button>
          )}
          {canCancel && onCancel && (
            <button
              onClick={() => onCancel(request.id)}
              className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress indicator for in-progress requests */}
      {request.status === DataRightsRequestStatus.IN_PROGRESS && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full w-1/2"></div>
            </div>
            <span className="text-xs text-gray-500">In Progress</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestCard;
