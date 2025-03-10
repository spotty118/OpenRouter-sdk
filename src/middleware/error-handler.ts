import { Request, Response, NextFunction } from 'express';
import { OpenRouterError } from '../errors/openrouter-error.js';
import { ValidationError } from '../errors/validation-error.js';
import { Logger } from '../utils/logger.js';
import { ErrorResponse } from '../interfaces/responses.js';

const logger = new Logger('error');

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
): void {
  // Log error for tracking
  const requestId = req.headers['x-request-id'] || 'unknown';
  logger.error(`[${requestId}] ${err.stack || err.message}`);

  // Handle OpenRouter specific errors
  if (err instanceof OpenRouterError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.statusCode,
        details: err.details || undefined,
        type: 'OpenRouterError'
      }
    });
    return;
  }

  // Handle validation errors
  if (err instanceof ValidationError) {
    res.status(400).json({
      error: {
        message: err.message,
        details: err.details,
        type: 'ValidationError'
      }
    });
    return;
  }

  // Handle unexpected errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: {
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      ...(isDevelopment && {
        details: err.stack,
        type: err.name
      })
    }
  });
  return;
}

/**
 * 404 Not Found middleware
 */
export function notFoundHandler(req: Request, res: Response<ErrorResponse>): void {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 404,
      type: 'NotFoundError'
    }
  });
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();

  // Log request
  logger.info(`[${requestId}] ${req.method} ${req.originalUrl}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const size = res.get('Content-Length') || 0;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](
      `[${requestId}] Completed ${res.statusCode} in ${duration}ms | Size: ${size} bytes`
    );

    if (res.statusCode >= 400) {
      logger.warn(`[${requestId}] Error response details: Status ${res.statusCode}`);
    }
  });

  next();
}
