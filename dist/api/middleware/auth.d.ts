/**
 * Authentication Middleware
 *
 * This middleware validates API keys for requests to protected endpoints.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Authenticate requests using API key
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map