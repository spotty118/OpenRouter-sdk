/**
 * Embedding Routes
 * 
 * API endpoints for text embeddings.
 */

import express from 'express';
import { Request, Response } from 'express';
import { OpenRouter } from '../../core/open-router';
import { OpenRouterError } from '../../errors/openrouter-error';
import { Logger } from '../../utils/logger';
import { EmbeddingRequest, EmbeddingResponse } from '../../interfaces';

const router = express.Router();
const logger = new Logger('info');
// Create a single instance of OpenRouter to reuse across routes
const getOpenRouter = (apiKey: string) => new OpenRouter({ apiKey });

/**
 * Create text embeddings
 * 
 * POST /api/v1/embedding
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const options: EmbeddingRequest = req.body;
    
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
    const openRouter = getOpenRouter(apiKey);
    
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Embedding error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred during embedding generation',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

/**
 * Batch process multiple embedding requests
 * 
 * POST /api/v1/embedding/batch
 */
router.post('/batch', async (req: Request, res: Response) => {
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
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request
    logger.info(`Batch embedding request: ${requests.length} requests, concurrency=${concurrency || 3}`);
    
    // Process each embedding request individually
    // Note: OpenRouter SDK doesn't have a batch embedding method, so we'll process them individually
    const results = await Promise.all(
      requests.map(async (request: EmbeddingRequest) => {
        try {
          return await openRouter.createEmbedding(request) as EmbeddingResponse;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
          return {
            error: {
              message: errorMessage || 'An error occurred during embedding generation',
              type: error instanceof Error ? error.name : 'server_error',
              code: statusCode,
              data: (error instanceof OpenRouterError) ? error.data : null
            }
          };
        }
      })
    );
    
    // Return the response
    res.status(200).json({ results });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Batch embedding error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred during batch embedding generation',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

export default router;