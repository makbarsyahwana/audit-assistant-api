import { Module } from '@nestjs/common';
import { EngagementsService } from './engagements.service';
import { EngagementsController } from './engagements.controller';

@Module({
  controllers: [EngagementsController],
  providers: [EngagementsService],
  exports: [EngagementsService],
})
export class EngagementsModule {}
