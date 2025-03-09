"use strict";
/**
 * Chat Routes
 *
 * API endpoints for chat completions and streaming.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const open_router_1 = require("../../core/open-router");
const logger_1 = require("../../utils/logger");
const openrouter_error_1 = require("../../errors/openrouter-error");
const enhanced_error_1 = require("../../utils/enhanced-error");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
const logger = new logger_1.Logger('info');
// Create a single instance of OpenRouter to reuse across routes
const getOpenRouter = (apiKey) => new open_router_1.OpenRouter({ apiKey });
// Validation schema for chat completion requests
const chatCompletionSchema = {
    location: validation_1.ValidateLocation.BODY,
    schema: joi_1.default.object({
        messages: validation_1.CommonSchemas.messages,
        model: joi_1.default.string().min(1),
        max_tokens: joi_1.default.number().integer().min(1),
        temperature: joi_1.default.number().min(0).max(2),
        top_p: joi_1.default.number().min(0).max(1),
        top_k: joi_1.default.number().integer().min(1),
        stream: joi_1.default.boolean(),
        presence_penalty: joi_1.default.number().min(-2).max(2),
        frequency_penalty: joi_1.default.number().min(-2).max(2),
        additional_stop_sequences: joi_1.default.array().items(joi_1.default.string()),
        seed: joi_1.default.number().integer(),
        response_format: joi_1.default.object(),
        tools: joi_1.default.array().items(joi_1.default.object()),
        tool_choice: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.object()),
        plugins: joi_1.default.array().items(joi_1.default.object()),
        reasoning: joi_1.default.object(),
        include_reasoning: joi_1.default.boolean(),
        user: joi_1.default.string()
    }).required()
};
/**
 * Create a chat completion
 *
 * POST /api/v1/chat/completions
 */
router.post('/completions', (0, validation_1.validate)([chatCompletionSchema]), async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const requestId = req.app.locals.requestId;
        const options = req.body;
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request (excluding sensitive data)
        logger.info(`Chat completion request [${requestId}]: model=${options.model || 'default'}, messages=${options.messages.length}`);
        // Send request to OpenRouter
        const response = await openRouter.createChatCompletion(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Chat completion error [${req.app.locals.requestId}]: ${errorMessage}`, error);
        if (error instanceof openrouter_error_1.OpenRouterError) {
            const enhancedError = enhanced_error_1.Errors.externalApi(errorMessage || 'An error occurred during chat completion', { originalError: error.data }, req.app.locals.requestId);
            return res.status(enhancedError.status).json(enhancedError.toResponse());
        }
        const serverError = enhanced_error_1.Errors.server(errorMessage || 'An error occurred during chat completion', null, req.app.locals.requestId);
        return res.status(serverError.status).json(serverError.toResponse());
    }
});
/**
 * Stream chat completions
 *
 * POST /api/v1/chat/completions/stream
 */
router.post('/completions/stream', (0, validation_1.validate)([chatCompletionSchema]), async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const requestId = req.app.locals.requestId;
        const options = req.body;
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request (excluding sensitive data)
        logger.info(`Stream chat completion request [${requestId}]: model=${options.model || 'default'}, messages=${options.messages.length}`);
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Handle client disconnect
        req.on('close', () => {
            logger.info(`Client closed connection [${requestId}]`);
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
            logger.error(`Stream error [${requestId}]: ${errorMessage}`, streamError);
            const enhancedError = streamError instanceof openrouter_error_1.OpenRouterError
                ? enhanced_error_1.Errors.externalApi(errorMessage, { originalError: streamError }, requestId)
                : enhanced_error_1.Errors.server(errorMessage, { originalError: String(streamError) }, requestId);
            // Send error as SSE event
            res.write(`data: ${JSON.stringify(enhancedError.toResponse())}\n\n`);
            res.end();
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error setting up stream';
        logger.error(`Stream setup error [${req.app.locals.requestId}]: ${errorMessage}`, error);
        if (error instanceof openrouter_error_1.OpenRouterError) {
            const enhancedError = enhanced_error_1.Errors.externalApi(errorMessage || 'An error occurred setting up the stream', { originalError: error.data }, req.app.locals.requestId);
            return res.status(enhancedError.status).json(enhancedError.toResponse());
        }
        const serverError = enhanced_error_1.Errors.server(errorMessage || 'An error occurred setting up the stream', null, req.app.locals.requestId);
        return res.status(serverError.status).json(serverError.toResponse());
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map