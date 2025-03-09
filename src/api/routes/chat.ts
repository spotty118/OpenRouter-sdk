/**
 * Chat Routes
 * 
 * API endpoints for chat completions and streaming.
 */

import express from 'express';
import { Request, Response } from 'express';
import Joi from 'joi';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
import { OpenRouterError } from '../../errors/openrouter-error';
import { Errors } from '../../utils/enhanced-error';
import { CompletionRequest, ChatMessage, CompletionResponse } from '../../interfaces';
import { validate, ValidateLocation, CommonSchemas } from '../middleware/validation';

const router = express.Router();
const logger = new Logger('info');
// Create a single instance of OpenRouter to reuse across routes
const getOpenRouter = (apiKey: string) => new OpenRouter({ apiKey });

// Validation schema for chat completion requests
const chatCompletionSchema = {
  location: ValidateLocation.BODY,
  schema: Joi.object({
    messages: CommonSchemas.messages,
    model: Joi.string().min(1),
    max_tokens: Joi.number().integer().min(1),
    temperature: Joi.number().min(0).max(2),
    top_p: Joi.number().min(0).max(1),
    top_k: Joi.number().integer().min(1),
    stream: Joi.boolean(),
    presence_penalty: Joi.number().min(-2).max(2),
    frequency_penalty: Joi.number().min(-2).max(2),
    additional_stop_sequences: Joi.array().items(Joi.string()),
    seed: Joi.number().integer(),
    response_format: Joi.object(),
    tools: Joi.array().items(Joi.object()),
    tool_choice: Joi.alternatives().try(Joi.string(), Joi.object()),
    plugins: Joi.array().items(Joi.object()),
    reasoning: Joi.object(),
    include_reasoning: Joi.boolean(),
    user: Joi.string()
  }).required()
};

/**
 * Create a chat completion
 * 
 * POST /api/v1/chat/completions
 */
router.post('/completions', validate([chatCompletionSchema]), async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const requestId = req.app.locals.requestId;
    const options: Partial<CompletionRequest> & { messages: ChatMessage[] } = req.body;

    // Initialize OpenRouter with the API key
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request (excluding sensitive data)
    logger.info(`Chat completion request [${requestId}]: model=${options.model || 'default'}, messages=${options.messages.length}`);
    
    // Send request to OpenRouter
    const response = await openRouter.createChatCompletion(options);
    
    // Return the response
    res.status(200).json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Chat completion error [${req.app.locals.requestId}]: ${errorMessage}`, error);
    
    if (error instanceof OpenRouterError) {
      const enhancedError = Errors.externalApi(
        errorMessage || 'An error occurred during chat completion',
        { originalError: error.data },
        req.app.locals.requestId
      );
      return res.status(enhancedError.status).json(enhancedError.toResponse());
    }
    
    const serverError = Errors.server(
      errorMessage || 'An error occurred during chat completion',
      null,
      req.app.locals.requestId
    );
    return res.status(serverError.status).json(serverError.toResponse());
  }
});

/**
 * Stream chat completions
 * 
 * POST /api/v1/chat/completions/stream
 */
router.post('/completions/stream', validate([chatCompletionSchema]), async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const requestId = req.app.locals.requestId;
    const options: Partial<CompletionRequest> & { messages: ChatMessage[] } = req.body;

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
    } catch (streamError: unknown) {
      const errorMessage = streamError instanceof Error 
        ? streamError.message 
        : 'Unknown streaming error';
      
      logger.error(`Stream error [${requestId}]: ${errorMessage}`, streamError);
      
      const enhancedError = streamError instanceof OpenRouterError
        ? Errors.externalApi(errorMessage, { originalError: streamError }, requestId)
        : Errors.server(errorMessage, { originalError: String(streamError) }, requestId);
        
      // Send error as SSE event
      res.write(`data: ${JSON.stringify(enhancedError.toResponse())}\n\n`);
      
      res.end();
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error setting up stream';
    
    logger.error(`Stream setup error [${req.app.locals.requestId}]: ${errorMessage}`, error);
    
    if (error instanceof OpenRouterError) {
      const enhancedError = Errors.externalApi(
        errorMessage || 'An error occurred setting up the stream',
        { originalError: error.data },
        req.app.locals.requestId
      );
      return res.status(enhancedError.status).json(enhancedError.toResponse());
    }
    
    const serverError = Errors.server(
      errorMessage || 'An error occurred setting up the stream',
      null,
      req.app.locals.requestId
    );
    return res.status(serverError.status).json(serverError.toResponse());
  }
});

export default router;
