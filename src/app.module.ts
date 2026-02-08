import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
// Phase 3: Security & Production Hardening
import { GroupsModule } from './groups/groups.module';
import { SecretsModule } from './secrets/secrets.module';
// Phase 3: Observability
import { HealthModule } from './health/health.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { TracingModule } from './common/tracing/tracing.module';
// Phase 4: Integrations & Exports
import { ExportsModule } from './exports/exports.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ThrottleBehindAuthGuard } from './common/guards/throttle-behind-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Phase 3: Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('throttle.ttl', 60)) * 1000,
            limit: config.get<number>('throttle.limit', 60),
          },
        ],
      }),
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
    // Phase 3: Security & Production Hardening
    GroupsModule,
    SecretsModule,
    // Phase 3: Observability
    HealthModule,
    MetricsModule,
    TracingModule,
    // Phase 4: Integrations & Exports
    ExportsModule,
    WebhooksModule,
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
    {
      provide: APP_GUARD,
      useClass: ThrottleBehindAuthGuard,
    },
  ],
})
export class AppModule {}
