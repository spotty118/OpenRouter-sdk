/**
 * OpenRouter API Server
 *
 * This file sets up an Express server that exposes the OpenRouter SDK functionality
 * as REST API endpoints.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import { Logger } from '../utils/logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import version from '../../package.json' with { type: 'json' };
// Import routes
import chatRoutes from './routes/chat.js';
import embeddingRoutes from './routes/embedding.js';
import imageRoutes from './routes/image.js';
import audioRoutes from './routes/audio.js';
import modelRoutes from './routes/model.js';
import agentRoutes from './routes/agent.js';
import vectorDbRoutes from './routes/vector-db.js';
import { swaggerRouter } from './swagger.js';
// Import middleware
import { authenticate } from './middleware/auth.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { requestLogger } from './middleware/request-logger.js';
import { detailedHealthCheck } from './middleware/detailed-health.js';
// Create Express app
const app = express();
const logger = new Logger('info');
const PORT = process.env.PORT || 3000;
// Apply middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses
app.use(json({ limit: '50mb' })); // Parse JSON bodies (with size limit)
app.use(urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies
// Apply global middleware
app.use(requestLogger); // Request logging middleware
app.use(authenticate); // Authentication middleware
app.use(rateLimiter); // Rate limiting middleware
// Register routes
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/embedding', embeddingRoutes);
app.use('/api/v1/image', imageRoutes);
app.use('/api/v1/audio', audioRoutes);
app.use('/api/v1/model', modelRoutes);
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/vector-db', vectorDbRoutes);
app.use('/api-docs', swaggerRouter);
// Health check endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', version: version });
});
// Detailed health check endpoint
app.get('/health/detailed', detailedHealthCheck);
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, err);
    if (err instanceof OpenRouterError) {
        return res.status(err.status || 500).json({
            error: {
                message: err.message,
                type: 'openrouter_error',
                code: err.status,
                data: err.data
            }
        });
    }
    return res.status(500).json({
        error: {
            message: 'Internal server error',
            type: 'server_error'
        }
    });
});
// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(Number(PORT), () => {
        logger.info(`OpenRouter API server running on port ${PORT}`);
    });
}
export default app;
//# sourceMappingURL=server.js.map