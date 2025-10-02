import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StakeDto {
  @ApiProperty({ description: 'Identity ID' })
  @IsString()
  identityId: string;

  @ApiProperty({ description: 'Amount to stake in lamports' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Lock period in seconds', required: false })
  @IsOptional()
  @IsNumber()
  lockPeriod?: number;
}
