import { Module } from '@nestjs/common';
import { StakingController } from './staking.controller';
import { StakingService } from './staking.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';

@Module({
  controllers: [StakingController],
  providers: [StakingService, DatabaseService, SolanaService],
  exports: [StakingService],
})
export class StakingModule {}
