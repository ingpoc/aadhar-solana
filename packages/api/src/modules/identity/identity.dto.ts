import { IsString, IsOptional, IsArray, IsEmail, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IdentityMetadataDto {
  @ApiProperty({ description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'User phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class PrepareTransactionDto {
  @ApiProperty({ description: 'Solana public key' })
  @IsString()
  publicKey: string;

  @ApiProperty({ description: 'User metadata', required: false, type: IdentityMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentityMetadataDto)
  metadata?: IdentityMetadataDto;
}

export class CreateIdentityDto extends PrepareTransactionDto {
   @ApiProperty({ description: 'Signed transaction (base64 encoded)', required: false })
   @IsOptional()
   @IsString()
   signedTransaction?: string;
}

export class UpdateIdentityDto {
  @ApiProperty({ description: 'Updated metadata URI', required: false })
  @IsOptional()
  @IsString()
  metadataUri?: string;

  @ApiProperty({ description: 'Additional recovery keys', required: false })
  @IsOptional()
  @IsArray()
  recoveryKeys?: string[];
}
