import { IsEnum, IsOptional, IsString, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentType } from '../interfaces/consent.interfaces';

export class GrantConsentDto {
  @ApiProperty({
    enum: ConsentType,
    description: 'Type of consent being granted',
    example: ConsentType.IDENTITY_CREATION,
  })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiPropertyOptional({
    description: 'Identity ID if consent is related to a specific identity',
  })
  @IsOptional()
  @IsUUID()
  identityId?: string;

  @ApiPropertyOptional({
    description: 'Custom purpose description (overrides default)',
  })
  @IsOptional()
  @IsString()
  customPurpose?: string;

  @ApiPropertyOptional({
    description: 'Custom expiration in days (1-3650)',
    minimum: 1,
    maximum: 3650,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;
}
