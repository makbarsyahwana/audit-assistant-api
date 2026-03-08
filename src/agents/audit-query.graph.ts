import { StateGraph, END } from '@langchain/langgraph';
import { AuditQueryState, AuditQueryStateType } from '../state/audit-query.state';
import { policyCheckNode } from '../nodes/policy-check.node';
import { queryRouterNode } from '../nodes/query-router.node';
import { createRetrieveNode } from '../nodes/retrieve.node';
import { createGenerateNode } from '../nodes/generate.node';
import { createSynthesizeNode } from '../nodes/synthesize.node';
import { guardrailsNode } from '../nodes/guardrails.node';
import { createLogAuditTrailNode } from '../nodes/log-audit-trail.node';
import { buildAgenticLoopSubgraph } from './agentic-loop.subgraph';
import { RagClientService } from '../rag-client/rag-client.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

/**
 * Build the AuditQueryGraph:
 *
 *   policyCheck → (allowed?) → queryRouter → (complexity?)
 *     ├─ [simple]  → retrieve → generate → guardrails → logAuditTrail
 *     └─ [complex] → agenticLoop → synthesize (frontier polish) → guardrails → logAuditTrail
 *
 * If policy check denies access, skip to logAuditTrail with an access-denied answer.
 * The agentic loop subgraph handles planner → tool → critic iterations internally.
 * The synthesize node polishes complex query output using the frontier-tier model.
 */
export function buildAuditQueryGraph(
  ragClient: RagClientService,
  auditTrailService: AuditTrailService,
) {
  const retrieveNode = createRetrieveNode(ragClient);
  const generateNode = createGenerateNode(ragClient);
  const synthesizeNode = createSynthesizeNode();
  const logAuditTrailNode = createLogAuditTrailNode(auditTrailService);
  const agenticLoopGraph = buildAgenticLoopSubgraph(ragClient);

  const graph = new StateGraph(AuditQueryState)
    .addNode('policyCheck', policyCheckNode)
    .addNode('queryRouter', queryRouterNode)
    // Simple path nodes
    .addNode('retrieve', retrieveNode)
    .addNode('generate', generateNode)
    // Complex path: agentic loop subgraph + synthesis
    .addNode('agenticLoop', agenticLoopGraph)
    .addNode('synthesize', synthesizeNode)
    // Shared tail nodes
    .addNode('guardrails', guardrailsNode)
    .addNode('logAuditTrail', logAuditTrailNode)

    // Entry point
    .addEdge('__start__', 'policyCheck')

    // Conditional: if access denied, go directly to logAuditTrail
    .addConditionalEdges('policyCheck', (state: AuditQueryStateType) => {
      if (!state.accessAllowed) {
        return 'logAuditTrail';
      }
      return 'queryRouter';
    })

    // Conditional: route by complexity
    .addConditionalEdges('queryRouter', (state: AuditQueryStateType) => {
      if (state.complexity === 'complex') {
        return 'agenticLoop';
      }
      return 'retrieve';
    })

    // Simple path: retrieve → generate → guardrails
    .addEdge('retrieve', 'generate')
    .addEdge('generate', 'guardrails')

    // Complex path: agenticLoop → synthesize → guardrails
    .addEdge('agenticLoop', 'synthesize')
    .addEdge('synthesize', 'guardrails')

    // Shared tail
    .addEdge('guardrails', 'logAuditTrail')
    .addEdge('logAuditTrail', END);

  return graph;
}
