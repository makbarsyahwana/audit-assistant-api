import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AuditQueryStateType } from '../state/audit-query.state';
import { RagClientService } from '../rag-client/rag-client.service';
import { getChatOpenAIConfig } from '../config/model-tiers.config';

// ---------------------------------------------------------------------------
// Planner system prompt
// ---------------------------------------------------------------------------

const PLANNER_SYSTEM_PROMPT = `You are the Planner agent in an audit-focused RAG system.
Your job is to decide the NEXT action to take to answer the user's audit query.

Available actions:
- "retrieve": Standard RAG retrieval (vector/fulltext/hybrid search). Use when you need to find specific documents or passages.
- "rlm_deep": Deep multi-document analysis via the Recursive Language Model engine. Use when the query requires cross-document reasoning, gap analysis, trend analysis, or multi-step computation.
- "entity_graph": Entity-centric graph traversal. Use when the query involves relationships between entities, standards, controls, or organizational structures.
- "answer": You have enough information to produce a final answer. Use when tool results are sufficient.
- "stop": Cannot answer — insufficient data or out of scope. Use as a last resort.

Context provided to you:
- The original user query
- Previous tool results (if any)
- Previous critic feedback (if any)

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) in this format:
{
  "action": "retrieve" | "rlm_deep" | "entity_graph" | "answer" | "stop",
  "reasoning": "Brief explanation of why this action is chosen",
  "query": "Refined query for the tool (can be the original or a more targeted version)",
  "estimatedCompleteness": 0.0 to 1.0
}`;

// ---------------------------------------------------------------------------
// Node factory
// ---------------------------------------------------------------------------

/**
 * Planner node — decides the next action in the agentic loop.
 *
 * Examines query, previous tool results, and critic feedback to select
 * the best next tool or decide to answer/stop.
 */
export function createPlannerNode(_ragClient: RagClientService) {
  return async function plannerNode(
    state: AuditQueryStateType,
  ): Promise<Partial<AuditQueryStateType>> {
    const startedAt = new Date().toISOString();

    // Build context for the planner
    const contextParts: string[] = [`User Query: ${state.query}`];

    if (state.toolResults.length > 0) {
      contextParts.push('\nPrevious Tool Results:');
      for (const tr of state.toolResults) {
        const truncatedResult =
          tr.result.length > 500 ? tr.result.slice(0, 500) + '...' : tr.result;
        contextParts.push(
          `- [${tr.tool}] (score: ${tr.score}): ${truncatedResult}`,
        );
      }
    }

    if (state.criticEvaluations.length > 0) {
      const lastCritic =
        state.criticEvaluations[state.criticEvaluations.length - 1];
      contextParts.push(
        `\nLatest Critic Feedback:\n- Sufficient: ${lastCritic.sufficient}\n- Groundedness: ${lastCritic.groundednessScore}\n- Completeness: ${lastCritic.completenessScore}\n- Reason: ${lastCritic.reason}\n- Suggested next: ${lastCritic.nextAction}`,
      );
    }

    contextParts.push(
      `\nAgentic iterations so far: ${state.agenticIterations}`,
    );

    // Call LLM for planning decision
    let action = 'retrieve';
    let reasoning = 'Default: start with retrieval';
    let query = state.query;
    let estimatedCompleteness = 0;

    try {
      const llm = new ChatOpenAI(getChatOpenAIConfig('mid'));

      const response = await llm.invoke([
        new SystemMessage(PLANNER_SYSTEM_PROMPT),
        new HumanMessage(contextParts.join('\n')),
      ]);

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // Parse JSON response (strip markdown fences if present)
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      action = parsed.action || 'retrieve';
      reasoning = parsed.reasoning || '';
      query = parsed.query || state.query;
      estimatedCompleteness = parsed.estimatedCompleteness || 0;
    } catch (err) {
      // Fallback: if planner LLM fails, default to retrieve on first iteration,
      // answer on subsequent iterations
      if (state.agenticIterations === 0) {
        action = 'retrieve';
        reasoning = `Planner LLM failed (${err instanceof Error ? err.message : 'unknown'}), defaulting to retrieve`;
      } else {
        action = 'answer';
        reasoning = `Planner LLM failed (${err instanceof Error ? err.message : 'unknown'}), defaulting to answer with available data`;
      }
    }

    const planStep = {
      action,
      reasoning,
      query,
      estimatedCompleteness,
      timestamp: new Date().toISOString(),
    };

    return {
      planningSteps: [planStep],
      agenticIterations: state.agenticIterations + 1,
      agentSteps: [
        {
          node: 'planner',
          startedAt,
          completedAt: new Date().toISOString(),
          metadata: {
            action,
            reasoning,
            estimatedCompleteness,
            iteration: state.agenticIterations + 1,
          },
        },
      ],
    };
  };
}
