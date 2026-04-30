import { StateGraph, END } from '@langchain/langgraph';
import { AuditQueryState, AuditQueryStateType } from '../state/audit-query.state';
import { createPlannerNode } from '../nodes/planner.node';
import { createCriticNode } from '../nodes/critic.node';
import { createRetrieveToolNode } from '../nodes/tools/retrieve-tool.node';
import { createRlmToolNode } from '../nodes/tools/rlm-tool.node';
import { createEntityGraphToolNode } from '../nodes/tools/entity-graph-tool.node';
import { createGenerateNode } from '../nodes/generate.node';
import { RagClientService } from '../rag-client/rag-client.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of planner → tool → critic iterations before forced exit. */
export const MAX_AGENTIC_ITERATIONS = 5;

// ---------------------------------------------------------------------------
// Routing functions
// ---------------------------------------------------------------------------

/**
 * Route from planner to the appropriate tool node (or END).
 *
 * Reads the latest planning step to determine which tool to invoke.
 * If the planner decides "answer" or "stop", we route to the generate
 * node (which produces the final answer from accumulated context).
 */
export function routeFromPlanner(state: AuditQueryStateType): string {
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

/**
 * Route from critic back to planner or to generate (END of subgraph).
 *
 * Stops the loop when:
 * 1. Critic says sufficient = true
 * 2. Max agentic iterations reached
 * 3. Critic suggests "answer" as next action
 */
export function routeFromCritic(state: AuditQueryStateType): string {
  const lastCritic =
    state.criticEvaluations.length > 0
      ? state.criticEvaluations[state.criticEvaluations.length - 1]
      : null;

  // Safety: stop if max iterations reached
  if (state.agenticIterations >= MAX_AGENTIC_ITERATIONS) {
    return 'generate';
  }

  // Early exit: if we've iterated at least once but every tool returned no
  // useful results (all scores ≤ 0), further loops won't help — exit now
  // instead of burning iterations on an empty corpus.
  if (
    state.agenticIterations > 0 &&
    state.retrievedChunks.length === 0 &&
    state.toolResults.length > 0 &&
    state.toolResults.every((r) => r.score <= 0)
  ) {
    return 'generate';
  }

  if (!lastCritic) return 'planner';

  // Sufficient evidence gathered → generate final answer
  if (lastCritic.sufficient || lastCritic.nextAction === 'answer') {
    return 'generate';
  }

  // Loop back to planner for another tool invocation
  return 'planner';
}

// ---------------------------------------------------------------------------
// Subgraph builder
// ---------------------------------------------------------------------------

/**
 * Build the agentic loop subgraph:
 *
 *   planner → (conditional) → retrieveTool | rlmTool | entityGraphTool | generate
 *                                    ↓            ↓              ↓
 *                                  critic ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
 *                                    ↓
 *                              (conditional) → planner (loop) | generate → END
 *
 * The subgraph shares the same AuditQueryState as the parent graph.
 */
export function buildAgenticLoopSubgraph(ragClient: RagClientService) {
  const plannerNode = createPlannerNode(ragClient);
  const criticNode = createCriticNode();
  const retrieveToolNode = createRetrieveToolNode(ragClient);
  const rlmToolNode = createRlmToolNode(ragClient);
  const entityGraphToolNode = createEntityGraphToolNode(ragClient);
  const generateNode = createGenerateNode(ragClient);

  const graph = new StateGraph(AuditQueryState)
    // Nodes
    .addNode('planner', plannerNode)
    .addNode('retrieveTool', retrieveToolNode)
    .addNode('rlmTool', rlmToolNode)
    .addNode('entityGraphTool', entityGraphToolNode)
    .addNode('critic', criticNode)
    .addNode('generate', generateNode)

    // Entry: start with planner
    .addEdge('__start__', 'planner')

    // Planner → conditional routing to tool or generate
    .addConditionalEdges('planner', routeFromPlanner)

    // All tools → critic
    .addEdge('retrieveTool', 'critic')
    .addEdge('rlmTool', 'critic')
    .addEdge('entityGraphTool', 'critic')

    // Critic → conditional: loop back to planner or proceed to generate
    .addConditionalEdges('critic', routeFromCritic)

    // Generate → END (exit subgraph)
    .addEdge('generate', END);

  return graph.compile();
}
