/**
 * Rate Limiter Middleware
 *
 * This middleware implements rate limiting for API requests based on API keys.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Rate limiting middleware
 *
 * Limits the number of requests per minute based on API key
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export declare const rateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rate-limiter.d.ts.map