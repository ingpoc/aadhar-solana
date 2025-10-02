import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueCredentialDto {
  @ApiProperty({ description: 'Subject identity ID' })
  @IsString()
  subjectId: string;

  @ApiProperty({ description: 'Credential type' })
  @IsString()
  credentialType: string;

  @ApiProperty({ description: 'Schema URI' })
  @IsString()
  schema: string;

  @ApiProperty({ description: 'Credential claims' })
  @IsObject()
  claims: Record<string, any>;

  @ApiProperty({ description: 'Expiration date', required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
