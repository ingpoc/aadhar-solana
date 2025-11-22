import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CorrectionRequestDto {
  @ApiProperty({
    description: 'Field to correct',
    example: 'email',
  })
  @IsNotEmpty()
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Current incorrect value',
    example: 'old@example.com',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  currentValue: string;

  @ApiProperty({
    description: 'Corrected value',
    example: 'correct@example.com',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  correctedValue: string;

  @ApiProperty({
    description: 'Reason for correction',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Supporting evidence (URL or description)',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidence?: string;
}
