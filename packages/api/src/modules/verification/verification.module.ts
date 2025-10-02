import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ApiSetuService } from '../../services/api-setu.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';

@Module({
  controllers: [VerificationController],
  providers: [VerificationService, ApiSetuService, DatabaseService, SolanaService],
  exports: [VerificationService],
})
export class VerificationModule {}
