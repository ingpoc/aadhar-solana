import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ConsentQueryDto {
  @ApiPropertyOptional({
    description: 'Include revoked consents in response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRevoked?: boolean;

  @ApiPropertyOptional({
    description: 'Include expired consents in response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeExpired?: boolean;
}
