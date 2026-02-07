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
});

export type AuditQueryStateType = typeof AuditQueryState.State;
