import { Module } from '@nestjs/common';
import { AadhaarComplianceService } from './aadhaar-compliance.service';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [ConsentModule],
  providers: [AadhaarComplianceService],
  exports: [AadhaarComplianceService],
})
export class AadhaarModule {}
