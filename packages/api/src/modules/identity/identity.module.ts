import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { CacheService } from '../../services/cache.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, DatabaseService, SolanaService, CacheService],
  exports: [IdentityService],
})
export class IdentityModule {}
