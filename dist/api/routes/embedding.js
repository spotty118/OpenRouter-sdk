/**
 * Embedding Routes
 *
 * API endpoints for text embeddings.
 */
import express from 'express';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
const router = express.Router();
const logger = new Logger('info');
/**
 * Create text embeddings
 *
 * POST /api/v1/embedding
 */
router.post('/', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const options = req.body;
        // Validate required fields
        if (!options.input) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: input is required',
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
        // Log the request
        const inputType = Array.isArray(options.input) ? 'array' : 'string';
        const inputLength = Array.isArray(options.input)
            ? `${options.input.length} items`
            : `${options.input.length} chars`;
        logger.info(`Embedding request: model=${options.model}, input=${inputType}(${inputLength})`);
        // Send request to OpenRouter
        const response = await openRouter.createEmbedding(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        logger.error(`Embedding error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred during embedding generation',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Batch process multiple embedding requests
 *
 * POST /api/v1/embedding/batch
 */
router.post('/batch', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const { requests, concurrency } = req.body;
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
            if (!request.input) {
                return res.status(400).json({
                    error: {
                        message: `Invalid request at index ${i}: input is required`,
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
        logger.info(`Batch embedding request: ${requests.length} requests, concurrency=${concurrency || 3}`);
        // Process each embedding request individually
        // Note: OpenRouter SDK doesn't have a batch embedding method, so we'll process them individually
        const results = await Promise.all(requests.map(async (request) => {
            try {
                return await openRouter.createEmbedding(request);
            }
            catch (error) {
                return {
                    error: {
                        message: error.message || 'An error occurred during embedding generation',
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
        logger.error(`Batch embedding error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred during batch embedding generation',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
export default router;
//# sourceMappingURL=embedding.js.map