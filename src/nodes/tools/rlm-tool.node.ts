import { AuditQueryStateType } from '../../state/audit-query.state';
import { RagClientService } from '../../rag-client/rag-client.service';

/**
 * RLM tool node — deep multi-document analysis via the Recursive Language Model engine.
 *
 * Calls the RAG engine's POST /rlm/execute endpoint for complex queries
 * that require cross-document reasoning, gap analysis, or multi-step computation.
 */
export function createRlmToolNode(ragClient: RagClientService) {
  return async function rlmToolNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // Use the latest planner query if available
    const lastPlan =
      state.planningSteps.length > 0
        ? state.planningSteps[state.planningSteps.length - 1]
        : null;
    const query = lastPlan?.query || state.query;

    // Build context from any previously retrieved chunks
    let context: string | undefined;
    if (state.retrievedChunks.length > 0) {
      context = state.retrievedChunks
        .slice(0, 5)
        .map((c) => c.content)
        .join('\n\n---\n\n');
    }

    try {
      const result = await ragClient.rlmExecute({
        query,
        engagementId: state.engagementId,
        context,
      });

      // The Python response no longer exposes iteration bodies at the top
      // level; detailed iteration traces live inside `trace.iterations` and
      // are not currently consumed by downstream nodes. Persist summary
      // counters only.
      return {
        rlmIterations: result.iterationsUsed,
        rlmSubCalls: result.subCallsUsed,
        rlmTrace: [],
        toolResults: [
          {
            tool: 'rlm_deep',
            result: result.answer || `RLM completed with status: ${result.status}`,
            score: result.status === 'completed' ? 0.8 : 0.3,
          },
        ],
        // If RLM produced an answer, update the main answer
        ...(result.status === 'completed' && result.answer
          ? { answer: result.answer }
          : {}),
        agentSteps: [
          {
            node: 'rlmTool',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: {
              query,
              status: result.status,
              iterationsUsed: result.iterationsUsed,
              maxDepthReached: result.maxDepthReached,
              subCallsUsed: result.subCallsUsed,
              hasAnswer: !!result.answer,
            },
          },
        ],
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown RLM error';

      return {
        toolResults: [
          {
            tool: 'rlm_deep',
            result: `RLM execution failed: ${errorMsg}`,
            score: 0,
          },
        ],
        agentSteps: [
          {
            node: 'rlmTool',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: { error: errorMsg },
          },
        ],
      };
    }
  };
}
