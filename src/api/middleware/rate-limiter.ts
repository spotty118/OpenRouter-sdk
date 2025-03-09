/**
 * Rate Limiter Middleware
 * 
 * This middleware implements rate limiting for API requests based on API keys.
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';
import { RateLimiter as SDKRateLimiter } from '../../utils/rate-limiter';

const logger = new Logger('info');

// Store rate limiters by API key
const rateLimiters: Map<string, SDKRateLimiter> = new Map();

// Default rate limit (requests per minute)
const DEFAULT_RATE_LIMIT = 60;

/**
 * Rate limiting middleware
 * 
 * Limits the number of requests per minute based on API key
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip rate limiting for health check endpoint
  if (req.path === '/health') {
    return next();
  }

  const apiKey = req.app.locals.apiKey;
  
  if (!apiKey) {
    // This should not happen if auth middleware is applied first
    logger.warn('Rate limiting skipped: No API key found');
    return next();
  }

  // Get or create rate limiter for this API key
  let limiter = rateLimiters.get(apiKey);
  
  if (!limiter) {
    // TODO: In a production environment, rate limits could be stored in a database
    // and retrieved based on the API key's tier/plan
    limiter = new SDKRateLimiter(DEFAULT_RATE_LIMIT);
    rateLimiters.set(apiKey, limiter);
  }

  try {
    // Apply rate limiting
    await limiter.throttle();
    next();
  } catch (error) {
    logger.warn(`Rate limit exceeded for API key: ${apiKey.substring(0, 8)}...`);
    
    res.status(429).json({
      error: {
        message: 'Too many requests. Please try again later.',
        type: 'rate_limit_error',
        retry_after: 60 // Suggest retry after 60 seconds
      }
    });
  }
};