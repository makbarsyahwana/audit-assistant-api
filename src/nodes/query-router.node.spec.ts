import { queryRouterNode } from './query-router.node';
import { classifyRetrievalMode } from './retrieval-mode-classifier';
import { AuditQueryStateType } from '../state/audit-query.state';

function makeState(overrides: Partial<AuditQueryStateType> = {}): AuditQueryStateType {
  return {
    messages: [],
    query: '',
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
    complexity: 'simple',
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

describe('queryRouterNode', () => {
  describe('retrieval mode classification', () => {
    it('should classify clause queries as fulltext', async () => {
      const state = makeState({ query: 'What does clause 4.2 say?' });
      const result = await queryRouterNode(state);
      expect(result.retrievalMode).toBe('fulltext');
    });

    it('should classify ISO queries as fulltext', async () => {
      const state = makeState({ query: 'ISO 27001 requirements' });
      const result = await queryRouterNode(state);
      expect(result.retrievalMode).toBe('fulltext');
    });

    it('should classify relationship queries as graph_vector', async () => {
      const state = makeState({ query: 'What entities are related to the payroll process?' });
      const result = await queryRouterNode(state);
      expect(result.retrievalMode).toBe('graph_vector');
    });

    it('should classify short queries as fulltext', async () => {
      const state = makeState({ query: 'audit risk' });
      const result = await queryRouterNode(state);
      expect(result.retrievalMode).toBe('fulltext');
    });

    it('should default to hybrid for general queries', async () => {
      const state = makeState({ query: 'How should we approach the financial audit for Q3?' });
      const result = await queryRouterNode(state);
      expect(result.retrievalMode).toBe('hybrid');
    });
  });

  describe('complexity classification', () => {
    it('should classify simple factual queries as simple', async () => {
      const state = makeState({ query: 'What is the audit period?' });
      const result = await queryRouterNode(state);
      expect(result.complexity).toBe('simple');
    });

    it('should classify cross-document comparison as complex', async () => {
      const state = makeState({
        query: 'Compare the risk assessment findings across multiple departments and analyze the compliance gaps',
      });
      const result = await queryRouterNode(state);
      expect(result.complexity).toBe('complex');
    });

    it('should classify gap analysis queries as complex', async () => {
      const state = makeState({
        query: 'Perform a comprehensive gap analysis of our compliance status against ISO 27001',
      });
      const result = await queryRouterNode(state);
      expect(result.complexity).toBe('complex');
    });

    it('should classify multi-step analytical queries as complex', async () => {
      const state = makeState({
        query: 'Analyze the root cause of the recurring findings and summarize the trends across all audit periods',
      });
      const result = await queryRouterNode(state);
      expect(result.complexity).toBe('complex');
    });

    it('should default to simple for ambiguous queries', async () => {
      const state = makeState({ query: 'Tell me about internal controls' });
      const result = await queryRouterNode(state);
      expect(result.complexity).toBe('simple');
    });
  });

  it('should include agent step metadata', async () => {
    const state = makeState({ query: 'Test query' });
    const result = await queryRouterNode(state);
    expect(result.agentSteps).toHaveLength(1);
    expect(result.agentSteps![0].node).toBe('queryRouter');
    expect(result.agentSteps![0].metadata).toHaveProperty('complexity');
    expect(result.agentSteps![0].metadata).toHaveProperty('complexityScore');
  });
});

describe('classifyRetrievalMode (direct)', () => {
  it('should return fulltext for clause references', () => {
    expect(classifyRetrievalMode('What does clause 4.2 say?')).toBe('fulltext');
  });

  it('should return fulltext for ISO queries', () => {
    expect(classifyRetrievalMode('ISO 27001 requirements')).toBe('fulltext');
  });

  it('should return fulltext for control id queries', () => {
    expect(classifyRetrievalMode('Show me control id AC-01')).toBe('fulltext');
  });

  it('should return graph_vector for relationship queries', () => {
    expect(classifyRetrievalMode('What entities are related to payroll?')).toBe('graph_vector');
  });

  it('should return graph_vector for "connected to" queries', () => {
    expect(classifyRetrievalMode('What processes are connected to billing?')).toBe('graph_vector');
  });

  it('should return fulltext for short queries', () => {
    expect(classifyRetrievalMode('audit risk')).toBe('fulltext');
  });

  it('should return hybrid for general queries', () => {
    expect(classifyRetrievalMode('How should we approach the financial audit for Q3?')).toBe('hybrid');
  });
});
