import { AuditQueryStateType } from '../state/audit-query.state';
import { RagClientService } from '../rag-client/rag-client.service';

/**
 * Retrieve node — calls the RAG engine to fetch relevant chunks and entities.
 *
 * The RagClientService is injected via the graph config at compile time.
 */
export function createRetrieveNode(ragClient: RagClientService) {
  return async function retrieveNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    const result = await ragClient.retrieve({
      query: state.query,
      engagementId: state.engagementId,
      mode: state.retrievalMode as any,
      filters: {
        engagement_id: state.engagementId,
      },
      topK: 10,
    });

    return {
      retrievedChunks: result.chunks,
      retrievedEntities: result.entities || [],
      agentSteps: [
        {
          node: 'retrieve',
          startedAt,
          completedAt: new Date().toISOString(),
          metadata: {
            mode: state.retrievalMode,
            chunksReturned: result.chunks.length,
            entitiesReturned: result.entities?.length || 0,
          },
        },
      ],
    };
  };
}
