import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../shared/services/logger.service';
import { ApiErrorResponse } from '../common/interfaces';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.resolveException(exception);

    this.logger.error(
      `${request.method} ${request.url} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ApiErrorResponse = {
      data: null,
      meta: {
        requestId: request.headers['x-request-id'] as string | undefined,
        timestamp: new Date().toISOString(),
      },
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(errorResponse);
  }

  private isPayloadTooLarge(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') return false;
    const err = exception as { type?: string; status?: number; statusCode?: number };
    return (
      err.type === 'entity.too.large' ||
      err.status === HttpStatus.PAYLOAD_TOO_LARGE ||
      err.statusCode === HttpStatus.PAYLOAD_TOO_LARGE
    );
  }

  private resolveException(exception: unknown) {
    if (this.isPayloadTooLarge(exception)) {
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        return {
          status,
          code: (body.code as string) ?? 'HTTP_EXCEPTION',
          message: Array.isArray(body.message)
            ? body.message.join(', ')
            : ((body.message as string) ?? exception.message),
          details: body.details,
        };
      }

      return {
        status,
        code: 'HTTP_EXCEPTION',
        message: exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}
