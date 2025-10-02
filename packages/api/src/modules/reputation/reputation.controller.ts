import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReputationService } from './reputation.service';

@ApiTags('Reputation')
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get(':identityId')
  @ApiOperation({ summary: 'Get reputation score' })
  async getReputationScore(@Param('identityId') identityId: string) {
    return this.reputationService.getReputationScore(identityId);
  }

  @Get(':identityId/history')
  @ApiOperation({ summary: 'Get reputation history' })
  async getReputationHistory(@Param('identityId') identityId: string) {
    return this.reputationService.getReputationHistory(identityId);
  }
}
