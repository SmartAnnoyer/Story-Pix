import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.write('info', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.write('error', message, context, trace);
  }

  warn(message: string, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.write('debug', message, context);
    }
  }

  verbose(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.write('verbose', message, context);
    }
  }

  private write(
    level: string,
    message: string,
    context?: string,
    trace?: string,
  ) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? this.context ?? 'Application',
      message,
      ...(trace ? { trace } : {}),
    };

    const output = JSON.stringify(payload);

    if (level === 'error') {
      console.error(output);
      return;
    }

    if (level === 'warn') {
      console.warn(output);
      return;
    }

    console.log(output);
  }
}
