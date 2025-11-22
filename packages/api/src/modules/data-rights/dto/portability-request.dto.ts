import { IsOptional, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DATA_CATEGORIES } from '../interfaces/data-rights.interfaces';

export class PortabilityRequestDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['json', 'csv', 'xml'],
    example: 'json',
  })
  @IsIn(['json', 'csv', 'xml'])
  format: 'json' | 'csv' | 'xml';

  @ApiPropertyOptional({
    description: 'Categories to export (leave empty for all)',
    example: ['profile', 'identity', 'credentials'],
    enum: DATA_CATEGORIES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  categories?: string[];
}
