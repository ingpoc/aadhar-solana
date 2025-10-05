import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentityModule } from './modules/identity/identity.module';
import { VerificationModule } from './modules/verification/verification.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { StakingModule } from './modules/staking/staking.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseService } from './services/database.service';
import { SolanaService } from './services/solana.service';
import { CacheService } from './services/cache.service';
import { ApiSetuService } from './services/api-setu.service';
import { EncryptionService } from './services/encryption.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    IdentityModule,
    VerificationModule,
    CredentialsModule,
    ReputationModule,
    StakingModule,
    HealthModule,
  ],
  providers: [DatabaseService, SolanaService, CacheService, ApiSetuService, EncryptionService],
  exports: [EncryptionService],
})
export class AppModule {}
