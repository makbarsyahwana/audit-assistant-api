import { LoggerService, LogLevel } from '@nestjs/common';

/**
 * Structured JSON logger for production environments.
 * Replaces NestJS default logger with JSON-formatted output.
 *
 * Enabled when NODE_ENV=production or LOG_FORMAT=json.
 */
export class JsonLoggerService implements LoggerService {
  private readonly serviceName = 'audit-assistant-api';

  log(message: string, context?: string) {
    this.write('INFO', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.write('ERROR', message, context, trace);
  }

  warn(message: string, context?: string) {
    this.write('WARN', message, context);
  }

  debug(message: string, context?: string) {
    this.write('DEBUG', message, context);
  }

  verbose(message: string, context?: string) {
    this.write('VERBOSE', message, context);
  }

  setLogLevels(_levels: LogLevel[]) {
    // NestJS requires this method but we accept all levels
  }

  private write(
    level: string,
    message: string,
    context?: string,
    trace?: string,
  ) {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
    };

    if (context) {
      entry.context = context;
    }
    if (trace) {
      entry.stack_trace = trace;
    }

    const output = JSON.stringify(entry);

    if (level === 'ERROR') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }
}
