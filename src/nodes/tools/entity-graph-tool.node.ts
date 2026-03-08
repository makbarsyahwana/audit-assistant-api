import { AuditQueryStateType } from '../../state/audit-query.state';
import { RagClientService } from '../../rag-client/rag-client.service';

/**
 * Entity graph tool node — entity-centric graph traversal retrieval.
 *
 * Uses the RAG engine's entity_vector retrieval mode to find entities
 * and their relationships, then follow graph edges to related chunks.
 */
export function createEntityGraphToolNode(ragClient: RagClientService) {
  return async function entityGraphToolNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // Use the latest planner query if available
    const lastPlan =
      state.planningSteps.length > 0
        ? state.planningSteps[state.planningSteps.length - 1]
        : null;
    const query = lastPlan?.query || state.query;

    try {
      // Use graph_vector mode for entity-centric retrieval
      const result = await ragClient.retrieve({
        query,
        engagementId: state.engagementId,
        mode: 'graph_vector',
        filters: { engagement_id: state.engagementId },
        topK: 10,
      });

      // Build entity summary for the critic/planner
      const entitySummaries = (result.entities || [])
        .map((e) => {
          const rels = (e.relationships || [])
            .map((r) => `${r.type} → ${r.targetName}`)
            .join(', ');
          return `- ${e.name} (${e.type})${rels ? `: ${rels}` : ''}`;
        })
        .join('\n');

      const chunkSummaries = result.chunks
        .slice(0, 5)
        .map(
          (c, i) =>
            `[${i + 1}] (score: ${c.score.toFixed(3)}) ${c.content.slice(0, 150)}...`,
        )
        .join('\n');

      const avgScore =
        result.chunks.length > 0
          ? result.chunks.reduce((sum, c) => sum + c.score, 0) /
            result.chunks.length
          : 0;

      const resultText = [
        `Found ${(result.entities || []).length} entities and ${result.chunks.length} chunks:`,
        entitySummaries ? `\nEntities:\n${entitySummaries}` : '',
        chunkSummaries ? `\nChunks:\n${chunkSummaries}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      return {
        retrievedChunks: result.chunks,
        retrievedEntities: result.entities || [],
        toolResults: [
          {
            tool: 'entity_graph',
            result: resultText,
            score: avgScore,
          },
        ],
        agentSteps: [
          {
            node: 'entityGraphTool',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: {
              query,
              entitiesReturned: (result.entities || []).length,
              chunksReturned: result.chunks.length,
              avgScore,
            },
          },
        ],
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown entity graph error';

      return {
        toolResults: [
          {
            tool: 'entity_graph',
            result: `Entity graph retrieval failed: ${errorMsg}`,
            score: 0,
          },
        ],
        agentSteps: [
          {
            node: 'entityGraphTool',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: { error: errorMsg },
          },
        ],
      };
    }
  };
}
