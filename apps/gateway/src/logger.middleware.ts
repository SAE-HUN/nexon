import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware for logging HTTP requests and responses
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const log = {
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        statusCode: res.statusCode,
        responseTimeMs: ms,
      };
      this.logger.log(JSON.stringify(log));
    });
    next();
  }
} 