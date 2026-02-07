import { AuditQueryStateType } from '../state/audit-query.state';
import { RagClientService } from '../rag-client/rag-client.service';

/**
 * Generate node — calls the RAG engine to produce an answer with citations.
 */
export function createGenerateNode(ragClient: RagClientService) {
  return async function generateNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // If no chunks were retrieved, abstain
    if (state.retrievedChunks.length === 0) {
      return {
        answer:
          'I could not find sufficient evidence in the available documents to answer this question. Please try rephrasing or uploading relevant documents.',
        citations: [],
        confidence: 0,
        explanation: 'No relevant chunks retrieved — abstaining.',
        agentSteps: [
          {
            node: 'generate',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: { abstained: true, reason: 'no_chunks' },
          },
        ],
      };
    }

    const result = await ragClient.generate({
      query: state.query,
      context: {
        chunks: state.retrievedChunks,
        entities: state.retrievedEntities,
      },
    });

    return {
      answer: result.answer,
      citations: result.citations,
      confidence: result.confidence,
      explanation: `Generated using ${result.model} with ${state.retrievedChunks.length} chunks in ${state.retrievalMode} mode.`,
      agentSteps: [
        {
          node: 'generate',
          startedAt,
          completedAt: new Date().toISOString(),
          metadata: {
            model: result.model,
            citationCount: result.citations.length,
            confidence: result.confidence,
          },
        },
      ],
    };
  };
}
