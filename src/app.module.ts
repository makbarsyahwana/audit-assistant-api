import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PolicyModule } from './policy/policy.module';
import { EngagementsModule } from './engagements/engagements.module';
import { RagClientModule } from './rag-client/rag-client.module';
import { AuditTrailModule } from './audit-trail/audit-trail.module';
import { ChatModule } from './chat/chat.module';
import { DocumentsModule } from './documents/documents.module';
import { RequirementsModule } from './requirements/requirements.module';
import { ControlsModule } from './controls/controls.module';
import { MappingsModule } from './mappings/mappings.module';
import { EvidencePacksModule } from './evidence-packs/evidence-packs.module';
import { WorkpapersModule } from './workpapers/workpapers.module';
import { FindingsModule } from './findings/findings.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PolicyModule,
    EngagementsModule,
    RagClientModule,
    AuditTrailModule,
    ChatModule,
    // Phase 2: Workflow Modules
    DocumentsModule,
    RequirementsModule,
    ControlsModule,
    MappingsModule,
    EvidencePacksModule,
    WorkpapersModule,
    FindingsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
