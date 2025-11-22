'use client';

import { useState, useEffect, useCallback } from 'react';
import { dataRightsApi, DataRightsRequestResponse } from '@/lib/api/endpoints';
import {
  DataRightsRequestType,
  DataRightsRequestStatus,
  DataCategory,
} from '@/types';
import { useToast } from '@/components/Toast';

interface UseDataRightsReturn {
  requests: DataRightsRequestResponse[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  submitAccessRequest: (
    dataCategories: DataCategory[],
    reason?: string
  ) => Promise<DataRightsRequestResponse | null>;
  submitErasureRequest: (
    dataCategories: DataCategory[],
    reason: string,
    confirmation: boolean
  ) => Promise<DataRightsRequestResponse | null>;
  submitCorrectionRequest: (data: {
    field: string;
    currentValue: string;
    correctedValue: string;
    reason: string;
    supportingDocuments?: string[];
  }) => Promise<DataRightsRequestResponse | null>;
  submitPortabilityRequest: (
    dataCategories: DataCategory[],
    format: 'json' | 'csv' | 'xml'
  ) => Promise<DataRightsRequestResponse | null>;
  submitGrievance: (data: {
    category: string;
    subject: string;
    description: string;
    previousRequestId?: string;
  }) => Promise<DataRightsRequestResponse | null>;
  getRequestById: (id: string) => Promise<DataRightsRequestResponse | null>;
  downloadExport: (requestId: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<boolean>;
  refreshRequests: () => Promise<void>;
  getRequestsByType: (type: DataRightsRequestType) => DataRightsRequestResponse[];
  getRequestsByStatus: (status: DataRightsRequestStatus) => DataRightsRequestResponse[];
  pendingRequestsCount: number;
  completedRequestsCount: number;
}

export function useDataRights(autoFetch: boolean = true): UseDataRightsReturn {
  const [requests, setRequests] = useState<DataRightsRequestResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dataRightsApi.getRequests();
      setRequests(response.data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data rights requests';
      setError(message);
      console.error('Error fetching data rights requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchRequests();
    }
  }, [autoFetch, fetchRequests]);

  const submitAccessRequest = useCallback(
    async (
      dataCategories: DataCategory[],
      reason?: string
    ): Promise<DataRightsRequestResponse | null> => {
      setActionLoading(true);
      try {
        const response = await dataRightsApi.submitAccessRequest({
          dataCategories,
          reason,
        });
        const newRequest = response.data;
        setRequests((prev) => [newRequest, ...prev]);
        showToast('Data access request submitted successfully', 'success');
        return newRequest;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit access request';
        setError(message);
        showToast(message, 'error');
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const submitErasureRequest = useCallback(
    async (
      dataCategories: DataCategory[],
      reason: string,
      confirmation: boolean
    ): Promise<DataRightsRequestResponse | null> => {
      if (!confirmation) {
        showToast('Please confirm the erasure request', 'warning');
        return null;
      }

      setActionLoading(true);
      try {
        const response = await dataRightsApi.submitErasureRequest({
          dataCategories,
          reason,
          confirmation,
        });
        const newRequest = response.data;
        setRequests((prev) => [newRequest, ...prev]);
        showToast('Data erasure request submitted successfully', 'success');
        return newRequest;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit erasure request';
        setError(message);
        showToast(message, 'error');
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const submitCorrectionRequest = useCallback(
    async (data: {
      field: string;
      currentValue: string;
      correctedValue: string;
      reason: string;
      supportingDocuments?: string[];
    }): Promise<DataRightsRequestResponse | null> => {
      setActionLoading(true);
      try {
        const response = await dataRightsApi.submitCorrectionRequest(data);
        const newRequest = response.data;
        setRequests((prev) => [newRequest, ...prev]);
        showToast('Data correction request submitted successfully', 'success');
        return newRequest;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit correction request';
        setError(message);
        showToast(message, 'error');
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const submitPortabilityRequest = useCallback(
    async (
      dataCategories: DataCategory[],
      format: 'json' | 'csv' | 'xml'
    ): Promise<DataRightsRequestResponse | null> => {
      setActionLoading(true);
      try {
        const response = await dataRightsApi.submitPortabilityRequest({
          dataCategories,
          format,
        });
        const newRequest = response.data;
        setRequests((prev) => [newRequest, ...prev]);
        showToast('Data portability request submitted successfully', 'success');
        return newRequest;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit portability request';
        setError(message);
        showToast(message, 'error');
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const submitGrievance = useCallback(
    async (data: {
      category: string;
      subject: string;
      description: string;
      previousRequestId?: string;
    }): Promise<DataRightsRequestResponse | null> => {
      setActionLoading(true);
      try {
        const response = await dataRightsApi.submitGrievance(data);
        const newRequest = response.data;
        setRequests((prev) => [newRequest, ...prev]);
        showToast('Grievance submitted successfully', 'success');
        return newRequest;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit grievance';
        setError(message);
        showToast(message, 'error');
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const getRequestById = useCallback(
    async (id: string): Promise<DataRightsRequestResponse | null> => {
      try {
        const response = await dataRightsApi.getRequestById(id);
        return response.data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch request';
        setError(message);
        return null;
      }
    },
    []
  );

  const downloadExport = useCallback(
    async (requestId: string): Promise<void> => {
      setActionLoading(true);
      try {
        const response = await dataRightsApi.downloadExport(requestId);
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${requestId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Export downloaded successfully', 'success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to download export';
        setError(message);
        showToast(message, 'error');
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const cancelRequest = useCallback(
    async (id: string): Promise<boolean> => {
      setActionLoading(true);
      try {
        await dataRightsApi.cancelRequest(id);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: DataRightsRequestStatus.CANCELLED } : r
          )
        );
        showToast('Request cancelled successfully', 'success');
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to cancel request';
        setError(message);
        showToast(message, 'error');
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [showToast]
  );

  const getRequestsByType = useCallback(
    (type: DataRightsRequestType): DataRightsRequestResponse[] => {
      return requests.filter((r) => r.requestType === type);
    },
    [requests]
  );

  const getRequestsByStatus = useCallback(
    (status: DataRightsRequestStatus): DataRightsRequestResponse[] => {
      return requests.filter((r) => r.status === status);
    },
    [requests]
  );

  const pendingRequestsCount = requests.filter(
    (r) => r.status === DataRightsRequestStatus.PENDING || r.status === DataRightsRequestStatus.IN_PROGRESS
  ).length;

  const completedRequestsCount = requests.filter(
    (r) => r.status === DataRightsRequestStatus.COMPLETED
  ).length;

  return {
    requests,
    loading,
    actionLoading,
    error,
    submitAccessRequest,
    submitErasureRequest,
    submitCorrectionRequest,
    submitPortabilityRequest,
    submitGrievance,
    getRequestById,
    downloadExport,
    cancelRequest,
    refreshRequests: fetchRequests,
    getRequestsByType,
    getRequestsByStatus,
    pendingRequestsCount,
    completedRequestsCount,
  };
}

export default useDataRights;
