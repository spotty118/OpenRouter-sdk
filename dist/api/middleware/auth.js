/**
 * Authentication Middleware
 *
 * This middleware validates API keys for requests to protected endpoints.
 */
import { Logger } from '../../utils/logger';
const logger = new Logger('info');
/**
 * Authenticate requests using API key
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = (req, res, next) => {
    // Skip authentication for health check endpoint
    if (req.path === '/health') {
        return next();
    }
    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authentication failed: Missing or invalid Authorization header');
        res.status(401).json({
            error: {
                message: 'Authentication failed. Please provide a valid API key.',
                type: 'authentication_error'
            }
        });
        return;
    }
    const apiKey = authHeader.split(' ')[1];
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
//# sourceMappingURL=auth.js.map