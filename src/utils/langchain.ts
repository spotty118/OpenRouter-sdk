/**
 * LangChain implementation of agent orchestration
 * 
 * Provides utilities for creating, managing and orchestrating agents and tasks
 * using LangChain's architecture instead of CrewAI.
 * 
 * This implementation is tightly integrated with provider SDKs from OpenAI, Claude/Anthropic, 
 * and Google Gemini for direct access to native provider capabilities.
 */

// Import LangChain essentials
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentExecutor } from 'langchain/agents';
import { PromptTemplate } from '@langchain/core/prompts';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

// Import interfaces
import {
  Agent,
  Task,
  TaskResult,
  CrewConfig,
  ProcessMode,
  TaskExecutionConfig,
  TaskStatus,
  Workflow,
  TaskCallbacks,
  CrewRunStatus
} from '../interfaces/index.js';
import { ExtendedAgentConfig, AgentTool } from '../interfaces/crew-ai.js';
import { VectorDocument, VectorSearchOptions, VectorSearchResult } from '../interfaces/vector-db.js';

// Import utilities
import { Logger } from './logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import { VectorDB as UtilVectorDB, createVectorDB, ExtendedVectorDBConfig, VectorDBType } from './vector-db.js';

/**
 * LangChain utility class for orchestrating multiple AI agents
 * Replaces CrewAI with LangChain-based implementation
 */
export class LangChain {
  private logger: Logger;
  // Using any type to work around type conflicts between different VectorDB implementations
  private vectorDbs: Map<string, any> = new Map();
  private tools: Map<string, any> = new Map(); // Using any to avoid type conflicts
  private chatModels: Map<string, ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI> = new Map();
  
  /**
   * Create a new LangChain instance
   */
  constructor() {
    this.logger = new Logger('info');
  }

  /**
   * Create a LangChain chat model based on provider and model ID
   * 
   * @param modelId - The model identifier (e.g., 'openai/gpt-4o')
   * @param config - Configuration for the model
   * @returns The LangChain chat model
   */
  private createChatModel(
    modelId: string,
    config: {
      temperature?: number;
      maxTokens?: number;
      apiKey?: string;
    }
  ): ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI {
    if (this.chatModels.has(modelId)) {
      return this.chatModels.get(modelId)!;
    }

    let model;
    
    if (modelId.startsWith('openai/')) {
      // OpenAI models
      const openaiModel = modelId.replace('openai/', '');
      model = new ChatOpenAI({
        modelName: openaiModel,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens,
        apiKey: config.apiKey
      });
    } else if (modelId.startsWith('anthropic/')) {
      // Anthropic/Claude models
      const anthropicModel = modelId.replace('anthropic/', '');
      model = new ChatAnthropic({
        modelName: anthropicModel,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens,
        apiKey: config.apiKey
      });
    } else if (modelId.startsWith('google/')) {
      // Google models
      const googleModel = modelId.replace('google/', '');
      model = new ChatGoogleGenerativeAI({
        modelName: googleModel,
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens,
        apiKey: config.apiKey
      });
    } else {
      throw new OpenRouterError(`Unsupported model provider: ${modelId}`, 400, null);
    }
    
    // Cache the model for reuse
    this.chatModels.set(modelId, model);
    
    return model;
  }

  /**
   * Create a new agent with specified capabilities
   * 
   * @param agentConfig - The agent configuration
   * @returns The created agent
   * 
   * @example
   * ```typescript
   * const researchAgent = langChain.createAgent({
   *   id: 'researcher',
   *   name: 'Research Specialist',
   *   description: 'Expert at finding and analyzing information',
   *   model: 'anthropic/claude-3-opus-20240229',
   *   systemMessage: 'You are a research specialist who excels at finding accurate information.',
   *   temperature: 0.2
   * });
   * ```
   */
  createAgent(agentConfig: ExtendedAgentConfig): ExtendedAgentConfig {
    // Validate required fields
    if (!agentConfig.id) {
      throw new OpenRouterError('Agent ID is required', 400, null);
    }
    if (!agentConfig.name) {
      throw new OpenRouterError('Agent name is required', 400, null);
    }
    if (!agentConfig.model) {
      throw new OpenRouterError('Agent model is required', 400, null);
    }
    
    // Initialize vector database if configured
    if (agentConfig.memory?.vectorDb) {
      this.initializeVectorDb(agentConfig.id, agentConfig.memory.vectorDb);
    }
    
    this.logger.debug(`Created agent: ${agentConfig.name} (${agentConfig.id})`);
    return agentConfig;
  }

