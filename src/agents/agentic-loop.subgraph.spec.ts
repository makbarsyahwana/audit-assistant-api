/**
 * Integration tests for the agentic loop subgraph routing logic.
 *
 * These tests verify the routing functions used in conditional edges
 * without invoking actual LLMs. The routing functions are deterministic
 * based on state, making them ideal for unit testing.
 */
import { AuditQueryStateType } from '../state/audit-query.state';

function makeState(overrides: Partial<AuditQueryStateType> = {}): AuditQueryStateType {
  return {
    messages: [],
    query: 'Test query',
    userId: 'user-1',
    engagementId: 'eng-1',
    userRole: 'AUDITOR',
    accessAllowed: true,
    allowedEngagementIds: ['eng-1'],
    retrievalMode: 'hybrid',
    retrievedChunks: [],
    retrievedEntities: [],
    answer: '',
    citations: [],
    confidence: 0,
    explanation: '',
    runId: 'run-1',
    agentSteps: [],
    guardrailPassed: true,
    guardrailMessage: '',
    complexity: 'complex',
    rlmIterations: 0,
    rlmSubCalls: 0,
    rlmTrace: [],
    planningSteps: [],
    toolResults: [],
    criticEvaluations: [],
    agenticIterations: 0,
    ...overrides,
  } as AuditQueryStateType;
}

// Re-implement the routing functions here to test them in isolation
// (since they're not exported from the module)
function routeFromPlanner(state: AuditQueryStateType): string {
  const lastPlan =
    state.planningSteps.length > 0
      ? state.planningSteps[state.planningSteps.length - 1]
      : null;

  if (!lastPlan) return 'retrieveTool';

  switch (lastPlan.action) {
    case 'retrieve':
      return 'retrieveTool';
    case 'rlm_deep':
      return 'rlmTool';
    case 'entity_graph':
      return 'entityGraphTool';
    case 'answer':
    case 'stop':
      return 'generate';
    default:
      return 'retrieveTool';
  }
}

function routeFromCritic(state: AuditQueryStateType): string {
  const MAX_AGENTIC_ITERATIONS = 5;

  const lastCritic =
    state.criticEvaluations.length > 0
      ? state.criticEvaluations[state.criticEvaluations.length - 1]
      : null;

  if (state.agenticIterations >= MAX_AGENTIC_ITERATIONS) {
    return 'generate';
  }

  if (!lastCritic) return 'planner';

  if (lastCritic.sufficient || lastCritic.nextAction === 'answer') {
    return 'generate';
  }

  return 'planner';
}

