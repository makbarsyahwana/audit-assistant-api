import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard that uses userId (if authenticated) as the
 * tracking key instead of IP alone. This prevents a single user from
 * abusing the API even behind a shared IP/proxy.
 */
@Injectable()
export class ThrottleBehindAuthGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use userId if available (authenticated request), otherwise fall back to IP
    return req.user?.id || req.ip || 'anonymous';
  }
}
