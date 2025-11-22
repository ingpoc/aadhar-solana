import { IsNotEmpty, IsString, IsOptional, IsArray, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DATA_CATEGORIES } from '../interfaces/data-rights.interfaces';

export class ErasureRequestDto {
  @ApiProperty({
    description: 'Scope of erasure',
    enum: ['full', 'partial'],
    example: 'partial',
  })
  @IsIn(['full', 'partial'])
  scope: 'full' | 'partial';

  @ApiPropertyOptional({
    description: 'Categories to erase (required if scope is partial)',
    example: ['credentials', 'pii'],
    enum: DATA_CATEGORIES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  categories?: string[];

  @ApiProperty({
    description: 'Reason for erasure request (required)',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}
