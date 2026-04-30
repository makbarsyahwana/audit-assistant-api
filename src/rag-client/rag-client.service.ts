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
  engagementId: string;
  mode?: 'vector' | 'fulltext' | 'graph' | 'hybrid' | 'entity_vector' | 'graph_vector_fulltext' | 'auto';
  topK?: number;
  filters?: Record<string, unknown>;
  appMode?: string;
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
  stdout: string;
  stateChanges: Record<string, string>;
  modelUsed?: string;
  tokensUsed?: number;
  durationMs?: number;
  error?: string;
}

export interface RlmExecuteResponse {
  status: 'completed' | 'max_iterations' | 'error' | 'killed' | 'timeout';
  answer: string;
  iterationsUsed: number;
  subCallsUsed: number;
  totalTokens: number;
  maxDepthReached: number;
  durationMs?: number;
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
    score?: number;
  }>;
  confidence: number;
  explanation?: string;
  retrievalMode?: string;
  chunksRetrieved?: number;
  latencyMs?: number;
  abstained?: boolean;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
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
      this.httpService.post<GenerateResponse>(`${this.baseUrl}/generate/`, {
        query: request.query,
        engagement_id: request.engagementId,
        mode: request.mode,
        top_k: request.topK ?? 10,
        filters: request.filters,
        app_mode: request.appMode || 'audit',
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
