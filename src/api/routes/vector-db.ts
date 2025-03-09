/**
 * Vector Database Routes
 * 
 * API endpoints for vector database operations.
 */

import express from 'express';
import { Request, Response, IRouter } from 'express';
import { OpenRouter } from '../../core/open-router';
import { OpenRouterError } from '../../errors/openrouter-error';
import { Logger } from '../../utils/logger';
import { 
  VectorDocument, 
  VectorSearchOptions, 
  VectorSearchResult,
  IVectorDB
} from '../../interfaces';
import { 
  ExtendedVectorDBConfig, 
  VectorDBType 
} from '../../utils/vector-db';

const router = express.Router();
const logger = new Logger('info');
// Create a single instance of OpenRouter to reuse across routes
const getOpenRouter = (apiKey: string) => new OpenRouter({ apiKey });

/**
 * Create a vector database
 * 
 * POST /api/v1/vector-db
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const config: ExtendedVectorDBConfig = req.body;
    
    // Validate required fields
    if (!config.dimensions) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: dimensions is required',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request
    logger.info(`Create vector database request: dimensions=${config.dimensions}, type=${config.type || 'default'}`);
    
    // Create vector database
    const vectorDb = openRouter.createVectorDb(config);
    
    // Return the response
    res.status(201).json({
      message: 'Vector database created successfully',
      config: config
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Create vector database error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred while creating vector database',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

/**
 * Add document to vector database
 * 
 * POST /api/v1/vector-db/:id/documents
 */
router.post('/:id/documents', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const dbId = req.params.id;
    const document: VectorDocument = req.body.document;
    
    // Validate required fields
    if (!document) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: document is required',
          type: 'invalid_request_error'
        }
      });
    }

    if (!document.content) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: document content is required',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request
    logger.info(`Add document request: db=${dbId}, document_id=${document.id || 'auto'}`);
    
    // Create vector database (this would typically be retrieved from a database in a real implementation)
    const vectorDb = openRouter.createVectorDb({
      dimensions: 1536, // Default dimensions
      similarityMetric: 'cosine'
    });
    
    // Add document
    const documentId = await vectorDb.addDocument(document);
    
    // Return the response
    res.status(201).json({ documentId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Add document error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred while adding document',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

/**
 * Add multiple documents to vector database
 * 
 * POST /api/v1/vector-db/:id/documents/batch
 */
router.post('/:id/documents/batch', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const dbId = req.params.id;
    const documents: VectorDocument[] = req.body.documents;
    
    // Validate required fields
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: documents array is required and must not be empty',
          type: 'invalid_request_error'
        }
      });
    }

    // Validate each document
    for (let i = 0; i < documents.length; i++) {
      if (!documents[i].content) {
        return res.status(400).json({
          error: {
            message: `Invalid request: document at index ${i} is missing content`,
            type: 'invalid_request_error'
          }
        });
      }
    }

    // Initialize OpenRouter with the API key
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request
    logger.info(`Add batch documents request: db=${dbId}, documents=${documents.length}`);
    
    // Create vector database (this would typically be retrieved from a database in a real implementation)
    const vectorDb = openRouter.createVectorDb({
      dimensions: 1536, // Default dimensions
      similarityMetric: 'cosine'
    });
    
    // Add documents
    const documentIds = await vectorDb.addDocuments(documents);
    
    // Return the response
    res.status(201).json({ documentIds });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Add batch documents error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred while adding batch documents',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

/**
 * Search vector database by text
 * 
 * GET /api/v1/vector-db/:id/search
 */
router.get('/:id/search', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const dbId = req.params.id;
    const query = req.query.query as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const minScore = req.query.min_score ? parseFloat(req.query.min_score as string) : undefined;
    const namespace = req.query.namespace as string;
    
    // Validate required fields
    if (!query) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: query parameter is required',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request
    logger.info(`Search request: db=${dbId}, query="${query}", limit=${limit || 'default'}, namespace=${namespace || 'default'}`);
    
    // Create vector database (this would typically be retrieved from a database in a real implementation)
    const vectorDb = openRouter.createVectorDb({
      dimensions: 1536, // Default dimensions
      similarityMetric: 'cosine'
    });
    
    // Search
    const options: VectorSearchOptions = {
      limit,
      minScore,
      namespace
    };
    
    const results = await vectorDb.searchByText(query, options);
    
    // Return the response
    res.status(200).json({ results });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Search error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred while searching',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

/**
 * Get document from vector database
 * 
 * GET /api/v1/vector-db/:id/documents/:documentId
 */
router.get('/:id/documents/:documentId', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const dbId = req.params.id;
    const documentId = req.params.documentId;
    const namespace = req.query.namespace as string;
    
    // Initialize OpenRouter with the API key
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request
    logger.info(`Get document request: db=${dbId}, document=${documentId}, namespace=${namespace || 'default'}`);
    
    // Create vector database (this would typically be retrieved from a database in a real implementation)
    const vectorDb = openRouter.createVectorDb({
      dimensions: 1536, // Default dimensions
      similarityMetric: 'cosine'
    });
    
    // Get document
    const document = await vectorDb.getDocument(documentId, namespace);
    
    if (!document) {
      return res.status(404).json({
        error: {
          message: `Document not found: ${documentId}`,
          type: 'not_found_error'
        }
      });
    }
    
    // Return the response
    res.status(200).json(document);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Get document error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred while getting document',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

/**
 * Delete document from vector database
 * 
 * DELETE /api/v1/vector-db/:id/documents/:documentId
 */
router.delete('/:id/documents/:documentId', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const dbId = req.params.id;
    const documentId = req.params.documentId;
    const namespace = req.query.namespace as string;
    
    // Initialize OpenRouter with the API key
    const openRouter = getOpenRouter(apiKey);
    
    // Log the request
    logger.info(`Delete document request: db=${dbId}, document=${documentId}, namespace=${namespace || 'default'}`);
    
    // Create vector database (this would typically be retrieved from a database in a real implementation)
    const vectorDb = openRouter.createVectorDb({
      dimensions: 1536, // Default dimensions
      similarityMetric: 'cosine'
    });
    
    // Delete document
    const success = await vectorDb.deleteDocument(documentId, namespace);
    
    if (!success) {
      return res.status(404).json({
        error: {
          message: `Document not found: ${documentId}`,
          type: 'not_found_error'
        }
      });
    }
    
    // Return the response
    res.status(204).end();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Delete document error: ${errorMessage}`, error);
    
    const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
    res.status(statusCode).json({
      error: {
        message: errorMessage || 'An error occurred while deleting document',
        type: error instanceof Error ? error.name : 'server_error',
        code: statusCode,
        data: (error instanceof OpenRouterError) ? error.data : null
      }
    });
  }
});

export default router;