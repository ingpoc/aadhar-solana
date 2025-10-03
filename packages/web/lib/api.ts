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
    metadata?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }) => api.post('/identity', data),

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
