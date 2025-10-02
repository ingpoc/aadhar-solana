import { Module } from '@nestjs/common';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { DatabaseService } from '../../services/database.service';

@Module({
  controllers: [ReputationController],
  providers: [ReputationService, DatabaseService],
  exports: [ReputationService],
})
export class ReputationModule {}
