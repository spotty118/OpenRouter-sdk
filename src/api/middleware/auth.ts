/**
 * Authentication Middleware
 * 
 * This middleware validates API keys for requests to protected endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

const logger = new Logger('info');

/**
 * Authenticate requests using API key
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // Skip authentication for health check endpoint
  if (req.path === '/health') {
    return next();
  }

  // Get API key from Authorization header
  const authHeader = req.headers.authorization;
  
  // Handle case where authHeader could be a string or string[]
  const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  
  if (!authHeaderStr || !authHeaderStr.startsWith('Bearer ')) {
    logger.warn('Authentication failed: Missing or invalid Authorization header');
    res.status(401).json({
      error: {
        message: 'Authentication failed. Please provide a valid API key.',
        type: 'authentication_error'
      }
    });
    return;
  }

  const apiKey = authHeaderStr.split(' ')[1];
  
  if (!apiKey) {
    logger.warn('Authentication failed: Empty API key');
    res.status(401).json({
      error: {
        message: 'Authentication failed. Please provide a valid API key.',
        type: 'authentication_error'
      }
    });
    return;
  }

  // Store API key in request for use in route handlers
  req.app.locals.apiKey = apiKey;
  
  // Continue to next middleware or route handler
  next();
};