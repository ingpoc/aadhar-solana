import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentityModule } from './modules/identity/identity.module';
import { VerificationModule } from './modules/verification/verification.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { StakingModule } from './modules/staking/staking.module';
import { DatabaseService } from './services/database.service';
import { SolanaService } from './services/solana.service';
import { CacheService } from './services/cache.service';

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
  ],
  providers: [DatabaseService, SolanaService, CacheService],
})
export class AppModule {}
