/**
 * Agent API routes
 */
import express from 'express';
import { agentManager } from '../../utils/agent-manager.js';
import { ResearchAgent } from '../../agents/research-agent.js';
import { Logger } from '../../utils/logger.js';
import { OpenRouterError } from '../../errors/openrouter-error.js';
import { TaskResult } from '../../interfaces/crew-ai.js';

const router = express.Router();
const logger = new Logger('info');

// Initialize default agents
const initializeDefaultAgents = () => {
  try {
    // Create research agent
    const researchAgent = new ResearchAgent({
      id: 'research-agent',
      name: 'Research Specialist',
      model: 'anthropic/claude-3-opus-20240229',
      maxSearchResults: 8,
      maxDepth: 3
    });
    
    logger.info('Default agents initialized');
  } catch (error) {
    logger.error('Failed to initialize default agents:', error);
  }
};

// Initialize agents on startup
initializeDefaultAgents();

/**
 * GET /api/v1/agent
 * List all available agents
 */
router.get('/', (req, res) => {
  try {
    const agents = agentManager.getAgents();
    const agentList = Array.from(agents.values()).map(agent => ({
      id: agent.id,
      name: agent.name,
      model: agent.model,
      status: agent.status()
    }));
    
    res.json({
      agents: agentList
    });
  } catch (error) {
    logger.error('Error listing agents:', error);
    res.status(500).json({
      error: {
        message: 'Failed to list agents',
        details: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

/**
 * GET /api/v1/agent/:id
 * Get agent details
 */
router.get('/:id', (req, res) => {
  try {
    const agents = agentManager.getAgents();
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        error: {
          message: `Agent not found: ${req.params.id}`
        }
      });
    }
    
    const capabilities = agentManager.getAgentCapabilities(agent.id);
    const metrics = agentManager.getAgentMetrics(agent.id);
    
    res.json({
      id: agent.id,
      name: agent.name,
      model: agent.model,
      status: agent.status(),
      capabilities,
      metrics
    });
  } catch (error) {
    logger.error(`Error getting agent ${req.params.id}:`, error);
    res.status(500).json({
      error: {
        message: 'Failed to get agent details',
        details: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

/**
 * POST /api/v1/agent/:id/execute
 * Execute a task with an agent
 */
router.post('/:id/execute', async (req, res) => {
  // Set a timeout for the entire request
  const requestTimeout = 60000; // 60 seconds
  let timeoutId: NodeJS.Timeout | undefined;
  
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${requestTimeout}ms`));
    }, requestTimeout);
  });
  
  try {
    const agents = agentManager.getAgents();
    const agent = agents.get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        error: {
          message: `Agent not found: ${req.params.id}`
        }
      });
    }
    
    // Validate request body
    if (!req.body.task) {
      return res.status(400).json({
        error: {
          message: 'Missing required field: task'
        }
      });
    }
    
    // Create task from request
    const task = {
      id: `task-${Date.now()}`,
      description: req.body.task,
      requiresThinking: req.body.requiresThinking !== false,
      requiresToolUse: req.body.requiresToolUse !== false,
      requiresReasoning: req.body.requiresReasoning !== false,
      requiresCollaboration: req.body.requiresCollaboration === true,
      input: req.body.input || {},
      context: req.body.context || {}
    };
    
    // Log task execution start
    logger.info(`Executing task with agent ${req.params.id}: ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`);
    
    // Execute task with timeout
    const result = await Promise.race([
      agentManager.executeTask(task, req.body.config),
      timeoutPromise
    ]) as TaskResult;
    
    // Clear the timeout since the task completed
    clearTimeout(timeoutId);
    
    // Log successful completion
    logger.info(`Task ${task.id} completed successfully with agent ${req.params.id}`);
    
    res.json({
      taskId: result.taskId,
      success: result.success,
      data: result.data,
      error: result.error,
      metrics: result.metrics
    });
  } catch (error: any) {
    // Clear the timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);
    
    // Handle timeout errors
    if (error.message && error.message.includes('timed out')) {
      logger.error(`Task execution timed out with agent ${req.params.id}`);
      return res.status(408).json({
        error: {
          message: 'Task execution timed out. The operation took too long to complete.',
          code: 'TIMEOUT_ERROR',
          details: error.message
        }
      });
    }
    
    logger.error(`Error executing task with agent ${req.params.id}:`, error);
    
    if (error instanceof OpenRouterError) {
      return res.status(error.status || 500).json({
        error: {
          message: error.message,
          code: error.status,
          data: error.data
        }
      });
    }
    
    res.status(500).json({
      error: {
        message: 'Failed to execute task',
        details: error instanceof Error ? error.message : String(error),
        code: 'EXECUTION_ERROR'
      }
    });
  }
});

/**
 * POST /api/v1/agent/research
 * Shortcut for research tasks
 */
router.post('/research', async (req, res) => {
  // Set a timeout for the entire request
  const requestTimeout = 90000; // 90 seconds for research (longer than regular tasks)
  let timeoutId: NodeJS.Timeout | undefined;
  
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Research request timed out after ${requestTimeout}ms`));
    }, requestTimeout);
  });
  
  try {
    // Validate request
    if (!req.body.query) {
      return res.status(400).json({
        error: {
          message: 'Missing required field: query'
        }
      });
    }
    
    // Create research task
    const task = {
      id: `research-${Date.now()}`,
      description: `Research: ${req.body.query}`,
      requiresThinking: true,
      requiresToolUse: true,
      requiresReasoning: true,
      requiresCollaboration: false,
      input: {
        query: req.body.query,
        depth: req.body.depth || 2
      },
      context: req.body.context || {}
    };
    
    // Log research task start
    logger.info(`Starting research task: ${req.body.query.substring(0, 100)}${req.body.query.length > 100 ? '...' : ''}`);
    
    // Execute task with timeout
    const result = await Promise.race([
      agentManager.executeTask(task),
      timeoutPromise
    ]) as TaskResult;
    
    // Clear the timeout since the task completed
    clearTimeout(timeoutId);
    
    // Log successful completion
    logger.info(`Research task ${task.id} completed successfully`);
    
    res.json({
      taskId: result.taskId,
      success: result.success,
      data: result.data,
      error: result.error,
      metrics: result.metrics
    });
  } catch (error: any) {
    // Clear the timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);
    
    // Handle timeout errors
    if (error.message && error.message.includes('timed out')) {
      logger.error(`Research task execution timed out`);
      return res.status(408).json({
        error: {
          message: 'Research task timed out. The operation took too long to complete.',
          code: 'TIMEOUT_ERROR',
          details: error.message
        }
      });
    }
    
    logger.error('Error executing research task:', error);
    
    if (error instanceof OpenRouterError) {
      return res.status(error.status || 500).json({
        error: {
          message: error.message,
          code: error.status,
          data: error.data
        }
      });
    }
    
    res.status(500).json({
      error: {
        message: 'Failed to execute research task',
        details: error instanceof Error ? error.message : String(error),
        code: 'EXECUTION_ERROR'
      }
    });
  }
});

export default router;
