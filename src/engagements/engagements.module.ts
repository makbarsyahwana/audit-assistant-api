import { Module } from '@nestjs/common';
import { EngagementsService } from './engagements.service';
import { EngagementLifecycleService } from './engagement-lifecycle.service';
import { EngagementsController } from './engagements.controller';

@Module({
  controllers: [EngagementsController],
  providers: [EngagementsService, EngagementLifecycleService],
  exports: [EngagementsService, EngagementLifecycleService],
})
export class EngagementsModule {}
