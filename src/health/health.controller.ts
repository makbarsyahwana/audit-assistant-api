import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('health')
@Controller()
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // PostgreSQL check
    const pgStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = { status: 'up', latency: Date.now() - pgStart };
    } catch (err) {
      checks.postgres = {
        status: 'down',
        latency: Date.now() - pgStart,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Redis check
    const redisStart = Date.now();
    try {
      const Redis = await import('ioredis');
      const redisUrl = this.config.get<string>('redis.url', 'redis://localhost:6379');
      const client = new Redis.default(redisUrl);
      await client.ping();
      await client.quit();
      checks.redis = { status: 'up', latency: Date.now() - redisStart };
    } catch (err) {
      checks.redis = {
        status: 'down',
        latency: Date.now() - redisStart,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // RAG Engine check
    const ragStart = Date.now();
    try {
      const ragUrl = this.config.get<string>('ragEngine.url', 'http://localhost:8001');
      const response = await fetch(`${ragUrl}/health`, { signal: AbortSignal.timeout(3000) });
      checks.ragEngine = {
        status: response.ok ? 'up' : 'degraded',
        latency: Date.now() - ragStart,
      };
    } catch (err) {
      checks.ragEngine = {
        status: 'down',
        latency: Date.now() - ragStart,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const allUp = Object.values(checks).every((c) => c.status === 'up');
    const uptime = Math.floor((Date.now() - this.startedAt) / 1000);

    return {
      status: allUp ? 'healthy' : 'degraded',
      service: 'audit-assistant-api',
      version: '0.1.0',
      uptime,
      checks,
    };
  }
}
