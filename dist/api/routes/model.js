/**
 * Model Routes
 *
 * API endpoints for model information.
 */
import express from 'express';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
const router = express.Router();
const logger = new Logger('info');
/**
 * List available models
 *
 * GET /api/v1/model
 */
router.get('/', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        // Initialize OpenRouter with the API key
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info('List models request');
        // Get models from OpenRouter
        const response = await openRouter.listModels();
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        logger.error(`List models error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while listing models',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
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
        // Initialize OpenRouter with the API key
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Get model info request: model=${modelId}`);
        // Get model info from OpenRouter
        const modelInfo = await openRouter.getModelInfo(modelId);
        if (!modelInfo) {
            return res.status(404).json({
                error: {
                    message: `Model not found: ${modelId}`,
                    type: 'not_found_error'
                }
            });
        }
        // Return the response
        res.status(200).json(modelInfo);
    }
    catch (error) {
        logger.error(`Get model info error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while getting model information',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
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
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Filter models by capability request: capability=${capability}`);
        // Get models from OpenRouter
        const response = await openRouter.listModels();
        // Filter models by capability
        const filteredModels = response.data.filter(model => model.capabilities && model.capabilities[capability]);
        // Return the response
        res.status(200).json({
            data: filteredModels
        });
    }
    catch (error) {
        logger.error(`Filter models by capability error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while filtering models',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Estimate cost for a request
 *
 * POST /api/v1/model/:modelId/cost
 */
router.post('/:modelId/cost', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const modelId = req.params.modelId;
        const { promptTokens, completionTokens } = req.body;
        // Validate required fields
        if (promptTokens === undefined) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: promptTokens is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Cost estimate request: model=${modelId}, promptTokens=${promptTokens}, completionTokens=${completionTokens || 0}`);
        // Get model info from OpenRouter
        const modelInfo = await openRouter.getModelInfo(modelId);
        if (!modelInfo) {
            return res.status(404).json({
                error: {
                    message: `Model not found: ${modelId}`,
                    type: 'not_found_error'
                }
            });
        }
        // Estimate cost
        const costEstimate = openRouter.estimateCost(modelInfo, promptTokens, completionTokens || 0);
        // Return the response
        res.status(200).json(costEstimate);
    }
    catch (error) {
        logger.error(`Cost estimate error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while estimating cost',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
export default router;
//# sourceMappingURL=model.js.map