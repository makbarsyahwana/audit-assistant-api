import { Module } from '@nestjs/common';
import { EvidencePacksService } from './evidence-packs.service';
import { EvidencePacksController } from './evidence-packs.controller';

@Module({
  controllers: [EvidencePacksController],
  providers: [EvidencePacksService],
  exports: [EvidencePacksService],
})
export class EvidencePacksModule {}
