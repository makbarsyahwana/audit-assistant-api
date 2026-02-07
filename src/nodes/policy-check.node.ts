import { AuditQueryStateType } from '../state/audit-query.state';

/**
 * Policy check node — evaluates RBAC/ABAC rules before retrieval.
 * Sets accessAllowed and allowedEngagementIds in agent state.
 */
export async function policyCheckNode(
  state: AuditQueryStateType,
  config?: any,
): Promise<Partial<AuditQueryStateType>> {
  const startedAt = new Date().toISOString();

  const { userId, engagementId, userRole } = state;

  // Admin always has access
  if (userRole === 'ADMIN') {
    return {
      accessAllowed: true,
      allowedEngagementIds: [engagementId],
      agentSteps: [
        {
          node: 'policyCheck',
          startedAt,
          completedAt: new Date().toISOString(),
          metadata: { result: 'allowed', reason: 'admin_role' },
        },
      ],
    };
  }

  // For other roles: the policy service pre-populates allowedEngagementIds
  // via the chat service before invoking the graph.
  // Here we just verify the requested engagement is in the allowed list.
  const allowed = state.allowedEngagementIds.includes(engagementId);

  return {
    accessAllowed: allowed,
    agentSteps: [
      {
        node: 'policyCheck',
        startedAt,
        completedAt: new Date().toISOString(),
        metadata: {
          result: allowed ? 'allowed' : 'denied',
          userId,
          engagementId,
          userRole,
        },
      },
    ],
  };
}
