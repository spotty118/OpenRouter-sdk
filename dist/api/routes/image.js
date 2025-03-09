/**
 * Image Routes
 *
 * API endpoints for image generation.
 */
import express from 'express';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
const router = express.Router();
const logger = new Logger('info');
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
        const openRouter = new OpenRouter({ apiKey });
        // Log the request (excluding sensitive data)
        logger.info(`Image generation request: model=${options.model}, prompt_length=${options.prompt.length}, size=${options.size || 'default'}`);
        // Send request to OpenRouter
        const response = await openRouter.createImage(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        logger.error(`Image generation error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred during image generation',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Generate multiple images in batch
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
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Batch image generation request: ${requests.length} requests`);
        // Process each image generation request individually
        const results = await Promise.all(requests.map(async (request) => {
            try {
                return await openRouter.createImage(request);
            }
            catch (error) {
                return {
                    error: {
                        message: error.message || 'An error occurred during image generation',
                        type: error.name || 'server_error',
                        code: error.status || 500,
                        data: error.data
                    }
                };
            }
        }));
        // Return the response
        res.status(200).json({ results });
    }
    catch (error) {
        logger.error(`Batch image generation error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred during batch image generation',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
export default router;
//# sourceMappingURL=image.js.map