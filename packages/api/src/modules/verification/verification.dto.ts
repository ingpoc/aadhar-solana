import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AadhaarVerificationDto {
  @ApiProperty({ description: 'Identity ID' })
  @IsString()
  identityId: string;

  @ApiProperty({ description: 'Aadhaar number' })
  @IsString()
  aadhaarNumber: string;

  @ApiProperty({ description: 'User consent' })
  @IsBoolean()
  consent: boolean;

  @ApiProperty({ description: 'OTP for verification', required: false })
  @IsOptional()
  @IsString()
  otp?: string;
}

export class PANVerificationDto {
  @ApiProperty({ description: 'Identity ID' })
  @IsString()
  identityId: string;

  @ApiProperty({ description: 'PAN number' })
  @IsString()
  panNumber: string;

  @ApiProperty({ description: 'Full name as per PAN' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsString()
  dateOfBirth: string;
}
