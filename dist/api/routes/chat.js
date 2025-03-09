/**
 * Chat Routes
 *
 * API endpoints for chat completions and streaming.
 */
import express from 'express';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
import { OpenRouterError } from '../../errors/openrouter-error';
const router = express.Router();
const logger = new Logger('info');
// Create a single instance of OpenRouter to reuse across routes
const getOpenRouter = (apiKey) => new OpenRouter({ apiKey });
/**
 * Create a chat completion
 *
 * POST /api/v1/chat/completions
 */
router.post('/completions', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const options = req.body;
        // Validate required fields
        if (!options.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: messages array is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request (excluding sensitive data)
        logger.info(`Chat completion request: model=${options.model || 'default'}, messages=${options.messages.length}`);
        // Send request to OpenRouter
        const response = await openRouter.createChatCompletion(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Chat completion error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred during chat completion',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
/**
 * Stream chat completions
 *
 * POST /api/v1/chat/completions/stream
 */
router.post('/completions/stream', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const options = req.body;
        // Validate required fields
        if (!options.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: messages array is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request (excluding sensitive data)
        logger.info(`Stream chat completion request: model=${options.model || 'default'}, messages=${options.messages.length}`);
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Handle client disconnect
        req.on('close', () => {
            logger.info('Client closed connection');
        });
        // Stream responses
        try {
            for await (const chunk of openRouter.streamChatCompletions(options)) {
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            // End the stream
            res.write('data: [DONE]\n\n');
            res.end();
        }
        catch (streamError) {
            const errorMessage = streamError instanceof Error
                ? streamError.message
                : 'Unknown streaming error';
            logger.error(`Stream error: ${errorMessage}`, streamError);
            // Send error as SSE event
            res.write(`data: ${JSON.stringify({
                error: {
                    message: errorMessage || 'An error occurred during streaming',
                    type: streamError instanceof Error ? streamError.name : 'stream_error'
                }
            })}\n\n`);
            res.end();
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error setting up stream';
        logger.error(`Stream setup error: ${errorMessage}`, error);
        const statusCode = error instanceof OpenRouterError ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred setting up the stream',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
export default router;
//# sourceMappingURL=chat.js.map