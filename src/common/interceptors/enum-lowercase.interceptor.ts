import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * All Prisma enum values the API may return.
 * Kept in a Set for O(1) membership checks.
 */
/** Built-in object types that must not be rebuilt from Object.entries (yields []). */
function isNonPlainObject(value: object): boolean {
  if (value instanceof Date || value instanceof RegExp) return true;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return true;
  // Cross-realm Date / other builtins where instanceof may fail
  const tag = Object.prototype.toString.call(value);
  if (tag === '[object Date]' || tag === '[object RegExp]') return true;
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return true;
  if (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) {
    return true;
  }
  if (ArrayBuffer.isView(value)) return true;
  return false;
}

const PRISMA_ENUM_VALUES: ReadonlySet<string> = new Set([
  // Role
  'ADMIN', 'AUDIT_MANAGER', 'AUDITOR', 'VIEWER',
  // AppMode
  'AUDIT', 'LEGAL', 'COMPLIANCE',
  // EngagementStatus
  'PLANNING', 'ACTIVE', 'CLOSED', 'ARCHIVED',
  // DocType
  'POLICY', 'FRAMEWORK', 'WORKPAPER', 'EVIDENCE', 'REPORT',
  'TICKET', 'CONTRACT', 'BRIEF', 'STANDARD', 'REGULATION', 'SOP', 'OTHER',
  // CorpusScope
  'GLOBAL', 'ENGAGEMENT',
  // Confidentiality
  'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED',
  // IngestionStatus
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED',
  // RequirementPriority
  'HIGH', 'MEDIUM', 'LOW',
  // ControlType
  'MANUAL', 'AUTOMATED', 'IT_DEPENDENT',
  // ControlStatus
  'NOT_TESTED', 'EFFECTIVE', 'INEFFECTIVE', 'NOT_APPLICABLE',
  // CoverageLevel
  'FULL', 'PARTIAL', 'NONE',
  // EvidencePackStatus
  'DRAFT', 'IN_REVIEW', 'APPROVED', 'EXPORTED',
  // WorkpaperTemplate
  'GENERAL', 'CRITERIA_CONDITION', 'FINANCIAL_MEMO', 'WALKTHROUGH',
  // WorkpaperStatus  (DRAFT, IN_REVIEW, APPROVED already above)
  'FINAL',
  // FindingSeverity
  'CRITICAL', 'INFORMATIONAL',
  // FindingStatus  (DRAFT, IN_REVIEW, CLOSED already above)
  'OPEN', 'REMEDIATION',
  // GroupSource
  'LOCAL', 'OIDC', 'SAML', 'SCIM',
  // SecretStatus  (ACTIVE already above)
  'ROTATED', 'REVOKED',
]);

function lowercaseEnums(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return PRISMA_ENUM_VALUES.has(value) ? value.toLowerCase() : value;
  }

  if (Array.isArray(value)) {
    return value.map(lowercaseEnums);
  }

  if (typeof value === 'object') {
    const obj = value as object;
    if (isNonPlainObject(obj)) {
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = lowercaseEnums(v);
    }
    return out;
  }

  return value;
}

/**
 * Global interceptor that lowercases Prisma UPPERCASE enum values in all
 * JSON responses. This removes the need for every UI consumer to call
 * `normalizeRecords()` with an explicit enum field list.
 */
@Injectable()
export class EnumLowercaseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(lowercaseEnums));
  }
}
