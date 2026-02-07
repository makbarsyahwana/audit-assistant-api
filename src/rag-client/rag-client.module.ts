import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RagClientService } from './rag-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  providers: [RagClientService],
  exports: [RagClientService],
})
export class RagClientModule {}