  /**
   * Create a new task to be executed by an agent
   * 
   * @param taskConfig - The task configuration
   * @returns The created task
   * 
   * @example
   * ```typescript
   * const researchTask = langChain.createTask({
   *   id: 'market-research',
   *   name: 'Market Research',
   *   description: 'Research the current market trends for electric vehicles',
   *   assignedAgentId: 'researcher',
   *   expectedOutput: 'A comprehensive report on EV market trends with key statistics'
   * });
   * ```
   */
  createTask(taskConfig: Task): Task {
    // Validate required fields
    if (!taskConfig.id) {
      throw new OpenRouterError('Task ID is required', 400, null);
    }
    if (!taskConfig.name) {
      throw new OpenRouterError('Task name is required', 400, null);
    }
    if (!taskConfig.description) {
      throw new OpenRouterError('Task description is required', 400, null);
    }
    if (!taskConfig.assignedAgentId) {
      throw new OpenRouterError('Task must be assigned to an agent', 400, null);
    }
    
    this.logger.debug(`Created task: ${taskConfig.name} (${taskConfig.id})`);
    return taskConfig;
  }

  /**
   * Create a new workflow connecting multiple tasks
   * 
   * @param workflowConfig - The workflow configuration
   * @returns The created workflow
   * 
   * @example
   * ```typescript
   * const researchWorkflow = langChain.createWorkflow({
   *   id: 'research-workflow',
   *   name: 'Research and Summarize',
   *   tasks: [researchTask, summaryTask],
   *   dependencies: {
   *     'summary-task': ['research-task']
   *   },
   *   processMode: ProcessMode.HIERARCHICAL
   * });
   * ```
   */
  createWorkflow(workflowConfig: Workflow): Workflow {
    // Validate required fields
    if (!workflowConfig.id) {
      throw new OpenRouterError('Workflow ID is required', 400, null);
    }
    if (!workflowConfig.name) {
      throw new OpenRouterError('Workflow name is required', 400, null);
    }
    if (!workflowConfig.tasks || workflowConfig.tasks.length === 0) {
      throw new OpenRouterError('Workflow must include at least one task', 400, null);
    }
    
    // Validate task dependencies
    if (workflowConfig.dependencies) {
      for (const [taskId, dependsOn] of Object.entries(workflowConfig.dependencies)) {
        // Check if the task exists
        if (!workflowConfig.tasks.some(task => task.id === taskId)) {
          throw new OpenRouterError(`Invalid task dependency: Task ${taskId} not found in workflow`, 400, null);
        }
        
        // Check if dependency tasks exist
        for (const depTaskId of dependsOn) {
          if (!workflowConfig.tasks.some(task => task.id === depTaskId)) {
            throw new OpenRouterError(`Invalid task dependency: Dependent task ${depTaskId} not found in workflow`, 400, null);
          }
        }
      }
    }
    
    this.logger.debug(`Created workflow: ${workflowConfig.name} (${workflowConfig.id}) with ${workflowConfig.tasks.length} tasks`);
    return workflowConfig;
  }