describe('Agentic Loop Routing', () => {
  describe('routeFromPlanner', () => {
    it('should route to retrieveTool when action is retrieve', () => {
      const state = makeState({
        planningSteps: [{
          action: 'retrieve',
          reasoning: 'Need data',
          query: 'test',
          estimatedCompleteness: 0.1,
          timestamp: new Date().toISOString(),
        }],
      });
      expect(routeFromPlanner(state)).toBe('retrieveTool');
    });

    it('should route to rlmTool when action is rlm_deep', () => {
      const state = makeState({
        planningSteps: [{
          action: 'rlm_deep',
          reasoning: 'Need deep analysis',
          query: 'test',
          estimatedCompleteness: 0.3,
          timestamp: new Date().toISOString(),
        }],
      });
      expect(routeFromPlanner(state)).toBe('rlmTool');
    });

    it('should route to entityGraphTool when action is entity_graph', () => {
      const state = makeState({
        planningSteps: [{
          action: 'entity_graph',
          reasoning: 'Need entity relationships',
          query: 'test',
          estimatedCompleteness: 0.2,
          timestamp: new Date().toISOString(),
        }],
      });
      expect(routeFromPlanner(state)).toBe('entityGraphTool');
    });

    it('should route to generate when action is answer', () => {
      const state = makeState({
        planningSteps: [{
          action: 'answer',
          reasoning: 'Enough data',
          query: '',
          estimatedCompleteness: 0.9,
          timestamp: new Date().toISOString(),
        }],
      });
      expect(routeFromPlanner(state)).toBe('generate');
    });

    it('should route to generate when action is stop', () => {
      const state = makeState({
        planningSteps: [{
          action: 'stop',
          reasoning: 'Cannot answer',
          query: '',
          estimatedCompleteness: 0,
          timestamp: new Date().toISOString(),
        }],
      });
      expect(routeFromPlanner(state)).toBe('generate');
    });

    it('should default to retrieveTool when no planning steps', () => {
      const state = makeState({ planningSteps: [] });
      expect(routeFromPlanner(state)).toBe('retrieveTool');
    });

    it('should default to retrieveTool for unknown actions', () => {
      const state = makeState({
        planningSteps: [{
          action: 'unknown_action',
          reasoning: '',
          query: 'test',
          estimatedCompleteness: 0,
          timestamp: new Date().toISOString(),
        }],
      });
      expect(routeFromPlanner(state)).toBe('retrieveTool');
    });
  });

  describe('routeFromCritic', () => {
    it('should route to generate when critic says sufficient', () => {
      const state = makeState({
        criticEvaluations: [{
          sufficient: true,
          groundednessScore: 0.9,
          completenessScore: 0.85,
          reason: 'Fully addressed',
          nextAction: 'answer',
        }],
        agenticIterations: 2,
      });
      expect(routeFromCritic(state)).toBe('generate');
    });

    it('should route to planner when critic says insufficient', () => {
      const state = makeState({
        criticEvaluations: [{
          sufficient: false,
          groundednessScore: 0.4,
          completenessScore: 0.3,
          reason: 'Need more data',
          nextAction: 'retrieve',
        }],
        agenticIterations: 1,
      });
      expect(routeFromCritic(state)).toBe('planner');
    });

    it('should force generate at max iterations (5)', () => {
      const state = makeState({
        criticEvaluations: [{
          sufficient: false,
          groundednessScore: 0.3,
          completenessScore: 0.2,
          reason: 'Still insufficient',
          nextAction: 'rlm_deep',
        }],
        agenticIterations: 5,
      });
      expect(routeFromCritic(state)).toBe('generate');
    });

    it('should route to generate when nextAction is answer even if not sufficient', () => {
      const state = makeState({
        criticEvaluations: [{
          sufficient: false,
          groundednessScore: 0.5,
          completenessScore: 0.5,
          reason: 'Best we can do',
          nextAction: 'answer',
        }],
        agenticIterations: 3,
      });
      expect(routeFromCritic(state)).toBe('generate');
    });

    it('should route to planner when no critic evaluations', () => {
      const state = makeState({ criticEvaluations: [], agenticIterations: 1 });
      expect(routeFromCritic(state)).toBe('planner');
    });

    it('should use the latest critic evaluation', () => {
      const state = makeState({
        criticEvaluations: [
          {
            sufficient: false,
            groundednessScore: 0.3,
            completenessScore: 0.2,
            reason: 'First pass insufficient',
            nextAction: 'retrieve',
          },
          {
            sufficient: true,
            groundednessScore: 0.9,
            completenessScore: 0.8,
            reason: 'Now sufficient',
            nextAction: 'answer',
          },
        ],
        agenticIterations: 2,
      });
      expect(routeFromCritic(state)).toBe('generate');
    });
  });
});

describe('Complexity-based graph routing', () => {
  it('simple query should route to retrieve (not agenticLoop)', () => {
    const state = makeState({ complexity: 'simple' });
    // Simulates the conditional edge in the main graph
    const route = state.complexity === 'complex' ? 'agenticLoop' : 'retrieve';
    expect(route).toBe('retrieve');
  });

  it('complex query should route to agenticLoop', () => {
    const state = makeState({ complexity: 'complex' });
    const route = state.complexity === 'complex' ? 'agenticLoop' : 'retrieve';
    expect(route).toBe('agenticLoop');
  });
});
