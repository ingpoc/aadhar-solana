import { api } from './apiClient';

export interface InitiateAadhaarResponse {
  requestId: string;
  txnId: string;
  message: string;
}

export interface VerificationResult {
  id: string;
  identityId: string;
  verificationType: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  proofHash?: string;
  createdAt: string;
  completedAt?: string;
}

export const verificationService = {
  // Initiate Aadhaar verification (sends OTP)
  initiateAadhaar: async (
    identityId: string,
    aadhaarNumber: string,
    consent: boolean
  ): Promise<InitiateAadhaarResponse> => {
    const { data } = await api.post<InitiateAadhaarResponse>('/verification/aadhaar/initiate', {
      identityId,
      aadhaarNumber,
      consent,
    });
    return data;
  },

  // Verify Aadhaar OTP
  verifyAadhaarOTP: async (
    requestId: string,
    otp: string,
    txnId: string
  ): Promise<VerificationResult> => {
    const { data } = await api.post<VerificationResult>('/verification/aadhaar/verify', {
      requestId,
      otp,
      txnId,
    });
    return data;
  },

  // Verify PAN
  verifyPAN: async (
    identityId: string,
    panNumber: string,
    fullName: string,
    dateOfBirth?: string
  ): Promise<VerificationResult> => {
    const { data } = await api.post<VerificationResult>('/verification/pan', {
      identityId,
      panNumber,
      fullName,
      dateOfBirth,
    });
    return data;
  },

  // Check verification status
  getStatus: async (requestId: string): Promise<VerificationResult> => {
    const { data } = await api.get<VerificationResult>(`/verification/${requestId}`);
    return data;
  },

  // Get all verifications for identity
  getByIdentity: async (identityId: string): Promise<VerificationResult[]> => {
    const { data } = await api.get<VerificationResult[]>(`/verification/identity/${identityId}`);
    return Array.isArray(data) ? data : [];
  },

  // Validate Aadhaar number format (Verhoeff algorithm)
  validateAadhaarFormat: (aadhaar: string): boolean => {
    if (!/^\d{12}$/.test(aadhaar)) return false;

    // Verhoeff algorithm for Aadhaar validation
    const d = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ];

    const p = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    ];

    let c = 0;
    const reversed = aadhaar.split('').reverse();
    for (let i = 0; i < reversed.length; i++) {
      c = d[c][p[i % 8][parseInt(reversed[i], 10)]];
    }
    return c === 0;
  },

  // Validate PAN format
  validatePANFormat: (pan: string): boolean => {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan);
  },
};
