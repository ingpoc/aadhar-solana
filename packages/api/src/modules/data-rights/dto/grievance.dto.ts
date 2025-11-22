import { IsNotEmpty, IsString, IsOptional, IsIn, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrievanceDto {
  @ApiProperty({
    description: 'Category of grievance',
    enum: ['consent', 'access', 'erasure', 'correction', 'other'],
  })
  @IsIn(['consent', 'access', 'erasure', 'correction', 'other'])
  category: 'consent' | 'access' | 'erasure' | 'correction' | 'other';

  @ApiProperty({
    description: 'Detailed description of the grievance',
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Related request ID if grievance is about a previous request',
  })
  @IsOptional()
  @IsString()
  relatedRequestId?: string;
}