  /**
   * Create a new crew of agents
   * 
   * @param crewConfig - The crew configuration
   * @returns The crew configuration
   * 
   * @example
   * ```typescript
   * const researchCrew = langChain.createCrew({
   *   id: 'research-team',
   *   name: 'Research Team',
   *   description: 'A team that researches and summarizes information',
   *   agents: [researchAgent, writerAgent],
   *   processMode: ProcessMode.SEQUENTIAL,
   *   verbose: true
   * });
   * ```
   */
  createCrew(crewConfig: CrewConfig): CrewConfig {
    // Validate required fields
    if (!crewConfig.id) {
      throw new OpenRouterError('Crew ID is required', 400, null);
    }
    if (!crewConfig.name) {
      throw new OpenRouterError('Crew name is required', 400, null);
    }
    if (!crewConfig.agents || crewConfig.agents.length === 0) {
      throw new OpenRouterError('Crew must include at least one agent', 400, null);
    }
    
    // Check for duplicate agent IDs
    const agentIds = new Set<string>();
    for (const agent of crewConfig.agents) {
      if (agentIds.has(agent.id)) {
        throw new OpenRouterError(`Duplicate agent ID: ${agent.id}`, 400, null);
      }
      agentIds.add(agent.id);
    }
    
    this.logger.debug(`Created crew: ${crewConfig.name} (${crewConfig.id}) with ${crewConfig.agents.length} agents`);
    return crewConfig;
  }

