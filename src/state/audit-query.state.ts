import { z } from 'zod';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Citation from a retrieved chunk linked to a source document.
 */
export const CitationSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  documentName: z.string().optional(),
  pageNumber: z.number().optional(),
  excerpt: z.string(),
  score: z.number().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

/**
 * A single step in the agent execution trace.
 */
export const AgentStepSchema = z.object({
  node: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentStep = z.infer<typeof AgentStepSchema>;

/**
 * AuditQueryState — the state schema for the AuditQueryGraph.
 *
 * Tracks messages, retrieval context, citations, confidence,
 * agent trace steps, and policy evaluation results.
 */
export const AuditQueryState = Annotation.Root({
  // Conversation messages (managed by LangGraph's messagesStateReducer)
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Current user query text
  query: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // User identity
  userId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // Engagement context
  engagementId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // Active application mode (audit | legal | compliance)
  mode: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => 'audit',
  }),

  // Force deep analysis via agentic loop + RLM
  forceDeepAnalysis: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),

  // User's role for policy checks
  userRole: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // Policy check result
  accessAllowed: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),

  // Allowed engagement IDs from policy evaluation
  allowedEngagementIds: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Selected retrieval mode
  retrievalMode: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => 'hybrid',
  }),

  // Retrieved context chunks
  retrievedChunks: Annotation<
    Array<{
      chunkId: string;
      documentId: string;
      content: string;
      score: number;
      metadata: Record<string, unknown>;
    }>
  >({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Retrieved graph entities
  retrievedEntities: Annotation<
    Array<{
      entityId: string;
      name: string;
      type: string;
      relationships?: Array<{ type: string; targetName: string }>;
    }>
  >({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Generated answer
  answer: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // Citations extracted from the answer
  citations: Annotation<Citation[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Confidence score (0–1)
  confidence: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),

  // Agent explanation of reasoning path
  explanation: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // Unique run ID for this agent execution
  runId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // Ordered agent trace steps
  agentSteps: Annotation<AgentStep[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Guardrail flags
  guardrailPassed: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => true,
  }),

  guardrailMessage: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // ---------------------------------------------------------------------------
  // Agentic RAG + RLM fields
  // ---------------------------------------------------------------------------

  // Query complexity classification (simple = existing path, complex = agentic loop)
  complexity: Annotation<'simple' | 'complex'>({
    reducer: (_prev, next) => next,
    default: () => 'simple',
  }),

  // RLM execution trace (iterations from the RLM engine)
  rlmIterations: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),

  rlmSubCalls: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),

  rlmTrace: Annotation<
    Array<{ iteration: number; code: string; stdoutMeta: string }>
  >({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Planner decisions in the agentic loop
  planningSteps: Annotation<
    Array<{
      action: string;
      reasoning: string;
      query: string;
      estimatedCompleteness: number;
      timestamp: string;
    }>
  >({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Results from tool invocations in the agentic loop
  toolResults: Annotation<
    Array<{ tool: string; result: string; score: number }>
  >({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Critic evaluations after each tool execution
  criticEvaluations: Annotation<
    Array<{
      sufficient: boolean;
      groundednessScore: number;
      completenessScore: number;
      reason: string;
      nextAction: string;
    }>
  >({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Number of agentic loop iterations completed
  agenticIterations: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
});

export type AuditQueryStateType = typeof AuditQueryState.State;
