import { IsString, IsOptional, IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIdentityDto {
  @ApiProperty({ description: 'Solana public key' })
  @IsString()
  publicKey: string;

  @ApiProperty({ description: 'Decentralized Identifier (DID)' })
  @IsString()
  did: string;

  @ApiProperty({ description: 'IPFS metadata URI', required: false })
  @IsOptional()
  @IsString()
  metadataUri?: string;

  @ApiProperty({ description: 'Recovery public keys', required: false })
  @IsOptional()
  @IsArray()
  recoveryKeys?: string[];

  @ApiProperty({ description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'User phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
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
