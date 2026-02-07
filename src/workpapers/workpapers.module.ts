import { Module } from '@nestjs/common';
import { WorkpapersService } from './workpapers.service';
import { WorkpapersController } from './workpapers.controller';
import { RagClientModule } from '../rag-client/rag-client.module';

@Module({
  imports: [RagClientModule],
  controllers: [WorkpapersController],
  providers: [WorkpapersService],
  exports: [WorkpapersService],
})
export class WorkpapersModule {}
