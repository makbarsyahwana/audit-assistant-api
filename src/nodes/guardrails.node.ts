import { AuditQueryStateType } from '../state/audit-query.state';

// Patterns that should never appear in output
const FORBIDDEN_PATTERNS = [
  /password\s*[:=]\s*\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
  /secret\s*[:=]\s*\S+/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
];

/**
 * Guardrails node — validates the generated answer before returning to user.
 *
 * Checks:
 * 1. No credentials/secrets in output
 * 2. Confidence threshold
 * 3. Citations present when answer is substantive
 */
export async function guardrailsNode(
  state: AuditQueryStateType,
): Promise<Partial<AuditQueryStateType>> {
  const startedAt = new Date().toISOString();
  let passed = true;
  let message = '';

  // Check for forbidden patterns in the answer
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(state.answer)) {
      passed = false;
      message = 'Answer contained potentially sensitive information and was redacted.';
      break;
    }
  }

  // Check confidence threshold
  if (passed && state.confidence > 0 && state.confidence < 0.2) {
    passed = false;
    message =
      'Answer confidence is too low. The system cannot provide a reliable answer for this query.';
  }

  // Check citations for substantive answers
  if (
    passed &&
    state.answer.length > 100 &&
    state.citations.length === 0 &&
    state.confidence > 0
  ) {
    message =
      'Warning: Answer generated without citations. Please verify against source documents.';
  }

  return {
    guardrailPassed: passed,
    guardrailMessage: message,
    // If guardrails failed, replace the answer with the guardrail message
    ...(passed
      ? {}
      : {
          answer: message,
          confidence: 0,
        }),
    agentSteps: [
      {
        node: 'guardrails',
        startedAt,
        completedAt: new Date().toISOString(),
        metadata: { passed, message: message || 'ok' },
      },
    ],
  };
}
