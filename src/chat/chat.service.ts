import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { HumanMessage } from '@langchain/core/messages';
import { buildAuditQueryGraph } from '../agents/audit-query.graph';
import { getCheckpointer } from '../memory/checkpointer';
import { getMemoryStore } from '../memory/store';
import { PolicyService } from '../policy/policy.service';
import { RagClientService } from '../rag-client/rag-client.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { QueryDto } from './dto/query.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private compiledGraph: any = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly policyService: PolicyService,
    private readonly ragClient: RagClientService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  private async getCompiledGraph() {
    if (this.compiledGraph) {
      return this.compiledGraph;
    }

    const dbUrl = this.configService.get<string>('database.url');
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const checkpointer = await getCheckpointer(dbUrl);
    const store = await getMemoryStore(dbUrl);

    const graph = buildAuditQueryGraph(this.ragClient, this.auditTrailService);
    this.compiledGraph = graph.compile({
      checkpointer,
      store,
    });

    this.logger.log('AuditQueryGraph compiled with checkpointer and store');
    return this.compiledGraph;
  }

  async query(
    dto: QueryDto,
    user: { id: string; role: string },
  ) {
    // 1. Pre-check engagement access
    await this.policyService.checkEngagementAccess(
      user.id,
      dto.engagementId,
      user.role,
    );

    // 2. Get allowed engagements for policy node
    const { engagementIds } = await this.policyService.getEngagementFilters(
      user.id,
      user.role,
    );

    // 3. Prepare thread_id (for multi-turn conversation)
    const threadId = dto.threadId || uuidv4();
    const runId = uuidv4();

    // 4. Get compiled graph
    const compiledGraph = await this.getCompiledGraph();

    // 5. Invoke the agent graph
    this.logger.log(
      `Invoking AuditQueryGraph: runId=${runId}, threadId=${threadId}`,
    );

    const result = await compiledGraph.invoke(
      {
        messages: [new HumanMessage(dto.query)],
        query: dto.query,
        userId: user.id,
        engagementId: dto.engagementId,
        userRole: user.role,
        allowedEngagementIds: engagementIds,
        runId,
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    // 6. Build response
    return {
      answer: result.answer || '',
      citations: result.citations || [],
      confidence: result.confidence || 0,
      explanation: result.explanation || '',
      runId,
      threadId,
    };
  }
}
