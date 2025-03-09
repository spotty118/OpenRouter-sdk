/**
 * Image Routes
 *
 * API endpoints for image generation.
 */
import express from 'express';
import { OpenRouter } from '../../core/open-router';
import { OpenRouterError } from '../../errors/openrouter-error';
import { Logger } from '../../utils/logger';
const router = express.Router();
const logger = new Logger('info');
// Create a single instance of OpenRouter to reuse across routes
const getOpenRouter = (apiKey) => new OpenRouter({ apiKey });
/**
 * Generate images
 *
 * POST /api/v1/image/generations
 */
router.post('/generations', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const options = req.body;
        // Validate required fields
        if (!options.prompt) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: prompt is required',
                    type: 'invalid_request_error'
                }
            });
        }
        if (!options.model) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: model is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info(`Image generation request: model=${options.model}, prompt="${options.prompt.substring(0, 30)}..."`);
        // Send request to OpenRouter
        const response = await openRouter.createImage(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Image generation error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred during image generation',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
/**
 * Batch generate images
 *
 * POST /api/v1/image/generations/batch
 */
router.post('/generations/batch', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const { requests } = req.body;
        // Validate required fields
        if (!requests || !Array.isArray(requests) || requests.length === 0) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: requests array is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Validate each request in the batch
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            if (!request.prompt) {
                return res.status(400).json({
                    error: {
                        message: `Invalid request at index ${i}: prompt is required`,
                        type: 'invalid_request_error'
                    }
                });
            }
            if (!request.model) {
                return res.status(400).json({
                    error: {
                        message: `Invalid request at index ${i}: model is required`,
                        type: 'invalid_request_error'
                    }
                });
            }
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info(`Batch image generation request: ${requests.length} requests`);
        // Process each image generation request individually
        const results = await Promise.all(requests.map(async (request) => {
            try {
                return await openRouter.createImage(request);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
                return {
                    error: {
                        message: errorMessage || 'An error occurred during image generation',
                        type: error instanceof Error ? error.name : 'server_error',
                        code: statusCode,
                        data: (error instanceof OpenRouterError) ? error.data : null
                    }
                };
            }
        }));
        // Return the response
        res.status(200).json({ results });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Batch image generation error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred during batch image generation',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
export default router;
//# sourceMappingURL=image.js.map