import { AuditQueryStateType } from '../state/audit-query.state';

// ---------------------------------------------------------------------------
// Complexity classification heuristics
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate a query requires multi-step reasoning, cross-document
 * analysis, or deep analytical work — i.e. "complex" queries best handled by
 * the agentic loop + RLM engine.
 */
const COMPLEX_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  // Multi-document / cross-reference signals
  { pattern: /compar(e|ing|ison)/i, weight: 2 },
  { pattern: /across\s+(multiple|all|different)/i, weight: 2 },
  { pattern: /difference(s)?\s+between/i, weight: 2 },
  { pattern: /correlat(e|ion)/i, weight: 2 },

  // Analytical / reasoning signals
  { pattern: /analyz(e|ing|sis)/i, weight: 1.5 },
  { pattern: /evaluat(e|ing|ion)/i, weight: 1.5 },
  { pattern: /assess(ment|ing)?/i, weight: 1 },
  { pattern: /implication(s)?/i, weight: 1.5 },
  { pattern: /root\s+cause/i, weight: 2 },
  { pattern: /trend(s)?/i, weight: 1.5 },
  { pattern: /pattern(s)?/i, weight: 1 },

  // Multi-step / aggregation signals
  { pattern: /summariz(e|ing)/i, weight: 1.5 },
  { pattern: /consolidat(e|ing)/i, weight: 2 },
  { pattern: /how\s+many/i, weight: 1 },
  { pattern: /list\s+all/i, weight: 1.5 },
  { pattern: /step[- ]by[- ]step/i, weight: 2 },
  { pattern: /comprehensive/i, weight: 1.5 },

  // Gap / risk / compliance signals
  { pattern: /gap(s)?\s+(analysis|assessment)/i, weight: 2 },
  { pattern: /risk\s+(assessment|evaluation|analysis)/i, weight: 2 },
  { pattern: /compliance\s+(gap|status|matrix)/i, weight: 2 },
  { pattern: /remediat(e|ion)/i, weight: 1.5 },
  { pattern: /finding(s)?\s+(across|from\s+multiple)/i, weight: 2 },
];

/** Complexity score threshold above which a query is classified as complex. */
const COMPLEXITY_THRESHOLD = 3;

/**
 * Score a query's complexity based on weighted pattern matching.
 * Returns a numeric score; higher = more complex.
 */
function scoreComplexity(query: string): number {
  let score = 0;
  for (const { pattern, weight } of COMPLEX_PATTERNS) {
    if (pattern.test(query)) {
      score += weight;
    }
  }
  // Long queries with multiple sentences are more likely complex
  const sentenceCount = query.split(/[.?!;]/).filter((s) => s.trim()).length;
  if (sentenceCount >= 3) score += 1;
  if (query.length > 200) score += 1;
  return score;
}

// ---------------------------------------------------------------------------
// Retrieval mode classification (existing logic, unchanged)
// ---------------------------------------------------------------------------

function classifyRetrievalMode(query: string): string {
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

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

/**
 * Query router node — classifies the user query to select retrieval mode
 * and determine complexity (simple vs complex).
 *
 * Modes: vector | fulltext | graph | graph_vector | hybrid
 * Complexity: simple (existing path) | complex (agentic loop)
 */
export async function queryRouterNode(
  state: AuditQueryStateType,
): Promise<Partial<AuditQueryStateType>> {
  const startedAt = new Date().toISOString();

  const mode = classifyRetrievalMode(state.query);
  const complexityScore = scoreComplexity(state.query);
  const complexity: 'simple' | 'complex' =
    complexityScore >= COMPLEXITY_THRESHOLD ? 'complex' : 'simple';

  return {
    retrievalMode: mode,
    complexity,
    agentSteps: [
      {
        node: 'queryRouter',
        startedAt,
        completedAt: new Date().toISOString(),
        metadata: {
          selectedMode: mode,
          complexity,
          complexityScore,
          queryLength: state.query.length,
        },
      },
    ],
  };
}
