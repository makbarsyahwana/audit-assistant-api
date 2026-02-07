import { StateGraph, END } from '@langchain/langgraph';
import { AuditQueryState, AuditQueryStateType } from '../state/audit-query.state';
import { policyCheckNode } from '../nodes/policy-check.node';
import { queryRouterNode } from '../nodes/query-router.node';
import { createRetrieveNode } from '../nodes/retrieve.node';
import { createGenerateNode } from '../nodes/generate.node';
import { guardrailsNode } from '../nodes/guardrails.node';
import { createLogAuditTrailNode } from '../nodes/log-audit-trail.node';
import { RagClientService } from '../rag-client/rag-client.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

/**
 * Build the AuditQueryGraph:
 *   policyCheck → (allowed?) → queryRouter → retrieve → generate → guardrails → logAuditTrail
 *
 * If policy check denies access, skip to logAuditTrail with an access-denied answer.
 */
export function buildAuditQueryGraph(
  ragClient: RagClientService,
  auditTrailService: AuditTrailService,
) {
  const retrieveNode = createRetrieveNode(ragClient);
  const generateNode = createGenerateNode(ragClient);
  const logAuditTrailNode = createLogAuditTrailNode(auditTrailService);

  const graph = new StateGraph(AuditQueryState)
    .addNode('policyCheck', policyCheckNode)
    .addNode('queryRouter', queryRouterNode)
    .addNode('retrieve', retrieveNode)
    .addNode('generate', generateNode)
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
    .addEdge('queryRouter', 'retrieve')
    .addEdge('retrieve', 'generate')
    .addEdge('generate', 'guardrails')
    .addEdge('guardrails', 'logAuditTrail')
    .addEdge('logAuditTrail', END);

  return graph;
}
