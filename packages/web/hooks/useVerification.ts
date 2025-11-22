'use client';

import { useState, useCallback } from 'react';
import { verificationApi, VerificationRequest, extractApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface AadhaarVerificationState {
  step: 'input' | 'otp' | 'complete';
  requestId?: string;
  txnId?: string;
}

export function useVerification() {
  const { identity, refreshIdentity } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aadhaarState, setAadhaarState] = useState<AadhaarVerificationState>({ step: 'input' });

  // Aadhaar verification - step 1: initiate OTP
  const initiateAadhaar = useCallback(async (aadhaarNumber: string, consent: boolean) => {
    if (!identity?.id) throw new Error('Identity not found');
    if (!consent) throw new Error('Consent is required');

    setLoading(true);
    setError(null);

    try {
      const { data } = await verificationApi.initiateAadhaar({
        identityId: identity.id,
        aadhaarNumber,
        consent,
      });

      setAadhaarState({
        step: 'otp',
        requestId: data.requestId,
        txnId: data.txnId,
      });

      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [identity?.id]);

  // Aadhaar verification - step 2: verify OTP
  const verifyAadhaarOTP = useCallback(async (otp: string) => {
    if (!aadhaarState.requestId || !aadhaarState.txnId) {
      throw new Error('Please initiate verification first');
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await verificationApi.verifyAadhaarOTP({
        requestId: aadhaarState.requestId,
        otp,
        txnId: aadhaarState.txnId,
      });

      setAadhaarState({ step: 'complete' });

      // Refresh identity to get updated verification status
      await refreshIdentity();

      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [aadhaarState.requestId, aadhaarState.txnId, refreshIdentity]);

  // Reset Aadhaar flow
  const resetAadhaar = useCallback(() => {
    setAadhaarState({ step: 'input' });
    setError(null);
  }, []);

  // PAN verification
  const verifyPAN = useCallback(async (
    panNumber: string,
    fullName: string,
    dateOfBirth?: string
  ) => {
    if (!identity?.id) throw new Error('Identity not found');

    setLoading(true);
    setError(null);

    try {
      const { data } = await verificationApi.verifyPAN({
        identityId: identity.id,
        panNumber,
        fullName,
        dateOfBirth,
      });

      // Refresh identity to get updated verification status
      await refreshIdentity();

      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [identity?.id, refreshIdentity]);

  // Check verification status
  const checkStatus = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await verificationApi.getStatus(requestId);
      return data;
    } catch (err) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all verifications for identity
  const getVerifications = useCallback(async () => {
    if (!identity?.id) return [];

    try {
      const { data } = await verificationApi.getByIdentity(identity.id);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [identity?.id]);

  return {
    loading,
    error,
    aadhaarState,
    initiateAadhaar,
    verifyAadhaarOTP,
    resetAadhaar,
    verifyPAN,
    checkStatus,
    getVerifications,
  };
}
