import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AuditQueryStateType } from '../state/audit-query.state';
import { getChatOpenAIConfig } from '../config/model-tiers.config';

// ---------------------------------------------------------------------------
// Mode-specific synthesis configuration
// ---------------------------------------------------------------------------

const SYNTHESIS_MODE_CONFIG: Record<string, { role: string; audience: string; domain: string }> = {
  audit: {
    role: 'senior audit communication specialist',
    audience: 'auditors',
    domain: 'the audit',
  },
  legal: {
    role: 'senior legal communication specialist',
    audience: 'legal professionals',
    domain: 'the legal matter',
  },
  compliance: {
    role: 'senior compliance communication specialist',
    audience: 'compliance officers',
    domain: 'the compliance program',
  },
};

function getSynthesisPrompt(mode: string): string {
  const cfg = SYNTHESIS_MODE_CONFIG[mode] || SYNTHESIS_MODE_CONFIG.audit;
  return `You are a ${cfg.role}. Your task is to
take the raw analytical output from a multi-step AI analysis and polish it into a clear,
professional response suitable for ${cfg.audience}.

Guidelines:
1. **Clarity**: Use clear, professional language appropriate for ${cfg.audience}
2. **Structure**: Organize the response with clear sections if needed
3. **Citations**: Preserve ALL citations in [CITE:chunk_id] format — do not remove or modify them
4. **Accuracy**: Do not add claims not supported by the source analysis
5. **Completeness**: Include all key findings from the source analysis
6. **Conciseness**: Remove redundancy while preserving substance
7. **Actionability**: Highlight key takeaways and implications for ${cfg.domain}

Output format:
- Begin with a direct answer to the query
- Support with evidence and citations
- End with any relevant caveats or limitations
- Keep citations inline using [CITE:chunk_id] format exactly as provided`;
}

// ---------------------------------------------------------------------------
// Node factory
// ---------------------------------------------------------------------------

/**
 * Synthesize node — polishes raw agentic loop output using frontier-tier model.
 *
 * This node is only invoked for complex queries that went through the agentic loop.
 * It takes the raw answer and refines it for auditor consumption using the frontier
 * (most capable) model tier.
 *
 * Graph position: agenticLoop → synthesize → guardrails
 */
export function createSynthesizeNode() {
  return async function synthesizeNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // Skip synthesis for sentinel/fallback answers from the security pipeline
    // (circuit breaker, kill switch, output guard). These should reach the
    // user verbatim — polishing them would obscure the operational signal.
    const SENTINEL_PREFIXES = [
      'The AI generation service is temporarily unavailable',
      'Generation disabled',
      '[Output redacted by safety controls]',
      'Access denied:',
      'RLM execution halted by kill switch',
    ];
    const isSentinel = SENTINEL_PREFIXES.some((p) =>
      state.answer.startsWith(p),
    );

    // Skip synthesis if no answer, simple query, or sentinel answer
    if (!state.answer || state.complexity !== 'complex' || isSentinel) {
      return {
        agentSteps: [
          {
            node: 'synthesize',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: {
              skipped: true,
              reason: !state.answer
                ? 'no_answer'
                : isSentinel
                  ? 'sentinel_passthrough'
                  : 'not_complex',
            },
          },
        ],
      };
    }

    // Build context for synthesis
    const analysisContext = buildAnalysisContext(state);

    // Use frontier-tier model for highest quality synthesis
    const llm = new ChatOpenAI(getChatOpenAIConfig('frontier'));

    const modeConfig = SYNTHESIS_MODE_CONFIG[state.mode] || SYNTHESIS_MODE_CONFIG.audit;
    const messages = [
      new SystemMessage(getSynthesisPrompt(state.mode)),
      new HumanMessage(`## Original Query
${state.query}

## Raw Analysis Output
${state.answer}

## Analysis Context
${analysisContext}

Please synthesize this into a polished, professional response for ${modeConfig.audience}.`),
    ];

    try {
      const response = await llm.invoke(messages);
      const synthesizedAnswer =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      return {
        answer: synthesizedAnswer,
        agentSteps: [
          {
            node: 'synthesize',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: {
              originalLength: state.answer.length,
              synthesizedLength: synthesizedAnswer.length,
              agenticIterations: state.agenticIterations,
              rlmIterations: state.rlmIterations,
              modelTier: 'frontier',
            },
          },
        ],
      };
    } catch (error) {
      // On synthesis failure, keep original answer but log the error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        // Keep original answer on failure
        agentSteps: [
          {
            node: 'synthesize',
            startedAt,
            completedAt: new Date().toISOString(),
            metadata: {
              error: errorMessage,
              fallback: 'kept_original_answer',
            },
          },
        ],
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Helper: build analysis context from state
// ---------------------------------------------------------------------------

function buildAnalysisContext(state: AuditQueryStateType): string {
  const parts: string[] = [];

  // Planning steps summary
  if (state.planningSteps && state.planningSteps.length > 0) {
    parts.push('### Planning Steps');
    state.planningSteps.forEach((step, i) => {
      parts.push(`${i + 1}. **${step.action}**: ${step.reasoning}`);
    });
  }

  // Critic evaluations summary
  if (state.criticEvaluations && state.criticEvaluations.length > 0) {
    parts.push('\n### Quality Evaluations');
    const lastEval = state.criticEvaluations[state.criticEvaluations.length - 1];
    parts.push(`- Groundedness: ${(lastEval.groundednessScore * 100).toFixed(0)}%`);
    parts.push(`- Completeness: ${(lastEval.completenessScore * 100).toFixed(0)}%`);
  }

  // RLM trace summary (if used)
  if (state.rlmTrace && state.rlmTrace.length > 0) {
    parts.push('\n### Deep Analysis Summary');
    parts.push(`- Iterations: ${state.rlmIterations}`);
    parts.push(`- Sub-calls: ${state.rlmSubCalls}`);
  }

  // Citations available
  if (state.citations && state.citations.length > 0) {
    parts.push('\n### Source Documents');
    parts.push(`${state.citations.length} document citations available`);
  }

  return parts.join('\n') || 'No additional context available.';
}
