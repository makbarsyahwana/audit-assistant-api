import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateQueryLogInput {
  userId: string;
  engagementId: string;
  queryText: string;
  retrievalMode?: string;
  responseText?: string;
  latencyMs?: number;
  runId?: string;
  agentGraph?: string;
  agentSteps?: Record<string, unknown>[];
  confidence?: number;
  explanation?: string;
}

export interface CreateRetrievalEventInput {
  queryLogId: string;
  chunkId: string;
  documentId: string;
  score: number;
  retrievalType: string;
}

@Injectable()
export class AuditTrailService {
  constructor(private readonly prisma: PrismaService) {}

  async logQuery(input: CreateQueryLogInput) {
    return this.prisma.queryLog.create({
      data: {
        userId: input.userId,
        engagementId: input.engagementId,
        queryText: input.queryText,
        retrievalMode: input.retrievalMode,
        responseText: input.responseText,
        latencyMs: input.latencyMs,
        runId: input.runId,
        agentGraph: input.agentGraph,
        agentSteps: input.agentSteps as any,
        confidence: input.confidence,
        explanation: input.explanation,
      },
    });
  }

  async logRetrievalEvents(events: CreateRetrievalEventInput[]) {
    return this.prisma.retrievalEvent.createMany({
      data: events,
    });
  }

  async findQueries(params: {
    engagementId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { engagementId, userId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (engagementId) where.engagementId = engagementId;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.queryLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          engagement: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.queryLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findQueryById(id: string) {
    const queryLog = await this.prisma.queryLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        engagement: { select: { id: true, name: true } },
        retrievalEvents: true,
      },
    });
    if (!queryLog) {
      throw new NotFoundException(`QueryLog ${id} not found`);
    }
    return queryLog;
  }

  async exportQueries(params: {
    engagementId?: string;
    userId?: string;
    format?: 'json' | 'csv';
  }) {
    const where: Record<string, unknown> = {};
    if (params.engagementId) where.engagementId = params.engagementId;
    if (params.userId) where.userId = params.userId;

    const logs = await this.prisma.queryLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        engagement: { select: { id: true, name: true } },
        retrievalEvents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (params.format === 'csv') {
      return this.toCsv(logs);
    }
    return logs;
  }

  private toCsv(logs: any[]): string {
    const headers = [
      'id',
      'user_email',
      'engagement_name',
      'query_text',
      'retrieval_mode',
      'response_text',
      'latency_ms',
      'confidence',
      'run_id',
      'created_at',
    ];

    const rows = logs.map((log) =>
      [
        log.id,
        log.user?.email || '',
        log.engagement?.name || '',
        `"${(log.queryText || '').replace(/"/g, '""')}"`,
        log.retrievalMode || '',
        `"${(log.responseText || '').replace(/"/g, '""')}"`,
        log.latencyMs ?? '',
        log.confidence ?? '',
        log.runId || '',
        log.createdAt?.toISOString() || '',
      ].join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
