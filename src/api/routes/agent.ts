/**
 * Agent Routes
 * 
 * API endpoints for agent orchestration and knowledge management.
 */

import express from 'express';
import { Request, Response, IRouter } from 'express';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
import { Agent, Task, Workflow, VectorDocument, VectorSearchOptions } from '../../interfaces';

const router = express.Router();
const logger = new Logger('info');

/**
 * Create an agent
 * 
 * POST /api/v1/agent
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const agentConfig: Partial<Agent> = req.body;
    
    // Validate required fields
    if (!agentConfig.id) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: agent id is required',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Create agent request: id=${agentConfig.id}, model=${agentConfig.model || 'default'}`);
    
    // Create agent
    const agent = openRouter.createAgent(agentConfig);
    
    // Return the response
    res.status(201).json(agent);
  } catch (error: any) {
    logger.error(`Create agent error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while creating agent',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Create a task
 * 
 * POST /api/v1/agent/task
 */
router.post('/task', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const taskConfig: Task = req.body;
    
    // Validate required fields
    if (!taskConfig.id) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: task id is required',
          type: 'invalid_request_error'
        }
      });
    }

    if (!taskConfig.assignedAgentId) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: assignedAgentId is required',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Create task request: id=${taskConfig.id}, agent=${taskConfig.assignedAgentId}`);
    
    // Create task
    const task = openRouter.createTask(taskConfig);
    
    // Return the response
    res.status(201).json(task);
  } catch (error: any) {
    logger.error(`Create task error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while creating task',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Create a workflow
 * 
 * POST /api/v1/agent/workflow
 */
router.post('/workflow', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const workflowConfig: Workflow = req.body;
    
    // Validate required fields
    if (!workflowConfig.id) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: workflow id is required',
          type: 'invalid_request_error'
        }
      });
    }

    if (!workflowConfig.tasks || !Array.isArray(workflowConfig.tasks) || workflowConfig.tasks.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: tasks array is required and must not be empty',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Create workflow request: id=${workflowConfig.id}, tasks=${workflowConfig.tasks.length}`);
    
    // Create workflow
    const workflow = openRouter.createWorkflow(workflowConfig);
    
    // Return the response
    res.status(201).json(workflow);
  } catch (error: any) {
    logger.error(`Create workflow error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while creating workflow',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Execute a task
 * 
 * POST /api/v1/agent/task/execute
 */
router.post('/task/execute', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const { task, agent, config, callbacks } = req.body;
    
    // Validate required fields
    if (!task) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: task is required',
          type: 'invalid_request_error'
        }
      });
    }

    if (!agent) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: agent is required',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Execute task request: task=${task.id}, agent=${agent.id}`);
    
    // Execute task
    const result = await openRouter.executeTask(task, agent, config);
    
    // Return the response
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Execute task error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while executing task',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Execute a workflow
 * 
 * POST /api/v1/agent/workflow/execute
 */
router.post('/workflow/execute', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const { workflow, agents, config, callbacks } = req.body;
    
    // Validate required fields
    if (!workflow) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: workflow is required',
          type: 'invalid_request_error'
        }
      });
    }

    if (!agents || typeof agents !== 'object' || Object.keys(agents).length === 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: agents object is required and must not be empty',
          type: 'invalid_request_error'
        }
      });
    }

    // Initialize OpenRouter with the API key
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Execute workflow request: workflow=${workflow.id}, agents=${Object.keys(agents).length}`);
    
    // Execute workflow
    const results = await openRouter.executeWorkflow(workflow, agents, config);
    
    // Return the response
    res.status(200).json(results);
  } catch (error: any) {
    logger.error(`Execute workflow error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while executing workflow',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Add knowledge to an agent
 * 
 * POST /api/v1/agent/:agentId/knowledge
 */
router.post('/:agentId/knowledge', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const agentId = req.params.agentId;
    const document: VectorDocument = req.body.document;
    const namespace = req.body.namespace;
    
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
    logger.info(`Add knowledge request: agent=${agentId}, document_id=${document.id || 'auto'}, namespace=${namespace || 'default'}`);
    
    // Add knowledge
    const documentId = await openRouter.addAgentKnowledge(agentId, document, namespace);
    
    // Return the response
    res.status(201).json({ documentId });
  } catch (error: any) {
    logger.error(`Add knowledge error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while adding knowledge',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Add batch knowledge to an agent
 * 
 * POST /api/v1/agent/:agentId/knowledge/batch
 */
router.post('/:agentId/knowledge/batch', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const agentId = req.params.agentId;
    const documents: VectorDocument[] = req.body.documents;
    const namespace = req.body.namespace;
    
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
    logger.info(`Add batch knowledge request: agent=${agentId}, documents=${documents.length}, namespace=${namespace || 'default'}`);
    
    // Add knowledge batch
    const documentIds = await openRouter.addAgentKnowledgeBatch(agentId, documents, namespace);
    
    // Return the response
    res.status(201).json({ documentIds });
  } catch (error: any) {
    logger.error(`Add batch knowledge error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while adding batch knowledge',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Search agent knowledge
 * 
 * GET /api/v1/agent/:agentId/knowledge/search
 */
router.get('/:agentId/knowledge/search', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const agentId = req.params.agentId;
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
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Search knowledge request: agent=${agentId}, query="${query}", limit=${limit || 'default'}, namespace=${namespace || 'default'}`);
    
    // Search knowledge
    const options: VectorSearchOptions = {
      limit,
      minScore,
      namespace
    };
    
    const results = await openRouter.searchAgentKnowledge(agentId, query, options);
    
    // Return the response
    res.status(200).json({ results });
  } catch (error: any) {
    logger.error(`Search knowledge error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while searching knowledge',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Get agent knowledge document
 * 
 * GET /api/v1/agent/:agentId/knowledge/:documentId
 */
router.get('/:agentId/knowledge/:documentId', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const agentId = req.params.agentId;
    const documentId = req.params.documentId;
    const namespace = req.query.namespace as string;
    
    // Initialize OpenRouter with the API key
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Get knowledge document request: agent=${agentId}, document=${documentId}, namespace=${namespace || 'default'}`);
    
    // Get document
    const document = await openRouter.getAgentKnowledgeDocument(agentId, documentId, namespace);
    
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
  } catch (error: any) {
    logger.error(`Get knowledge document error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while getting knowledge document',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

/**
 * Delete agent knowledge document
 * 
 * DELETE /api/v1/agent/:agentId/knowledge/:documentId
 */
router.delete('/:agentId/knowledge/:documentId', async (req: Request, res: Response) => {
  try {
    const apiKey = req.app.locals.apiKey;
    const agentId = req.params.agentId;
    const documentId = req.params.documentId;
    const namespace = req.query.namespace as string;
    
    // Initialize OpenRouter with the API key
    const openRouter = new OpenRouter({ apiKey });
    
    // Log the request
    logger.info(`Delete knowledge document request: agent=${agentId}, document=${documentId}, namespace=${namespace || 'default'}`);
    
    // Delete document
    const success = await openRouter.deleteAgentKnowledgeDocument(agentId, documentId, namespace);
    
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
  } catch (error: any) {
    logger.error(`Delete knowledge document error: ${error.message}`, error);
    
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'An error occurred while deleting knowledge document',
        type: error.name || 'server_error',
        code: error.status || 500,
        data: error.data
      }
    });
  }
});

export default router;