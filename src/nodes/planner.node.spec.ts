import { createPlannerNode } from './planner.node';
import { AuditQueryStateType } from '../state/audit-query.state';
import { RagClientService } from '../rag-client/rag-client.service';

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
    agenticIterations: 0,
    ...overrides,
  } as AuditQueryStateType;
}

const mockRagClient = {} as RagClientService;

describe('plannerNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return retrieve action when LLM suggests retrieve', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        action: 'retrieve',
        reasoning: 'Need to find relevant documents first',
        query: 'audit risk assessment findings',
        estimatedCompleteness: 0.1,
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const plannerNode = createPlannerNode(mockRagClient);
    const result = await plannerNode(makeState());

    expect(result.planningSteps).toHaveLength(1);
    expect(result.planningSteps![0].action).toBe('retrieve');
    expect(result.agenticIterations).toBe(1);
  });

  it('should return rlm_deep action for deep analysis', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        action: 'rlm_deep',
        reasoning: 'Cross-document analysis needed',
        query: 'compare findings across departments',
        estimatedCompleteness: 0.3,
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const plannerNode = createPlannerNode(mockRagClient);
    const state = makeState({
      toolResults: [{ tool: 'retrieve', result: 'Some chunks found', score: 0.7 }],
      agenticIterations: 1,
    });
    const result = await plannerNode(state);

    expect(result.planningSteps![0].action).toBe('rlm_deep');
    expect(result.agenticIterations).toBe(2);
  });

  it('should return answer action when sufficient data gathered', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        action: 'answer',
        reasoning: 'Sufficient evidence gathered',
        query: '',
        estimatedCompleteness: 0.9,
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const plannerNode = createPlannerNode(mockRagClient);
    const result = await plannerNode(makeState());

    expect(result.planningSteps![0].action).toBe('answer');
  });

  it('should fallback to retrieve on first iteration if LLM fails', async () => {
    const mockInvoke = jest.fn().mockRejectedValue(new Error('LLM timeout'));
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const plannerNode = createPlannerNode(mockRagClient);
    const result = await plannerNode(makeState({ agenticIterations: 0 }));

    expect(result.planningSteps![0].action).toBe('retrieve');
    expect(result.planningSteps![0].reasoning).toContain('Planner LLM failed');
  });

  it('should fallback to answer on subsequent iterations if LLM fails', async () => {
    const mockInvoke = jest.fn().mockRejectedValue(new Error('LLM timeout'));
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const plannerNode = createPlannerNode(mockRagClient);
    const result = await plannerNode(makeState({ agenticIterations: 2 }));

    expect(result.planningSteps![0].action).toBe('answer');
  });

  it('should include critic feedback in context when available', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        action: 'rlm_deep',
        reasoning: 'Critic says need deeper analysis',
        query: 'refined query',
        estimatedCompleteness: 0.5,
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const plannerNode = createPlannerNode(mockRagClient);
    const state = makeState({
      criticEvaluations: [
        {
          sufficient: false,
          groundednessScore: 0.6,
          completenessScore: 0.4,
          reason: 'Need more cross-document analysis',
          nextAction: 'rlm_deep',
        },
      ],
      agenticIterations: 1,
    });
    await plannerNode(state);

    // Verify the LLM was called with context containing critic feedback
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const callArgs = mockInvoke.mock.calls[0][0];
    const humanMsg = callArgs.find((m: any) => m.constructor.name === 'HumanMessage');
    expect(humanMsg.content).toContain('Critic Feedback');
  });

  it('should record agent step metadata', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: JSON.stringify({
        action: 'retrieve',
        reasoning: 'Start',
        query: 'test',
        estimatedCompleteness: 0,
      }),
    });
    (ChatOpenAI as unknown as jest.Mock).mockImplementation(() => ({ invoke: mockInvoke }));

    const plannerNode = createPlannerNode(mockRagClient);
    const result = await plannerNode(makeState());

    expect(result.agentSteps).toHaveLength(1);
    expect(result.agentSteps![0].node).toBe('planner');
    expect(result.agentSteps![0].metadata).toHaveProperty('action', 'retrieve');
    expect(result.agentSteps![0].metadata).toHaveProperty('iteration', 1);
  });
});
