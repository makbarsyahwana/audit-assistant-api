import { AuditQueryStateType } from '../state/audit-query.state';
import {
  AuditTrailService,
  CreateRetrievalEventInput,
} from '../audit-trail/audit-trail.service';

/**
 * Log audit trail node — persists the full agent trace to PostgreSQL.
 *
 * The AuditTrailService is injected via graph config at compile time.
 */
export function createLogAuditTrailNode(auditTrailService: AuditTrailService) {
  return async function logAuditTrailNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // Calculate latency from first to last agent step
    const steps = state.agentSteps;
    let latencyMs: number | undefined;
    if (steps.length > 0) {
      const firstStep = new Date(steps[0].startedAt).getTime();
      const lastStep = steps[steps.length - 1].completedAt
        ? new Date(steps[steps.length - 1].completedAt!).getTime()
        : Date.now();
      latencyMs = lastStep - firstStep;
    }

    // Log the query
    const queryLog = await auditTrailService.logQuery({
      userId: state.userId,
      engagementId: state.engagementId,
      queryText: state.query,
      retrievalMode: state.retrievalMode,
      responseText: state.answer,
      latencyMs,
      runId: state.runId,
      agentGraph: 'AuditQueryGraph',
      agentSteps: state.agentSteps as any,
      confidence: state.confidence,
      explanation: state.explanation,
    });

    // Log retrieval events
    if (state.retrievedChunks.length > 0) {
      const events: CreateRetrievalEventInput[] = state.retrievedChunks.map(
        (chunk) => ({
          queryLogId: queryLog.id,
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          score: chunk.score,
          retrievalType: state.retrievalMode,
        }),
      );
      await auditTrailService.logRetrievalEvents(events);
    }

    return {
      agentSteps: [
        {
          node: 'logAuditTrail',
          startedAt,
          completedAt: new Date().toISOString(),
          metadata: { queryLogId: queryLog.id },
        },
      ],
    };
  };
}
