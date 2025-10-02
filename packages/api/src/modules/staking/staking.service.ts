import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { StakeDto } from './staking.dto';

@Injectable()
export class StakingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly solana: SolanaService,
  ) {}

  async stake(dto: StakeDto) {
    const stakeAccount = await this.db.stakeAccount.create({
      data: {
        identityId: dto.identityId,
        amount: BigInt(dto.amount),
        unlockTime: dto.lockPeriod
          ? new Date(Date.now() + dto.lockPeriod * 1000)
          : null,
      },
    });

    return {
      success: true,
      data: {
        stakeId: stakeAccount.id,
        amount: stakeAccount.amount.toString(),
        stakedAt: stakeAccount.stakedAt,
        unlockTime: stakeAccount.unlockTime,
        transactionSignature: 'mock-signature-' + Date.now(),
      },
    };
  }

  async getStakingInfo(identityId: string) {
    const stakes = await this.db.stakeAccount.findMany({
      where: { identityId, status: 'active' },
    });

    const totalStaked = stakes.reduce((sum, stake) => sum + stake.amount, BigInt(0));

    return {
      success: true,
      data: {
        totalStaked: totalStaked.toString(),
        availableToUnstake: totalStaked.toString(),
        lockedUntil: stakes[0]?.unlockTime || null,
        pendingRewards: '0',
        stakingHistory: stakes.map((stake) => ({
          action: 'stake',
          amount: stake.amount.toString(),
          timestamp: stake.stakedAt,
        })),
      },
    };
  }
}
