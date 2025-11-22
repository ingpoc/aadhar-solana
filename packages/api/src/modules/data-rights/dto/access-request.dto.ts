import { IsOptional, IsString, IsArray, ArrayMinSize, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DATA_CATEGORIES } from '../interfaces/data-rights.interfaces';

export class AccessRequestDto {
  @ApiPropertyOptional({
    description: 'Categories of data to access (leave empty for all)',
    example: ['profile', 'identity', 'credentials'],
    enum: DATA_CATEGORIES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Reason for access request',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
