import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { CacheService } from '../../services/cache.service';
import { EncryptionService } from '../../services/encryption.service';
import { ApiSetuService } from '../../services/api-setu.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, DatabaseService, SolanaService, CacheService, EncryptionService, ApiSetuService],
  exports: [IdentityService],
})
export class IdentityModule {}
