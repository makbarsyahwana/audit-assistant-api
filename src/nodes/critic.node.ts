import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AuditQueryStateType } from '../state/audit-query.state';
import { getChatOpenAIConfig } from '../config/model-tiers.config';

// ---------------------------------------------------------------------------
// Critic system prompt
// ---------------------------------------------------------------------------

const CRITIC_SYSTEM_PROMPT = `You are the Critic agent in an audit-focused RAG system.
Your job is to evaluate the latest tool result and determine whether the accumulated
information is sufficient to answer the user's query.

Evaluation criteria:
1. **Groundedness**: Are the tool results grounded in actual documents/data? (0.0–1.0)
2. **Completeness**: Does the accumulated information fully address the user's query? (0.0–1.0)
3. **Sufficiency**: Is there enough evidence to produce a reliable answer?

If NOT sufficient, suggest the best next action:
- "retrieve": Need more document passages
- "rlm_deep": Need deeper multi-document analysis
- "entity_graph": Need entity relationship exploration
- "answer": Enough to answer (even if imperfect)

You MUST respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "sufficient": true | false,
  "groundednessScore": 0.0 to 1.0,
  "completenessScore": 0.0 to 1.0,
  "reason": "Brief explanation of your evaluation",
  "nextAction": "retrieve" | "rlm_deep" | "entity_graph" | "answer"
}`;

// ---------------------------------------------------------------------------
// Node factory
// ---------------------------------------------------------------------------

/**
 * Critic node — evaluates the latest tool result in the agentic loop.
 *
 * Checks groundedness, completeness, and sufficiency. Returns evaluation
 * that guides the planner's next decision.
 */
export function createCriticNode() {
  return async function criticNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // Build evaluation context
    const contextParts: string[] = [`Original Query: ${state.query}`];

    if (state.toolResults.length > 0) {
      contextParts.push('\nAll Tool Results:');
      for (const tr of state.toolResults) {
        const truncatedResult =
          tr.result.length > 800 ? tr.result.slice(0, 800) + '...' : tr.result;
        contextParts.push(
          `- [${tr.tool}] (score: ${tr.score}): ${truncatedResult}`,
        );
      }
    }

    if (state.retrievedChunks.length > 0) {
      contextParts.push(`\nRetrieved chunks: ${state.retrievedChunks.length}`);
    }

    contextParts.push(`\nAgentic iterations: ${state.agenticIterations}`);

    // Default evaluation
    let evaluation = {
      sufficient: false,
      groundednessScore: 0,
      completenessScore: 0,
      reason: 'No evaluation performed',
      nextAction: 'retrieve' as string,
    };

    try {
      const llm = new ChatOpenAI(getChatOpenAIConfig('mid'));

      const response = await llm.invoke([
        new SystemMessage(CRITIC_SYSTEM_PROMPT),
        new HumanMessage(contextParts.join('\n')),
      ]);

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      evaluation = {
        sufficient: parsed.sufficient ?? false,
        groundednessScore: parsed.groundednessScore ?? 0,
        completenessScore: parsed.completenessScore ?? 0,
        reason: parsed.reason || '',
        nextAction: parsed.nextAction || 'answer',
      };
    } catch (err) {
      // Fallback: if critic LLM fails, allow answering if we have any results
      const hasResults = state.toolResults.length > 0;
      evaluation = {
        sufficient: hasResults,
        groundednessScore: hasResults ? 0.5 : 0,
        completenessScore: hasResults ? 0.5 : 0,
        reason: `Critic LLM failed (${err instanceof Error ? err.message : 'unknown'}), ${hasResults ? 'proceeding with available data' : 'no data available'}`,
        nextAction: hasResults ? 'answer' : 'retrieve',
      };
    }

    return {
      criticEvaluations: [evaluation],
      agentSteps: [
        {
          node: 'critic',
          startedAt,
          completedAt: new Date().toISOString(),
          metadata: {
            sufficient: evaluation.sufficient,
            groundednessScore: evaluation.groundednessScore,
            completenessScore: evaluation.completenessScore,
            nextAction: evaluation.nextAction,
            iteration: state.agenticIterations,
          },
        },
      ],
    };
  };
}
