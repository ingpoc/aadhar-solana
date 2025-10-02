import { Module } from '@nestjs/common';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';

@Module({
  controllers: [CredentialsController],
  providers: [CredentialsService, DatabaseService, SolanaService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
