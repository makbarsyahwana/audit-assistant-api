/**
 * Heuristic classifier that picks a retrieval mode based on query content.
 *
 * Exported separately so it can be unit-tested without invoking the full
 * query-router node (which carries LangGraph state concerns).
 */

/**
 * Classify a user query into a retrieval mode.
 *
 * - fulltext: structured references (clause numbers, ISO standards, control IDs)
 *             or very short queries best served by keyword matching.
 * - graph_vector: relationship / entity-centric queries.
 * - hybrid (default): general natural-language queries.
 */
export function classifyRetrievalMode(query: string): string {
  const q = query.toLowerCase();

  if (
    q.includes('clause') ||
    q.includes('section') ||
    q.match(/\b\d+\.\d+/) ||
    q.includes('iso') ||
    q.includes('control id')
  ) {
    return 'fulltext';
  }

  if (
    q.includes('relationship') ||
    q.includes('connected to') ||
    q.includes('related to') ||
    q.includes('entity') ||
    q.includes('who owns')
  ) {
    return 'graph_vector';
  }

  if (q.length < 20) {
    return 'fulltext';
  }

  return 'hybrid';
}
