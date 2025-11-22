import { api } from './apiClient';

export interface Identity {
  id: string;
  userId: string;
  solanaPublicKey: string;
  did: string;
  verificationBitmap: number;
  reputationScore: number;
  stakedAmount: string;
  metadataUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdentityRequest {
  solanaPublicKey: string;
  did: string;
  metadataUri?: string;
}

export const identityService = {
  // Create new identity
  create: async (data: CreateIdentityRequest): Promise<Identity> => {
    const { data: response } = await api.post<{ identity: Identity }>('/identity', data);
    return response.identity;
  },

  // Get identity by ID
  getById: async (id: string): Promise<Identity> => {
    const { data } = await api.get<Identity>(`/identity/${id}`);
    return data;
  },

  // Get identity by wallet public key
  getByPublicKey: async (publicKey: string): Promise<Identity> => {
    const { data } = await api.get<Identity>(`/identity/wallet/${publicKey}`);
    return data;
  },

  // Update identity
  update: async (id: string, data: { metadataUri?: string }): Promise<Identity> => {
    const { data: response } = await api.patch<Identity>(`/identity/${id}`, data);
    return response;
  },

  // Get verification status from bitmap
  getVerificationStatus: (bitmap: number) => ({
    aadhaar: (bitmap & (1 << 0)) !== 0,
    pan: (bitmap & (1 << 1)) !== 0,
    voterId: (bitmap & (1 << 2)) !== 0,
    drivingLicense: (bitmap & (1 << 3)) !== 0,
    passport: (bitmap & (1 << 4)) !== 0,
    bankAccount: (bitmap & (1 << 5)) !== 0,
    address: (bitmap & (1 << 6)) !== 0,
    education: (bitmap & (1 << 7)) !== 0,
    employment: (bitmap & (1 << 8)) !== 0,
  }),
};