  /**
   * Execute a single task with a specific agent using LangChain
   * 
   * @param task - The task to execute
   * @param agent - The agent to execute the task
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns A promise resolving to the task result
   * 
   * @example
   * ```typescript
   * const result = await langChain.executeTask(
   *   researchTask,
   *   researchAgent,
   *   { maxIterations: 3 },
   *   { 
   *     onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) 
   *   }
   * );
   * ```
   */
  async executeTask(
    task: Task,
    agent: Agent | ExtendedAgentConfig,
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<TaskResult> {
    const startTime = new Date();
    
    if (callbacks?.onTaskStart) {
      callbacks.onTaskStart(task.id, agent.id);
    }
    
    try {
      this.logger.info(`Executing task: ${task.name} (${task.id}) with agent: ${agent.name} (${agent.id})`);
      
      // Create LangChain chat model
      const llm = this.createChatModel(agent.model, {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        apiKey: process.env.OPENROUTER_API_KEY
      });
      
      // Create system message combining agent's system message and task description
      const systemMessage = new SystemMessage(`${agent.systemMessage || ''}\n\nTask: ${task.description}`);
      
      // Set up prompt template for the agent
      const prompt = PromptTemplate.fromTemplate(`{input}`);
      
      let output = '';
      
      // For now, simple direct call to the model
      const messages = [systemMessage];
      
      // Add context if provided
      if (task.context) {
        messages.push(new HumanMessage(task.context));
      }
      
      // Add the task itself as a human message
      messages.push(new HumanMessage(task.description));
      
      // Run the model
      const response = await llm.invoke(messages);
      output = response.content as string;
      
      // Create task result
      const result: TaskResult = {
        taskId: task.id,
        agentId: agent.id,
        status: TaskStatus.COMPLETED,
        output,
        completedAt: new Date()
      };
      
      if (callbacks?.onTaskComplete) {
        callbacks.onTaskComplete(result);
      }
      
      return result;
    } catch (error) {
      const errorResult: TaskResult = {
        taskId: task.id,
        agentId: agent.id,
        status: TaskStatus.FAILED,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date()
      };
      
      if (callbacks?.onTaskError) {
        callbacks.onTaskError(task.id, error);
      }
      
      this.logger.error(`Task execution failed: ${task.id}`, error);
      return errorResult;
    }
  }

  /**
   * Execute a workflow of tasks
   * 
   * @param workflow - The workflow to execute
   * @param agents - The agents to use for execution (mapped by ID)
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns A promise resolving to the workflow results
   * 
   * @example
   * ```typescript
   * const results = await langChain.executeWorkflow(
   *   researchWorkflow,
   *   { 'researcher': researchAgent, 'writer': writerAgent },
   *   { processMode: ProcessMode.SEQUENTIAL },
   *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
   * );
   * ```
   */
  async executeWorkflow(
    workflow: Workflow,
    agents: Record<string, Agent | ExtendedAgentConfig>,
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<Record<string, TaskResult>> {
    this.logger.info(`Executing workflow: ${workflow.name} (${workflow.id}) with ${workflow.tasks.length} tasks`);
    
    const results: Record<string, TaskResult> = {};
    const processMode = config?.processMode || workflow.processMode || ProcessMode.SEQUENTIAL;
    
    if (processMode === ProcessMode.SEQUENTIAL) {
      // Execute tasks sequentially
      for (const task of workflow.tasks) {
        const agent = agents[task.assignedAgentId];
        if (!agent) {
          throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
        }
        
        results[task.id] = await this.executeTask(task, agent, config, callbacks);
      }
    } else if (processMode === ProcessMode.PARALLEL) {
      // Execute tasks in parallel
      const promises = workflow.tasks.map(async (task) => {
        const agent = agents[task.assignedAgentId];
        if (!agent) {
          throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
        }
        
        return this.executeTask(task, agent, config, callbacks);
      });
      
      const taskResults = await Promise.all(promises);
      workflow.tasks.forEach((task, index) => {
        results[task.id] = taskResults[index];
      });
    } else if (processMode === ProcessMode.HIERARCHICAL) {
      // Execute tasks based on their dependencies
      if (!workflow.dependencies) {
        throw new OpenRouterError('Hierarchical execution requires task dependencies', 400, null);
      }
      
      // Build dependency graph
      const dependencyGraph: Record<string, string[]> = {};
      workflow.tasks.forEach(task => {
        dependencyGraph[task.id] = workflow.dependencies?.[task.id] || [];
      });
      
      // Track completed tasks
      const completed = new Set<string>();
      
      // Execute tasks in dependency order
      while (completed.size < workflow.tasks.length) {
        const readyTasks = workflow.tasks.filter(task => 
          !completed.has(task.id) && 
          (dependencyGraph[task.id]?.every(dep => completed.has(dep)) ?? true)
        );
        
        if (readyTasks.length === 0) {
          throw new OpenRouterError('Circular dependency detected in workflow', 400, null);
        }
        
        // Execute ready tasks in parallel
        const promises = readyTasks.map(async (task) => {
          const agent = agents[task.assignedAgentId];
          if (!agent) {
            throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
          }
          
          return { taskId: task.id, result: await this.executeTask(task, agent, config, callbacks) };
        });
        
        const batchResults = await Promise.all(promises);
        batchResults.forEach(({ taskId, result }) => {
          results[taskId] = result;
          completed.add(taskId);
        });
      }
    } else {
      throw new OpenRouterError(`Unsupported process mode: ${processMode}`, 400, null);
    }
    
    return results;
  }

  /**
   * Run a crew with specified tasks
   * 
   * @param crew - The crew configuration
   * @param tasks - The tasks to execute
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns A promise resolving to the crew run status
   * 
   * @example
   * ```typescript
   * const runStatus = await langChain.runCrew(
   *   researchCrew,
   *   [researchTask, summaryTask],
   *   { processMode: ProcessMode.SEQUENTIAL },
   *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
   * );
   * ```
   */
  async runCrew(
    crew: CrewConfig,
    tasks: Task[],
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<CrewRunStatus> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startTime = new Date();
    
    this.logger.info(`Running crew: ${crew.name} (${crew.id}) with ${tasks.length} tasks, run ID: ${runId}`);
    
    // Initial status
    const status: CrewRunStatus = {
      runId,
      crewId: crew.id,
      taskStatuses: {},
      taskResults: {},
      status: 'running',
      startTime
    };
    
    // Initialize task statuses
    tasks.forEach(task => {
      status.taskStatuses[task.id] = TaskStatus.PENDING;
    });
    
    try {
      // Create a map of agents by ID for easy lookup
      const agentMap: Record<string, Agent | ExtendedAgentConfig> = {};
      crew.agents.forEach(agent => {
        agentMap[agent.id] = agent;
      });
      
      // Create internal callbacks to track status
      const internalCallbacks: TaskCallbacks = {
        onTaskStart: (taskId, agentId) => {
          status.taskStatuses[taskId] = TaskStatus.IN_PROGRESS;
          callbacks?.onTaskStart?.(taskId, agentId);
        },
        onTaskComplete: (result) => {
          status.taskStatuses[result.taskId] = result.status;
          status.taskResults[result.taskId] = result;
          callbacks?.onTaskComplete?.(result);
        },
        onTaskError: (taskId, error) => {
          status.taskStatuses[taskId] = TaskStatus.FAILED;
          callbacks?.onTaskError?.(taskId, error);
        },
        onTaskApprovalRequired: callbacks?.onTaskApprovalRequired
      };
      
      // Process mode
      const processMode = config?.processMode || crew.processMode || ProcessMode.SEQUENTIAL;
      
      if (processMode === ProcessMode.SEQUENTIAL) {
        // Execute tasks sequentially
        for (const task of tasks) {
          const agent = agentMap[task.assignedAgentId];
          if (!agent) {
            throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
          }
          
          const result = await this.executeTask(task, agent, config, internalCallbacks);
          
          // Check for failure and handle based on crew configuration
          if (result.status === TaskStatus.FAILED && !crew.failureHandling?.continueOnFailure) {
            throw new Error(`Task ${task.id} failed: ${result.error}`);
          }
        }
      } else if (processMode === ProcessMode.PARALLEL) {
        // Execute all tasks in parallel
        const promises = tasks.map(async (task) => {
          const agent = agentMap[task.assignedAgentId];
          if (!agent) {
            throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
          }
          
          return this.executeTask(task, agent, config, internalCallbacks);
        });
        
        await Promise.all(promises);
      } else {
        throw new OpenRouterError(`Unsupported process mode: ${processMode}`, 400, null);
      }
      
      // Update final status
      status.status = 'completed';
      status.endTime = new Date();
      
      return status;
    } catch (error) {
      // Update status on failure
      status.status = 'failed';
      status.endTime = new Date();
      status.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`Crew run failed: ${runId}`, error);
      return status;
    }
  }

  /**
   * Register a tool that can be used by agents
   * 
   * @param name - Tool name
   * @param description - Tool description
   * @param schema - JSON schema for the tool's parameters
   * @param fn - The function implementation
   * @returns The registered tool
   */
  registerTool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    fn: (args: Record<string, unknown>) => Promise<unknown>
  ): any {
    // Create a tool wrapper compatible with the AgentTool interface
    const tool = {
      name,
      description,
      type: 'function', // Adding required type property
      schema,
      function: async (args: Record<string, unknown>) => { // Rename to function as required by AgentTool
        try {
          return await fn(args);
        } catch (error) {
          this.logger.error(`Error executing tool ${name}:`, error);
          throw error;
        }
      }
    };
    
    this.tools.set(name, tool);
    return tool;
  }

