import axios from 'axios';
import { PublicKey } from '@solana/web3.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return address.length === 44;
  } catch {
    return false;
  }
};

export const identityApi = {
  create: (data: {
    publicKey: string;
    signedTransaction: string;
    metadata?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }) => api.post('/identity', data),

  prepareTransaction: (data: {
    publicKey: string;
    metadata?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }) => api.post('/identity/prepare-transaction', data),

  storeAadhaarData: (data: {
    publicKey: string;
    aadhaarNumber: string;
    otp: string;
  }) => api.post('/identity/store-aadhaar-data', data),

  storePANData: (data: {
    publicKey: string;
    panNumber: string;
    fullName: string;
    dob: string;
  }) => api.post('/identity/store-pan-data', data),

  storeITRData: (data: {
    publicKey: string;
    panNumber: string;
    financialYear: string;
    acknowledgementNumber: string;
  }) => api.post('/identity/store-itr-data', data),

  getVerificationStatus: (publicKey: string) => api.get(`/identity/verification-status/${publicKey}`),

  grantAccess: (data: {
    publicKey: string;
    serviceName: string;
    purpose: string;
    fields: string[];
    expiryDays: number;
  }) => api.post('/identity/grant-access', data),

  listAccessGrants: (publicKey: string) => api.get(`/identity/access-grants/${publicKey}`),

  revokeAccess: (data: {
    publicKey: string;
    grantId: string;
  }) => api.post('/identity/revoke-access', data),

  getById: (id: string) => api.get(`/identity/${id}`),

  update: (id: string, data: Partial<{
    metadataUri?: string;
    recoveryKeys?: string[];
  }>) => api.put(`/identity/${id}`, data),
};

export const verificationApi = {
  verifyAadhaar: (data: {
    identityId: string;
    aadhaarNumber: string;
    consent: boolean;
  }) => api.post('/verification/aadhaar', data),

  verifyPAN: (data: {
    identityId: string;
    panNumber: string;
    consent: boolean;
  }) => api.post('/verification/pan', data),

  getStatus: (id: string) => api.get(`/verification/${id}`),
};

export const credentialsApi = {
  issue: (data: {
    identityId: string;
    type: string;
    claims: Record<string, any>;
  }) => api.post('/credentials', data),

  get: (id: string) => api.get(`/credentials/${id}`),

  verify: (id: string, proof: any) => api.post(`/credentials/${id}/verify`, { proof }),

  revoke: (id: string) => api.delete(`/credentials/${id}`),
};

export const reputationApi = {
  getScore: (identityId: string) => api.get(`/reputation/${identityId}`),

  getHistory: (identityId: string) => api.get(`/reputation/${identityId}/history`),
};

export const stakingApi = {
  stake: (data: {
    identityId: string;
    amount: number;
  }) => api.post('/staking/stake', data),

  getInfo: (identityId: string) => api.get(`/staking/${identityId}`),
};
