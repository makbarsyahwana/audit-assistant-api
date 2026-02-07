import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PolicyModule } from '../policy/policy.module';
import { RagClientModule } from '../rag-client/rag-client.module';
import { AuditTrailModule } from '../audit-trail/audit-trail.module';

@Module({
  imports: [PolicyModule, RagClientModule, AuditTrailModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