  /**
   * Initialize a vector database for an agent
   * 
   * @param agentId - The agent ID
   * @param config - Vector database configuration
   * @returns The initialized vector database
   */
  private initializeVectorDb(agentId: string, config: any): any {
    if (this.vectorDbs.has(agentId)) {
      return this.vectorDbs.get(agentId)!;
    }
    
    try {
      // Create the appropriate vector DB implementation
      let vectorDb;
      
      // Check if config has a 'type' property
      if (config.type) {
        // Using type assertion to bypass type checking conflicts
        vectorDb = createVectorDB(config as ExtendedVectorDBConfig);
      } else {
        // For backward compatibility
        vectorDb = new UtilVectorDB(config);
      }
      
      this.vectorDbs.set(agentId, vectorDb);
      return vectorDb;
    } catch (error) {
      this.logger.error(`Error initializing vector database for agent ${agentId}:`, error);
      throw new OpenRouterError(
        `Failed to initialize vector database: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Add a document to an agent's knowledge base
   * 
   * @param agentId - The agent ID
   * @param document - The document to add
   * @param namespace - Optional namespace/collection to add the document to
   * @returns Promise resolving to the document ID
   * 
   * @example
   * ```typescript
   * const docId = await langChain.addKnowledge(
   *   'researcher',
   *   {
   *     id: 'doc1',
   *     content: 'Electric vehicles are becoming increasingly popular...',
   *     metadata: { source: 'research-report', topic: 'electric-vehicles' }
   *   }
   * );
   * ```
   */
  async addKnowledge(
    agentId: string,
    document: VectorDocument,
    namespace?: string
  ): Promise<string> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Using the .addDocument method with proper parameter handling
      // Some implementations might expect namespace, some might not
      return namespace
        ? await vectorDb.addDocument(document, namespace)
        : await vectorDb.addDocument(document);
    } catch (error) {
      this.logger.error(`Error adding document to ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to add document: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Add multiple documents to an agent's knowledge base
   * 
   * @param agentId - The agent ID
   * @param documents - Array of documents to add
   * @param namespace - Optional namespace/collection to add the documents to
   * @returns Promise resolving to an array of document IDs
   * 
   * @example
   * ```typescript
   * const docIds = await langChain.addKnowledgeBatch(
   *   'researcher',
   *   [
   *     {
   *       id: 'doc1',
   *       content: 'Electric vehicles are becoming increasingly popular...',
   *       metadata: { source: 'research-report', topic: 'electric-vehicles' }
   *     },
   *     {
   *       id: 'doc2',
   *       content: 'The global market for electric vehicles is expected to grow...',
   *       metadata: { source: 'market-analysis', topic: 'electric-vehicles' }
   *     }
   *   ]
   * );
   * ```
   */
  async addKnowledgeBatch(
    agentId: string,
    documents: VectorDocument[],
    namespace?: string
  ): Promise<string[]> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Using the .addDocuments method with proper parameter handling
      return namespace
        ? await vectorDb.addDocuments(documents, namespace)
        : await vectorDb.addDocuments(documents);
    } catch (error) {
      this.logger.error(`Error adding documents to ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to add documents: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Search an agent's knowledge base using text query
   * 
   * @param agentId - The agent ID
   * @param text - The text to search for
   * @param options - Search options
   * @returns Promise resolving to an array of search results
   * 
   * @example
   * ```typescript
   * const results = await langChain.searchKnowledge(
   *   'researcher',
   *   'electric vehicle market trends',
   *   { limit: 5, minScore: 0.7 }
   * );
   * ```
   */
  async searchKnowledge(
    agentId: string,
    text: string,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      return await vectorDb.searchByText(text, options || {});
    } catch (error) {
      this.logger.error(`Error searching ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to search knowledge base: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Get a document from an agent's knowledge base by its ID
   * 
   * @param agentId - The agent ID
   * @param documentId - The document ID
   * @param namespace - Optional namespace/collection to search in
   * @returns Promise resolving to the document or null if not found
   * 
   * @example
   * ```typescript
   * const document = await langChain.getKnowledgeDocument('researcher', 'doc1');
   * ```
   */
  async getKnowledgeDocument(
    agentId: string,
    documentId: string,
    namespace?: string
  ): Promise<VectorDocument | null> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Handle namespace parameter consistently with other methods
      return namespace
        ? await vectorDb.getDocument(documentId, namespace)
        : await vectorDb.getDocument(documentId);
    } catch (error) {
      this.logger.error(`Error getting document from ${agentId}'s knowledge base:`, error);
      return null; // Return null instead of throwing to be more resilient
    }
  }

  /**
   * Delete a document from an agent's knowledge base
   * 
   * @param agentId - The agent ID
   * @param documentId - The document ID
   * @param namespace - Optional namespace/collection
   * @returns Promise resolving to a boolean indicating success
   * 
   * @example
   * ```typescript
   * const success = await langChain.deleteKnowledgeDocument('researcher', 'doc1');
   * ```
   */
  async deleteKnowledgeDocument(
    agentId: string,
    documentId: string,
    namespace?: string
  ): Promise<boolean> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Handle namespace parameter consistently with other methods
      return namespace
        ? await vectorDb.deleteDocument(documentId, namespace)
        : await vectorDb.deleteDocument(documentId);
    } catch (error) {
      this.logger.error(`Error deleting document from ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }
}
