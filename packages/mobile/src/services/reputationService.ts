import { api } from './apiClient';

export interface ReputationScore {
  identityId: string;
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  verifiedTypes: string[];
}

export interface ReputationEvent {
  id: string;
  identityId: string;
  eventType: string;
  scoreDelta: number;
  newScore: number;
  description?: string;
  createdAt: string;
}

export const reputationService = {
  // Get reputation score
  getScore: async (identityId: string): Promise<ReputationScore> => {
    const { data } = await api.get<ReputationScore>(`/reputation/${identityId}`);
    return data;
  },

  // Get reputation history
  getHistory: async (
    identityId: string,
    page = 1,
    limit = 20
  ): Promise<{ items: ReputationEvent[]; total: number }> => {
    const { data } = await api.get(`/reputation/${identityId}/history`, {
      params: { page, limit },
    });
    return {
      items: Array.isArray(data) ? data : data.items || [],
      total: data.total || data.length || 0,
    };
  },

  // Calculate tier from score
  getTier: (score: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' => {
    if (score >= 900) return 'diamond';
    if (score >= 800) return 'platinum';
    if (score >= 700) return 'gold';
    if (score >= 600) return 'silver';
    return 'bronze';
  },

  // Get tier color
  getTierColor: (tier: string): string => {
    const colors: Record<string, string> = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF',
    };
    return colors[tier] || '#CD7F32';
  },

  // Get tier progress (percentage to next tier)
  getTierProgress: (score: number): number => {
    const tiers = [
      { min: 0, max: 599, name: 'bronze' },
      { min: 600, max: 699, name: 'silver' },
      { min: 700, max: 799, name: 'gold' },
      { min: 800, max: 899, name: 'platinum' },
      { min: 900, max: 1000, name: 'diamond' },
    ];

    const currentTier = tiers.find(t => score >= t.min && score <= t.max);
    if (!currentTier) return 100;

    const range = currentTier.max - currentTier.min;
    const progress = score - currentTier.min;
    return Math.round((progress / range) * 100);
  },

  // Get event type display name
  getEventTypeName: (type: string): string => {
    const names: Record<string, string> = {
      verification_success: 'Verification Completed',
      verification_failed: 'Verification Failed',
      credential_issued: 'Credential Issued',
      credential_revoked: 'Credential Revoked',
      stake_added: 'Stake Added',
      stake_removed: 'Stake Removed',
      successful_transaction: 'Successful Transaction',
      failed_transaction: 'Failed Transaction',
      time_decay: 'Time Decay',
    };
    return names[type] || type;
  },
};
