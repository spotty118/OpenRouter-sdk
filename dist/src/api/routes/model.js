/**
 * Model Routes
 *
 * API endpoints for model information.
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
 * Filter models by capability
 *
 * GET /api/v1/model/capability/:capability
 */
router.get('/capability/:capability', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const capability = req.params.capability;
        // Validate capability
        const validCapabilities = ['chat', 'embeddings', 'images', 'audio', 'tools', 'json_mode', 'vision'];
        if (!validCapabilities.includes(capability)) {
            return res.status(400).json({
                error: {
                    message: `Invalid capability: ${capability}. Valid capabilities are: ${validCapabilities.join(', ')}`,
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info(`Filter models by capability request: ${capability}`);
        // Get models from OpenRouter
        const modelsResponse = await openRouter.listModels();
        // Filter models by capability
        const filteredModels = modelsResponse.data.filter(model => model.capabilities && model.capabilities[capability] === true);
        // Return the response
        res.status(200).json({ models: filteredModels });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Filter models error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred while filtering models',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
/**
 * List all models
 *
 * GET /api/v1/model
 */
router.get('/', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info('List models request');
        // Get models from OpenRouter
        const modelsResponse = await openRouter.listModels();
        // Return the response
        res.status(200).json({ models: modelsResponse.data });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`List models error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred while listing models',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
/**
 * Get model information
 *
 * GET /api/v1/model/:modelId
 */
router.get('/:modelId', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const modelId = req.params.modelId;
        // Validate modelId
        if (!modelId || typeof modelId !== 'string') {
            return res.status(400).json({
                error: {
                    message: 'Invalid model ID',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info(`Get model request: ${modelId}`);
        // Get model from OpenRouter
        const model = await openRouter.getModelInfo(modelId);
        if (!model) {
            return res.status(404).json({
                error: {
                    message: `Model not found: ${modelId}`,
                    type: 'not_found_error'
                }
            });
        }
        // Return the response
        res.status(200).json(model);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Get model error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred while getting model information',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
/**
 * Estimate cost for a model
 *
 * POST /api/v1/model/:modelId/cost
 */
router.post('/:modelId/cost', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const modelId = req.params.modelId;
        const { promptTokens, completionTokens } = req.body;
        // Validate required fields
        if (promptTokens === undefined ||
            completionTokens === undefined ||
            typeof promptTokens !== 'number' ||
            typeof completionTokens !== 'number' ||
            !Number.isInteger(promptTokens) ||
            !Number.isInteger(completionTokens) ||
            promptTokens < 0 ||
            completionTokens < 0) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: promptTokens and completionTokens must be non-negative integers',
                    type: 'invalid_request_error'
                }
            });
        }
        // Validate modelId
        if (!modelId || typeof modelId !== 'string') {
            return res.status(400).json({
                error: {
                    message: 'Invalid model ID',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info(`Estimate cost request: model=${modelId}, promptTokens=${promptTokens}, completionTokens=${completionTokens}`);
        // Get model info first
        const modelInfo = await openRouter.getModelInfo(modelId);
        if (!modelInfo) {
            return res.status(404).json({
                error: {
                    message: `Model not found: ${modelId}`,
                    type: 'not_found_error'
                }
            });
        }
        // Get cost estimate using the model info
        const cost = openRouter.estimateCost(modelInfo, promptTokens, completionTokens);
        // Return the response
        res.status(200).json(cost);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Estimate cost error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred while estimating cost',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
export default router;
//# sourceMappingURL=model.js.map