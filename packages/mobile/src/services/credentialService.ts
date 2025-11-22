import { api } from './apiClient';

export interface Credential {
  id: string;
  credentialId: string;
  identityId: string;
  issuerId?: string;
  credentialType: string;
  issuedAt: string;
  expiresAt?: string;
  revoked: boolean;
  revokedAt?: string;
  metadataUri?: string;
  proofHash?: string;
}

export interface CredentialVerification {
  valid: boolean;
  credential: Credential;
  issuer?: {
    name: string;
    verificationLevel: number;
  };
}

export const credentialService = {
  // Get all credentials for identity
  getByIdentity: async (identityId: string): Promise<Credential[]> => {
    const { data } = await api.get<Credential[]>(`/credentials/identity/${identityId}`);
    return Array.isArray(data) ? data : [];
  },

  // Get credential by ID
  getById: async (credentialId: string): Promise<Credential> => {
    const { data } = await api.get<Credential>(`/credentials/${credentialId}`);
    return data;
  },

  // Verify a credential
  verify: async (credentialId: string): Promise<CredentialVerification> => {
    const { data } = await api.get<CredentialVerification>(`/credentials/${credentialId}/verify`);
    return data;
  },

  // Get credential type display name
  getTypeName: (type: string): string => {
    const names: Record<string, string> = {
      AadhaarVerification: 'Aadhaar Verification',
      PANVerification: 'PAN Verification',
      EducationalDegree: 'Educational Degree',
      EmploymentProof: 'Employment Proof',
      BankAccountVerification: 'Bank Account',
      AddressProof: 'Address Proof',
      VoterIdVerification: 'Voter ID',
      DrivingLicenseVerification: 'Driving License',
    };
    return names[type] || type;
  },

  // Get credential status color
  getStatusColor: (credential: Credential): string => {
    if (credential.revoked) return '#EF4444'; // red
    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return '#F59E0B'; // amber - expired
    }
    return '#10B981'; // green - active
  },

  // Get credential status text
  getStatusText: (credential: Credential): string => {
    if (credential.revoked) return 'Revoked';
    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return 'Expired';
    }
    return 'Active';
  },

  // Check if credential is valid
  isValid: (credential: Credential): boolean => {
    if (credential.revoked) return false;
    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return false;
    }
    return true;
  },
};
