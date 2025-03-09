/**
 * Request Logger Middleware
 * 
 * This middleware logs information about incoming requests and their responses.
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('info');

/**
 * Request logger middleware
 * 
 * Logs details about each request and measures response time
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Skip logging for health check endpoint to avoid noise in logs
  if (req.path === '/health') {
    return next();
  }

  // Record start time
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);

  // Log request
  logger.info(`[${requestId}] ${req.method} ${req.path} - Request received`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Store the original end method
  const originalEnd = res.end;
  
  // Override the end method
  res.end = function(this: Response, ...args: any[]): any {
    // Calculate response time
    const responseTime = Date.now() - start;
    
    // Log response (with appropriate level based on status code)
    const logMethod = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logMethod](`[${requestId}] ${req.method} ${req.path} - Response sent ${res.statusCode} (${responseTime}ms)`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime
    });
    
    // Call the original end method
    return originalEnd.apply(this, args);
  };

  next();
};
