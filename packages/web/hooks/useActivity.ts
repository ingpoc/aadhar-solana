'use client';

import { useState, useCallback } from 'react';
import { activityApi, ActivityLogResponse, AuditLogResponse } from '@/lib/api/endpoints';
import { useToast } from '@/components/Toast';

interface UseActivityReturn {
  recentActivity: ActivityLogResponse[];
  auditLogs: AuditLogResponse[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchRecentActivity: (limit?: number) => Promise<void>;
  fetchAuditLogs: (params?: {
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  exportAuditLogs: (params: {
    startDate: string;
    endDate: string;
    format: 'json' | 'csv';
  }) => Promise<void>;
}

export function useActivity(): UseActivityReturn {
  const [recentActivity, setRecentActivity] = useState<ActivityLogResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchRecentActivity = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await activityApi.getRecentActivity({ limit });
      setRecentActivity(response.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activity';
      setError(message);
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (params?: {
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await activityApi.getAuditLogs(params);
      setAuditLogs(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setError(message);
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportAuditLogs = useCallback(async (params: {
    startDate: string;
    endDate: string;
    format: 'json' | 'csv';
  }) => {
    setLoading(true);
    try {
      const response = await activityApi.exportAuditLogs(params);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${params.startDate}-${params.endDate}.${params.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Audit logs exported successfully', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export audit logs';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  return {
    recentActivity,
    auditLogs,
    total,
    loading,
    error,
    fetchRecentActivity,
    fetchAuditLogs,
    exportAuditLogs,
  };
}

export default useActivity;
