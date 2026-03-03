import { createSynthesizeNode } from './synthesize.node';
import { AuditQueryStateType } from '../state/audit-query.state';

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: 'Synthesized professional response with [CITE:chunk_001] citation.',
    }),
  })),
}));

// Mock model tier config
jest.mock('../config/model-tiers.config', () => ({
  getChatOpenAIConfig: jest.fn().mockReturnValue({
    modelName: 'gpt-4o',
    temperature: 0.3,
  }),
}));

describe('synthesizeNode', () => {
  const synthesizeNode = createSynthesizeNode();

  const createBaseState = (): AuditQueryStateType =>
    ({
      query: 'Compare ISO 27001 controls across departments',
      complexity: 'complex',
      answer: 'Raw analysis: Found 3 gaps in IT dept [CITE:chunk_001], 2 gaps in HR [CITE:chunk_002].',
      citations: [
        { chunkId: 'chunk_001', documentName: 'IT Audit.pdf', score: 0.92 },
        { chunkId: 'chunk_002', documentName: 'HR Audit.pdf', score: 0.88 },
      ],
      planningSteps: [
        { action: 'retrieve', reasoning: 'Get ISO controls', query: 'ISO controls', estimatedCompleteness: 0.3, timestamp: '2024-01-01T00:00:00Z' },
        { action: 'rlm_deep', reasoning: 'Deep analysis needed', query: 'Compare gaps', estimatedCompleteness: 0.8, timestamp: '2024-01-01T00:01:00Z' },
      ],
      criticEvaluations: [
        { sufficient: true, groundednessScore: 0.9, completenessScore: 0.85, reason: 'Good coverage', nextAction: 'answer' },
      ],
      agenticIterations: 2,
      rlmIterations: 3,
      rlmSubCalls: 1,
      rlmTrace: [
        { iteration: 1, code: 'results = rag_retrieve(...)', stdoutMeta: 'Retrieved 10 chunks' },
      ],
      agentSteps: [],
      messages: [],
      userId: 'user_001',
      engagementId: 'eng_001',
      userRole: 'AUDITOR',
      accessAllowed: true,
      allowedEngagementIds: ['eng_001'],
      retrievalMode: 'hybrid',
      retrievedChunks: [],
      retrievedEntities: [],
      confidence: 0.85,
      explanation: '',
      runId: 'run_001',
      guardrailPassed: true,
      guardrailMessage: '',
      toolResults: [],
    }) as unknown as AuditQueryStateType;

  it('should synthesize complex query answer using frontier model', async () => {
    const state = createBaseState();
    const result = await synthesizeNode(state);

    expect(result.answer).toContain('Synthesized professional response');
    expect(result.answer).toContain('[CITE:chunk_001]');
    expect(result.agentSteps).toHaveLength(1);
    expect(result.agentSteps![0].node).toBe('synthesize');
    expect(result.agentSteps![0].metadata).toMatchObject({
      modelTier: 'frontier',
      agenticIterations: 2,
      rlmIterations: 3,
    });
  });

  it('should skip synthesis for simple queries', async () => {
    const state = {
      ...createBaseState(),
      complexity: 'simple' as const,
    };

    const result = await synthesizeNode(state);

    expect(result.answer).toBeUndefined(); // Answer not modified
    expect(result.agentSteps![0].metadata).toMatchObject({
      skipped: true,
      reason: 'not_complex',
    });
  });

  it('should skip synthesis when no answer exists', async () => {
    const state = {
      ...createBaseState(),
      answer: '',
    };

    const result = await synthesizeNode(state);

    expect(result.agentSteps![0].metadata).toMatchObject({
      skipped: true,
      reason: 'no_answer',
    });
  });

  it('should preserve original answer on synthesis error', async () => {
    // Mock error
    const { ChatOpenAI } = require('@langchain/openai');
    ChatOpenAI.mockImplementationOnce(() => ({
      invoke: jest.fn().mockRejectedValue(new Error('LLM unavailable')),
    }));

    const state = createBaseState();
    const result = await synthesizeNode(state);

    // Answer should NOT be in result (keeps original)
    expect(result.answer).toBeUndefined();
    expect(result.agentSteps![0].metadata).toMatchObject({
      error: 'LLM unavailable',
      fallback: 'kept_original_answer',
    });
  });

  it('should include analysis context in synthesis prompt', async () => {
    const { ChatOpenAI } = require('@langchain/openai');
    let capturedMessages: any[] = [];
    ChatOpenAI.mockImplementationOnce(() => ({
      invoke: jest.fn().mockImplementation((messages) => {
        capturedMessages = messages;
        return Promise.resolve({ content: 'Synthesized response' });
      }),
    }));

    const state = createBaseState();
    await synthesizeNode(state);

    // Check that the human message contains analysis context
    const humanMessage = capturedMessages.find(
      (m) => m.constructor.name === 'HumanMessage',
    );
    expect(humanMessage).toBeDefined();
    expect(humanMessage.content).toContain('Planning Steps');
    expect(humanMessage.content).toContain('Quality Evaluations');
    expect(humanMessage.content).toContain('Deep Analysis Summary');
  });

  it('should track original and synthesized length in metadata', async () => {
    const state = createBaseState();
    const result = await synthesizeNode(state);

    const metadata = result.agentSteps?.[0]?.metadata as Record<string, unknown>;
    expect(metadata?.originalLength).toBe(state.answer.length);
    expect(metadata?.synthesizedLength).toBeGreaterThan(0);
  });
});

describe('getChatOpenAIConfig usage', () => {
  it('should use frontier tier for synthesis', async () => {
    const { getChatOpenAIConfig } = require('../config/model-tiers.config');
    getChatOpenAIConfig.mockClear();

    const synthesizeNode = createSynthesizeNode();
    const state = {
      query: 'Test query',
      complexity: 'complex',
      answer: 'Test answer',
      citations: [],
      planningSteps: [],
      criticEvaluations: [],
      agenticIterations: 1,
      rlmIterations: 0,
      rlmSubCalls: 0,
      rlmTrace: [],
      agentSteps: [],
    } as unknown as AuditQueryStateType;

    await synthesizeNode(state);

    expect(getChatOpenAIConfig).toHaveBeenCalledWith('frontier');
  });
});
