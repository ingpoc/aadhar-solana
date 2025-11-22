import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';

/**
 * Global Encryption Module
 *
 * Provides encryption services throughout the application.
 * Marked as @Global() so services don't need to import it explicitly.
 *
 * Usage:
 *   constructor(private readonly encryption: EncryptionService) {}
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, KeyManagementService],
  exports: [EncryptionService, KeyManagementService],
})
export class EncryptionModule {}
