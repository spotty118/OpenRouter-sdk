/**
 * Vector Database Routes
 *
 * API endpoints for vector database operations.
 */
import express from 'express';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
const router = express.Router();
const logger = new Logger('info');
/**
 * Create a vector database
 *
 * POST /api/v1/vector-db
 */
router.post('/', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const config = req.body;
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
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Create vector database request: dimensions=${config.dimensions}, type=${config.type || 'default'}`);
        // Create vector database
        const vectorDb = openRouter.createVectorDb(config);
        // Return the response
        res.status(201).json({
            message: 'Vector database created successfully',
            config
        });
    }
    catch (error) {
        logger.error(`Create vector database error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while creating vector database',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Add document to vector database
 *
 * POST /api/v1/vector-db/:id/documents
 */
router.post('/:id/documents', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const dbId = req.params.id;
        const document = req.body.document;
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
        const openRouter = new OpenRouter({ apiKey });
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
    }
    catch (error) {
        logger.error(`Add document error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while adding document',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Add multiple documents to vector database
 *
 * POST /api/v1/vector-db/:id/documents/batch
 */
router.post('/:id/documents/batch', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const dbId = req.params.id;
        const documents = req.body.documents;
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
        const openRouter = new OpenRouter({ apiKey });
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
    }
    catch (error) {
        logger.error(`Add batch documents error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while adding batch documents',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Search vector database by text
 *
 * GET /api/v1/vector-db/:id/search
 */
router.get('/:id/search', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const dbId = req.params.id;
        const query = req.query.query;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const minScore = req.query.min_score ? parseFloat(req.query.min_score) : undefined;
        const namespace = req.query.namespace;
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
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Search request: db=${dbId}, query="${query}", limit=${limit || 'default'}, namespace=${namespace || 'default'}`);
        // Create vector database (this would typically be retrieved from a database in a real implementation)
        const vectorDb = openRouter.createVectorDb({
            dimensions: 1536, // Default dimensions
            similarityMetric: 'cosine'
        });
        // Search
        const options = {
            limit,
            minScore,
            namespace
        };
        const results = await vectorDb.searchByText(query, options);
        // Return the response
        res.status(200).json({ results });
    }
    catch (error) {
        logger.error(`Search error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while searching',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Get document from vector database
 *
 * GET /api/v1/vector-db/:id/documents/:documentId
 */
router.get('/:id/documents/:documentId', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const dbId = req.params.id;
        const documentId = req.params.documentId;
        const namespace = req.query.namespace;
        // Initialize OpenRouter with the API key
        const openRouter = new OpenRouter({ apiKey });
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
    }
    catch (error) {
        logger.error(`Get document error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while getting document',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
/**
 * Delete document from vector database
 *
 * DELETE /api/v1/vector-db/:id/documents/:documentId
 */
router.delete('/:id/documents/:documentId', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const dbId = req.params.id;
        const documentId = req.params.documentId;
        const namespace = req.query.namespace;
        // Initialize OpenRouter with the API key
        const openRouter = new OpenRouter({ apiKey });
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
    }
    catch (error) {
        logger.error(`Delete document error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred while deleting document',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
export default router;
//# sourceMappingURL=vector-db.js.map