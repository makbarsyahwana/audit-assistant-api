import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // TODO: Phase 1 - Add modules:
    // AuthModule,
    // PolicyModule,
    // ChatModule,
    // EngagementsModule,
    // DocumentsModule,
    // AuditTrailModule,
    // FeedbackModule,
    // RagClientModule,
  ],
})
export class AppModule {}
