import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdentityModule } from './modules/identity/identity.module';
import { VerificationModule } from './modules/verification/verification.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { StakingModule } from './modules/staking/staking.module';
import { AuthModule } from './modules/auth/auth.module';
import { EncryptionModule } from './common/crypto/encryption.module';
import { DatabaseService } from './services/database.service';
import { SolanaService } from './services/solana.service';
import { CacheService } from './services/cache.service';
import { AuditService } from './services/audit.service';
import configuration from './config/configuration';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    EncryptionModule,
    AuthModule,
    IdentityModule,
    VerificationModule,
    CredentialsModule,
    ReputationModule,
    StakingModule,
  ],
  providers: [
    DatabaseService,
    SolanaService,
    CacheService,
    AuditService,
  ],
  exports: [
    DatabaseService,
    SolanaService,
    CacheService,
    AuditService,
  ],
})
export class AppModule {}
