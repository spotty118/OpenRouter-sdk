/**
 * Authentication Middleware
 * 
 * This middleware validates API keys for requests to protected endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger.js';
import { Errors } from '../../utils/enhanced-error.js';

const logger = new Logger('info');

/**
 * List of paths that don't require authentication
 */
const PUBLIC_PATHS = [
  '/health',
  '/health/detailed',
  '/api-docs',
  '/api-docs/'
];

/**
 * Authenticate requests using API key
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const path = req.path;

  // Skip authentication for public endpoints
  if (PUBLIC_PATHS.some(publicPath => path === publicPath || path.startsWith(publicPath + '/'))) {
    return next();
  }

  // Generate a request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
                   Math.random().toString(36).substring(2, 15);

  // Get API key from Authorization header
  const authHeader = req.headers.authorization;
  
  // Handle case where authHeader could be a string or string[]
  const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  
  if (!authHeaderStr || !authHeaderStr.startsWith('Bearer ')) {
    logger.warn(`Authentication failed: Missing or invalid Authorization header (${requestId})`);
    const error = Errors.authentication(
      'Authentication failed. Please provide a valid API key in the Authorization header with the format "Bearer YOUR_API_KEY".',
      { header: 'invalid_format' },
      requestId
    );
    return res.status(error.status).json(error.toResponse());
  }

  const apiKey = authHeaderStr.split(' ')[1];
  
  if (!apiKey) {
    logger.warn(`Authentication failed: Empty API key (${requestId})`);
    const error = Errors.authentication(
      'Authentication failed. Please provide a valid API key.',
      { header: 'empty_key' },
      requestId
    );
    return res.status(error.status).json(error.toResponse());
  }

  // TODO: In a production environment, validate the API key against a database
  // For now, we're just checking if it exists

  // Store API key and request ID in request for use in route handlers
  req.app.locals.apiKey = apiKey;
  req.app.locals.requestId = requestId;
  
  // Continue to next middleware or route handler
  next();
};
