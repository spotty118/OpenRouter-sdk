/**
 * Request Logger Middleware
 *
 * This middleware logs information about incoming requests and their responses.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Request logger middleware
 *
 * Logs details about each request and measures response time
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=request-logger.d.ts.map