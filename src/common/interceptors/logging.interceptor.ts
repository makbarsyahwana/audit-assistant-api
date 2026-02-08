import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    @Optional() @Inject(MetricsService) private readonly metrics?: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - now;
        const status = response.statusCode;

        this.logger.log(`${method} ${url} ${status} - ${elapsed}ms`);

        // Record Prometheus metrics
        if (this.metrics) {
          const path = this.normalizePath(url);
          this.metrics.incCounter('api_http_requests_total', {
            method,
            path,
            status: String(status),
          });
          this.metrics.observeHistogram(
            'api_http_request_duration_seconds',
            elapsed / 1000,
            { method, path },
          );
        }
      }),
    );
  }

  /** Normalize URL path to avoid high-cardinality labels. */
  private normalizePath(url: string): string {
    return url
      .split('?')[0]
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      )
      .replace(/\/\d+/g, '/:id');
  }
}
