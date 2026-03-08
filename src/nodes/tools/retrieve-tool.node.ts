import { AuditQueryStateType } from '../../state/audit-query.state';
import { RagClientService } from '../../rag-client/rag-client.service';

/**
 * Retrieve tool node — standard RAG retrieval used within the agentic loop.
 *
 * Reuses the existing RagClientService.retrieve() but wraps the result
 * into the agentic loop's toolResults format so the critic can evaluate it.
 */
export function createRetrieveToolNode(ragClient: RagClientService) {
  return async function retrieveToolNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // Use the latest planner query if available, otherwise original query
    const lastPlan =
      state.planningSteps.length > 0
        ? state.planningSteps[state.planningSteps.length - 1]
        : null;
    const query = lastPlan?.query || state.query;

    try {
      const result = await ragClient.retrieve({
        query,
        engagementId: state.engagementId,
        mode: state.retrievalMode as any,
        filters: { engagement_id: state.engagementId },
        topK: 10,
      });

      // Build a text summary of retrieved chunks for the critic/planner
      const chunkSummaries = result.chunks
        .map(
          (c, i) =>
            `[${i + 1}] (score: ${c.score.toFixed(3)}) ${c.content.slice(0, 200)}...`,
        )
        .join('\n');

      const avgScore =
        result.chunks.length > 0
          ? result.chunks.reduce((sum, c) => sum + c.score, 0) /
            result.chunks.length
          : 0;

      return {
        retrievedChunks: result.chunks,
        retrievedEntities: result.entities || [],
        toolResults: [
          {
            tool: 'retrieve',
            result: `Retrieved ${result.chunks.length} chunks (avg score: ${avgScore.toFixed(3)}):\n${chunkSummaries}`,
            score: avgScore,
          },
        ],
        agentSteps: [
          {
            node: 'retrieveTool',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: {
              query,
              mode: state.retrievalMode,
              chunksReturned: result.chunks.length,
              avgScore,
            },
          },
        ],
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown retrieval error';

      return {
        toolResults: [
          {
            tool: 'retrieve',
            result: `Retrieval failed: ${errorMsg}`,
            score: 0,
          },
        ],
        agentSteps: [
          {
            node: 'retrieveTool',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: { error: errorMsg },
          },
        ],
      };
    }
  };
}
