import { AuditQueryStateType } from '../state/audit-query.state';

/**
 * Query router node — classifies the user query to select retrieval mode.
 *
 * Modes: vector | fulltext | graph | graph_vector | hybrid
 */
export async function queryRouterNode(
  state: AuditQueryStateType,
): Promise<Partial<AuditQueryStateType>> {
  const startedAt = new Date().toISOString();
  const query = state.query.toLowerCase();

  let mode = 'hybrid';

  // Simple heuristic routing (can be replaced by LLM-based classification)
  if (
    query.includes('clause') ||
    query.includes('section') ||
    query.match(/\b\d+\.\d+/) ||
    query.includes('iso') ||
    query.includes('control id')
  ) {
    // Specific clause/control references → fulltext for exact matching
    mode = 'fulltext';
  } else if (
    query.includes('relationship') ||
    query.includes('connected to') ||
    query.includes('related to') ||
    query.includes('entity') ||
    query.includes('who owns')
  ) {
    // Entity/relationship queries → graph traversal
    mode = 'graph_vector';
  } else if (query.length < 20) {
    // Short keyword-style queries → fulltext
    mode = 'fulltext';
  }

  return {
    retrievalMode: mode,
    agentSteps: [
      {
        node: 'queryRouter',
        startedAt,
        completedAt: new Date().toISOString(),
        metadata: { selectedMode: mode, queryLength: state.query.length },
      },
    ],
  };
}
