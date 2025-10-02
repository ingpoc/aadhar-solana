import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class ReputationService {
  constructor(private readonly db: DatabaseService) {}

  async getReputationScore(identityId: string) {
    const identity = await this.db.identity.findUnique({
      where: { id: identityId },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    const tier = this.calculateTier(identity.reputationScore);
    const percentile = this.calculatePercentile(identity.reputationScore);

    return {
      success: true,
      data: {
        identityId: identity.id,
        overallScore: identity.reputationScore,
        breakdown: {
          baseScore: 500,
          verificationBonus: Math.floor(identity.reputationScore * 0.4),
          activityScore: Math.floor(identity.reputationScore * 0.2),
          penalties: 0,
        },
        percentile,
        tier,
        lastUpdated: identity.updatedAt,
      },
    };
  }

  async getReputationHistory(identityId: string) {
    const history = await this.db.reputationHistory.findMany({
      where: { identityId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      success: true,
      data: {
        events: history.map((event) => ({
          eventType: event.eventType,
          scoreDelta: event.scoreDelta,
          timestamp: event.createdAt,
          description: event.description,
        })),
        pagination: {
          page: 1,
          limit: 20,
          total: history.length,
        },
      },
    };
  }

  private calculateTier(score: number): string {
    if (score >= 900) return 'platinum';
    if (score >= 750) return 'gold';
    if (score >= 600) return 'silver';
    return 'bronze';
  }

  private calculatePercentile(score: number): number {
    return Math.min(Math.floor((score / 1000) * 100), 99);
  }
}
