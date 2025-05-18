import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter for consistent error responses and logging
 */
@Catch()
export class CommonExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CommonExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : (exception as any).status ||HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : (exception as any).message || exception;

    const log = {
      timestamp: new Date().toISOString(),
      status,
      path: request.url,
      error: message,
      stack: (exception as any)?.stack,
    };
    this.logger.error(JSON.stringify(log));

    response.status(status).json({
      statusCode: status,
      timestamp: log.timestamp,
      path: request.url,
      error: message,
    });
  }
} 