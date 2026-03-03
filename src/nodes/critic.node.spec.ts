import { createCriticNode } from './critic.node';
import { AuditQueryStateType } from '../state/audit-query.state';

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

import { ChatOpenAI } from '@langchain/openai';

function makeState(overrides: Partial<AuditQueryStateType> = {}): AuditQueryStateType {
  return {
    messages: [],
    query: 'Test audit query',
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
    agenticIterations: 1,
    ...overrides,
  } as AuditQueryStateType;
}

describe('criticNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return sufficient=true when evidence is strong', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        sufficient: true,
        groundednessScore: 0.9,
        completenessScore: 0.85,
        reason: 'Retrieved chunks fully address the query with strong grounding',
        nextAction: 'answer',
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const criticNode = createCriticNode();
    const state = makeState({
      toolResults: [{ tool: 'retrieve', result: 'Relevant audit findings...', score: 0.85 }],
    });
    const result = await criticNode(state);

    expect(result.criticEvaluations).toHaveLength(1);
    expect(result.criticEvaluations![0].sufficient).toBe(true);
    expect(result.criticEvaluations![0].groundednessScore).toBe(0.9);
    expect(result.criticEvaluations![0].nextAction).toBe('answer');
  });

  it('should return sufficient=false and suggest next action when more data needed', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        sufficient: false,
        groundednessScore: 0.4,
        completenessScore: 0.3,
        reason: 'Only partial coverage of query topics',
        nextAction: 'rlm_deep',
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const criticNode = createCriticNode();
    const state = makeState({
      toolResults: [{ tool: 'retrieve', result: 'Some data', score: 0.5 }],
    });
    const result = await criticNode(state);

    expect(result.criticEvaluations![0].sufficient).toBe(false);
    expect(result.criticEvaluations![0].nextAction).toBe('rlm_deep');
  });

  it('should fallback gracefully when LLM fails with existing results', async () => {
    const mockInvoke = jest.fn().mockRejectedValue(new Error('LLM error'));
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const criticNode = createCriticNode();
    const state = makeState({
      toolResults: [{ tool: 'retrieve', result: 'Data', score: 0.6 }],
    });
    const result = await criticNode(state);

    // With existing results, fallback allows answering
    expect(result.criticEvaluations![0].sufficient).toBe(true);
    expect(result.criticEvaluations![0].reason).toContain('Critic LLM failed');
  });

  it('should fallback to retrieve when LLM fails with no results', async () => {
    const mockInvoke = jest.fn().mockRejectedValue(new Error('LLM error'));
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const criticNode = createCriticNode();
    const state = makeState({ toolResults: [] });
    const result = await criticNode(state);

    expect(result.criticEvaluations![0].sufficient).toBe(false);
    expect(result.criticEvaluations![0].nextAction).toBe('retrieve');
  });

  it('should handle markdown-wrapped JSON response', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: '```json\n{"sufficient": true, "groundednessScore": 0.8, "completenessScore": 0.7, "reason": "ok", "nextAction": "answer"}\n```',
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const criticNode = createCriticNode();
    const result = await criticNode(makeState({
      toolResults: [{ tool: 'retrieve', result: 'data', score: 0.8 }],
    }));

    expect(result.criticEvaluations![0].sufficient).toBe(true);
    expect(result.criticEvaluations![0].groundednessScore).toBe(0.8);
  });

  it('should include agent step metadata', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        sufficient: false,
        groundednessScore: 0.5,
        completenessScore: 0.5,
        reason: 'Partial',
        nextAction: 'retrieve',
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const criticNode = createCriticNode();
    const result = await criticNode(makeState());

    expect(result.agentSteps).toHaveLength(1);
    expect(result.agentSteps![0].node).toBe('critic');
    expect(result.agentSteps![0].metadata).toHaveProperty('sufficient');
    expect(result.agentSteps![0].metadata).toHaveProperty('groundednessScore');
    expect(result.agentSteps![0].metadata).toHaveProperty('nextAction');
  });
});
