import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface RetrieveRequest {
  query: string;
  engagementId: string;
  mode?: 'vector' | 'fulltext' | 'graph' | 'graph_vector' | 'hybrid';
  filters?: Record<string, unknown>;
  topK?: number;
  appMode?: string;
}

export interface RetrieveResponse {
  chunks: Array<{
    chunkId: string;
    documentId: string;
    content: string;
    score: number;
    metadata: Record<string, unknown>;
  }>;
  entities?: Array<{
    entityId: string;
    name: string;
    type: string;
    relationships?: Array<{
      type: string;
      targetName: string;
    }>;
  }>;
}

export interface GenerateRequest {
  query: string;
  context: RetrieveResponse;
  systemPrompt?: string;
}

// ---------------------------------------------------------------------------
// RLM Execute types
// ---------------------------------------------------------------------------

export interface RlmExecuteRequest {
  query: string;
  engagementId: string;
  context?: string;
  maxIterations?: number;
  maxDepth?: number;
  maxSubCalls?: number;
  appMode?: string;
}

export interface RlmIteration {
  iteration: number;
  code: string;
  stdoutMeta: string;
  stateSnapshot: Record<string, unknown>;
  error?: string;
}

export interface RlmExecuteResponse {
  status: 'completed' | 'max_iterations' | 'error';
  answer: string;
  iterations: RlmIteration[];
  iterationsUsed: number;
  maxDepthReached: number;
  totalSubCalls: number;
  error?: string;
}

export interface GenerateResponse {
  answer: string;
  citations: Array<{
    chunkId: string;
    documentId: string;
    documentName?: string;
    pageNumber?: number;
    excerpt: string;
  }>;
  confidence: number;
  model: string;
}

@Injectable()
export class RagClientService {
  private readonly logger = new Logger(RagClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'ragEngine.url',
      'http://localhost:8001',
    );
  }

  async retrieve(request: RetrieveRequest): Promise<RetrieveResponse> {
    this.logger.debug(
      `Retrieving for query: "${request.query}" mode=${request.mode || 'hybrid'}`,
    );

    const { data } = await firstValueFrom(
      this.httpService.post<RetrieveResponse>(
        `${this.baseUrl}/retrieve/${request.mode || 'hybrid'}`,
        {
          query: request.query,
          engagement_id: request.engagementId,
          filters: request.filters,
          top_k: request.topK || 10,
          app_mode: request.appMode || 'audit',
        },
      ),
    );

    this.logger.debug(`Retrieved ${data.chunks.length} chunks`);
    return data;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    this.logger.debug(`Generating answer for query: "${request.query}"`);

    const { data } = await firstValueFrom(
      this.httpService.post<GenerateResponse>(`${this.baseUrl}/generate`, {
        query: request.query,
        context: request.context,
        system_prompt: request.systemPrompt,
        app_mode: (request as any).appMode || 'audit',
      }),
    );

    this.logger.debug(`Generated answer with confidence=${data.confidence}`);
    return data;
  }

  async rlmExecute(request: RlmExecuteRequest): Promise<RlmExecuteResponse> {
    this.logger.debug(
      `RLM execute for query: "${request.query}" engagement=${request.engagementId}`,
    );

    const { data } = await firstValueFrom(
      this.httpService.post<RlmExecuteResponse>(
        `${this.baseUrl}/rlm/execute`,
        {
          query: request.query,
          engagement_id: request.engagementId,
          context: request.context,
          max_iterations: request.maxIterations,
          max_depth: request.maxDepth,
          max_sub_calls: request.maxSubCalls,
          app_mode: request.appMode || 'audit',
        },
      ),
    );

    this.logger.debug(
      `RLM result: status=${data.status} iterations=${data.iterationsUsed}`,
    );
    return data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`),
      );
      return data?.status === 'ok';
    } catch {
      return false;
    }
  }
}
