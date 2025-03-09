/**
 * Chat Routes
 * 
 * API endpoints for chat completions and streaming.
 */

import express from 'express';
import { Request, Response, IRouter } from 'express';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
import { CompletionRequest, ChatMessage } from '../../interfaces';

const router = express.Router();
const logger = new Logger('info');

/**
 * Create a chat completion
 * 
 * POST /api/v1/chat/completions
 */
router.post('/completions', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const options: Partial<CompletionRequest> & { messages: ChatMessage[] } = req.body;
    
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
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request (excluding sensitive data)
    logger.info(`Chat completion request: model=${options.model || 'default'}, messages=${options.messages.length}`);
    
    // Send request to OpenRouter
    const response = await openRouter.createChatCompletion(options);
    
    // Return the response
    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Chat completion error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred during chat completion',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Stream chat completions
 * 
 * POST /api/v1/chat/completions/stream
 */
router.post('/completions/stream', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const options: Partial<CompletionRequest> & { messages: ChatMessage[] } = req.body;
    
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
    const openRouter = new OpenRouter({ apiKey });
    
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
    } catch (streamError: any) {
      logger.error(`Stream error: ${streamError.message}`, streamError);
      
      // Send error as SSE event
      res.write(`data: ${JSON.stringify({
        error: {
          message: streamError.message || 'An error occurred during streaming',
          type: streamError.name || 'stream_error'
        }
      })}\n\n`);
      
      res.end();
    }
  } catch (error: any) {
    logger.error(`Stream setup error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred setting up the stream',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

export default router;