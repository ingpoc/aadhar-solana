import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StakingService } from './staking.service';
import { StakeDto } from './staking.dto';

@ApiTags('Staking')
@Controller('staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post('stake')
  @ApiOperation({ summary: 'Stake SOL for identity' })
  async stake(@Body() dto: StakeDto) {
    return this.stakingService.stake(dto);
  }

  @Get(':identityId')
  @ApiOperation({ summary: 'Get staking info' })
  async getStakingInfo(@Param('identityId') identityId: string) {
    return this.stakingService.getStakingInfo(identityId);
  }
}
