import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, DatabaseService, SolanaService],
  exports: [HealthService],
})
export class HealthModule {}