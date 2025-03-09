/**
 * AI Orchestrator - Integrated system combining OpenRouter, CrewAI, and Vector DB
 * 
 * This class provides a unified interface for working with AI models, agent orchestration,
 * function calling, and knowledge management through vector databases.
 */

import { OpenRouterConfig,
  CompletionRequest,
  ChatMessage,
  Agent,
  ExtendedAgentConfig,
  Task,
  TaskResult,
  CrewConfig,
  Workflow,
  TaskExecutionConfig,
  TaskCallbacks,
  CrewRunStatus,
  VectorDocument,
  VectorSearchOptions,
  VectorSearchResult,
  VectorDBConfig,
  IVectorDB,
  FunctionDefinition,
  ToolCall,
  ToolDefinition } from '../interfaces/index.js';

import { OpenRouter } from './open-router.js';
import { FunctionCalling } from '../utils/function-calling.js';
import { Logger } from '../utils/logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * AI Orchestrator class that integrates OpenRouter, CrewAI, and Vector DB capabilities
 */
export class AIOrchestrator {
  private openRouter: OpenRouter;
  private logger: Logger;
  private functionRegistry: Map<string, (...args: any[]) => any> = new Map();
  private agentRegistry: Map<string, ExtendedAgentConfig> = new Map();
  private taskRegistry: Map<string, Task> = new Map();
  private workflowRegistry: Map<string, Workflow> = new Map();
  private crewRegistry: Map<string, CrewConfig> = new Map();
  private vectorDbRegistry: Map<string, IVectorDB> = new Map();

  /**
   * Create a new AI Orchestrator instance
   * 
   * @param config - OpenRouter configuration
   */
  constructor(config: OpenRouterConfig) {
    this.openRouter = new OpenRouter(config);
    this.logger = new Logger(config.logLevel || 'info');
  }

  /**
   * Get the underlying OpenRouter instance
   * 
   * @returns The OpenRouter instance
   */
  getOpenRouter(): OpenRouter {
    return this.openRouter;
  }

  /**
   * Register a function that can be called by AI models
   * 
   * @param name - Function name
   * @param description - Function description
   * @param parameters - Parameter definitions
   * @param required - Required parameters
   * @param implementation - Function implementation
   * @returns The function definition
   * 
   * @example
   * ```typescript
   * const weatherFunction = orchestrator.registerFunction(
   *   'get_weather',
   *   'Get current weather for a location',
   *   {
   *     location: {
   *       type: 'string',
   *       description: 'City name'
   *     },
   *     units: {
   *       type: 'string',
   *       enum: ['celsius', 'fahrenheit'],
   *       default: 'celsius'
   *     }
   *   },
   *   ['location'],
   *   async (args) => {
   *     // Implementation to fetch weather data
   *     return { temperature: 22, conditions: 'sunny' };
   *   }
   * );
   * ```
   */
  registerFunction(
    name: string,
    description: string,
    parameters: Record<string, any>,
    required: string[] = [],
    implementation: (args: any) => any
  ): FunctionDefinition {
    const functionDef = FunctionCalling.createFunctionDefinition(
      name,
      description,
      parameters,
      required
    );
    
    this.functionRegistry.set(name, implementation);
    this.logger.debug(`Registered function: ${name}`);
    
    return functionDef;
  }

  /**
   * Execute tool calls from an AI model response
   * 
   * @param toolCalls - Tool calls from the model
   * @returns Results of executed functions
   * 
   * @example
   * ```typescript
   * // After getting a response with tool calls
   * const response = await orchestrator.chat({
   *   messages: [{ role: 'user', content: 'What\'s the weather in Paris?' }],
   *   tools: [weatherFunction],
   *   model: 'openai/gpt-4o'
   * });
   * 
   * if (response.choices[0].message.tool_calls) {
   *   const results = await orchestrator.executeToolCalls(
   *     response.choices[0].message.tool_calls
   *   );
   *   console.log('Tool results:', results);
   * }
   * ```
   */
  async executeToolCalls(toolCalls: ToolCall[]): Promise<Record<string, any>> {
    const functionMap: Record<string, (...args: any[]) => any> = {};
    
    // Convert Map to Record for FunctionCalling.executeToolCalls
    for (const [name, implementation] of this.functionRegistry.entries()) {
      functionMap[name] = implementation;
    }
    
    return FunctionCalling.executeToolCalls(toolCalls, functionMap);
  }

  /**
   * Send a chat completion request with integrated function calling
   * 
   * @param options - Chat completion options
   * @returns The completion response
   * 
   * @example
   * ```typescript
   * const response = await orchestrator.chat({
   *   messages: [
   *     { role: 'system', content: 'You are a helpful assistant.' },
   *     { role: 'user', content: 'What\'s the weather in New York?' }
   *   ],
   *   tools: [weatherFunction],
   *   model: 'anthropic/claude-3-opus'
   * });
   * ```
   */
  async chat(options: Partial<CompletionRequest> & { messages: ChatMessage[] }) {
    // Convert registered functions to tools if needed
    if (!options.tools && this.functionRegistry.size > 0) {
      const tools: ToolDefinition[] = [];
      
      for (const [name, _] of this.functionRegistry.entries()) {
        const functionDef = FunctionCalling.createFunctionDefinition(
          name,
          '', // Description will be filled from registry in a real implementation
          {} // Parameters will be filled from registry in a real implementation
        );
        
        tools.push({
          type: 'function',
          function: functionDef
        });
      }
      
      options.tools = tools;
    }
    
    return this.openRouter.createChatCompletion(options);
  }

  /**
   * Create and register a new agent
   * 
   * @param agentConfig - Agent configuration
   * @returns The created agent
   * 
   * @example
   * ```typescript
   * const researchAgent = orchestrator.createAgent({
   *   id: 'researcher',
   *   name: 'Research Specialist',
   *   description: 'Expert at finding and analyzing information',
   *   model: 'anthropic/claude-3-opus',
   *   systemMessage: 'You are a research specialist who excels at finding accurate information.',
   *   temperature: 0.2
   * });
   * ```
   */
  createAgent(agentConfig: Partial<Agent>): ExtendedAgentConfig {
    const agent = this.openRouter.createAgent(agentConfig);
    this.agentRegistry.set(agent.id, agent);
    return agent;
  }

  /**
   * Create and register a new task
   * 
   * @param taskConfig - Task configuration
   * @returns The created task
   * 
   * @example
   * ```typescript
   * const researchTask = orchestrator.createTask({
   *   id: 'market-research',
   *   name: 'Market Research',
   *   description: 'Research the current market trends for electric vehicles',
   *   assignedAgentId: 'researcher',
   *   expectedOutput: 'A comprehensive report on EV market trends with key statistics'
   * });
   * ```
   */
  createTask(taskConfig: Task): Task {
    const task = this.openRouter.createTask(taskConfig);
    this.taskRegistry.set(task.id, task);
    return task;
  }

  /**
   * Create and register a new workflow
   * 
   * @param workflowConfig - Workflow configuration
   * @returns The created workflow
   * 
   * @example
   * ```typescript
   * const researchWorkflow = orchestrator.createWorkflow({
   *   id: 'research-workflow',
   *   name: 'Research and Summarize',
   *   tasks: [researchTask, summaryTask],
   *   dependencies: {
   *     'summary-task': ['research-task']
   *   }
   * });
   * ```
   */
  createWorkflow(workflowConfig: Workflow): Workflow {
    const workflow = this.openRouter.createWorkflow(workflowConfig);
    this.workflowRegistry.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Create and register a new crew
   * 
   * @param crewConfig - Crew configuration
   * @returns The created crew
   * 
   * @example
   * ```typescript
   * const researchCrew = orchestrator.createCrew({
   *   id: 'research-team',
   *   name: 'Research Team',
   *   description: 'A team that researches and summarizes information',
   *   agents: [researchAgent, writerAgent]
   * });
   * ```
   */
  createCrew(crewConfig: CrewConfig): CrewConfig {
    const crew = this.openRouter.createCrew(crewConfig);
    this.crewRegistry.set(crew.id, crew);
    return crew;
  }

  /**
   * Execute a task with a specific agent
   * 
   * @param taskId - Task ID or task object
   * @param agentId - Agent ID or agent object
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns Promise resolving to the task result
   * 
   * @example
   * ```typescript
   * const result = await orchestrator.executeTask(
   *   'market-research',
   *   'researcher',
   *   { maxIterations: 3 }
   * );
   * ```
   */
  async executeTask(
    taskId: string | Task,
    agentId: string | Agent | ExtendedAgentConfig,
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<TaskResult> {
    // Resolve task
    let task: Task;
    if (typeof taskId === 'string') {
      const registeredTask = this.taskRegistry.get(taskId);
      if (!registeredTask) {
        throw new OpenRouterError(`Task not found: ${taskId}`, 400, null);
      }
      task = registeredTask;
    } else {
      task = taskId;
    }
    
    // Resolve agent
    let agent: Agent | ExtendedAgentConfig;
    if (typeof agentId === 'string') {
      const registeredAgent = this.agentRegistry.get(agentId);
      if (!registeredAgent) {
        throw new OpenRouterError(`Agent not found: ${agentId}`, 400, null);
      }
      agent = registeredAgent;
    } else {
      agent = agentId;
    }
    
    return this.openRouter.executeTask(task, agent, config, callbacks);
  }

  /**
   * Execute a workflow with registered agents
   * 
   * @param workflowId - Workflow ID or workflow object
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns Promise resolving to the workflow results
   * 
   * @example
   * ```typescript
   * const results = await orchestrator.executeWorkflow('research-workflow');
   * ```
   */
  async executeWorkflow(
    workflowId: string | Workflow,
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<Record<string, TaskResult>> {
    // Resolve workflow
    let workflow: Workflow;
    if (typeof workflowId === 'string') {
      const registeredWorkflow = this.workflowRegistry.get(workflowId);
      if (!registeredWorkflow) {
        throw new OpenRouterError(`Workflow not found: ${workflowId}`, 400, null);
      }
      workflow = registeredWorkflow;
    } else {
      workflow = workflowId;
    }
    
    // Collect agents needed for this workflow
    const agents: Record<string, Agent | ExtendedAgentConfig> = {};
    
    for (const task of workflow.tasks) {
      const agent = this.agentRegistry.get(task.assignedAgentId);
      if (!agent) {
        throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
      }
      agents[task.assignedAgentId] = agent;
    }
    
    return this.openRouter.executeWorkflow(workflow, agents, config, callbacks);
  }

  /**
   * Run a crew with specified tasks
   * 
   * @param crewId - Crew ID or crew object
   * @param taskIds - Array of task IDs or task objects
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns Promise resolving to the crew run status
   * 
   * @example
   * ```typescript
   * const runStatus = await orchestrator.runCrew(
   *   'research-team',
   *   ['market-research', 'data-analysis', 'report-writing']
   * );
   * ```
   */
  async runCrew(
    crewId: string | CrewConfig,
    taskIds: (string | Task)[],
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<CrewRunStatus> {
    // Resolve crew
    let crew: CrewConfig;
    if (typeof crewId === 'string') {
      const registeredCrew = this.crewRegistry.get(crewId);
      if (!registeredCrew) {
        throw new OpenRouterError(`Crew not found: ${crewId}`, 400, null);
      }
      crew = registeredCrew;
    } else {
      crew = crewId;
    }
    
    // Resolve tasks
    const tasks: Task[] = [];
    for (const taskId of taskIds) {
      if (typeof taskId === 'string') {
        const registeredTask = this.taskRegistry.get(taskId);
        if (!registeredTask) {
          throw new OpenRouterError(`Task not found: ${taskId}`, 400, null);
        }
        tasks.push(registeredTask);
      } else {
        tasks.push(taskId);
      }
    }
    
    return this.openRouter.runCrew(crew, tasks, config, callbacks);
  }

  /**
   * Create and register a new vector database
   * 
   * @param id - Unique identifier for the vector database
   * @param config - Vector database configuration
   * @returns The created vector database
   * 
   * @example
   * ```typescript
   * const vectorDb = orchestrator.createVectorDb(
   *   'research-knowledge',
   *   {
   *     dimensions: 1536,
   *     maxVectors: 10000,
   *     similarityMetric: 'cosine',
   *     persistToDisk: true,
   *     storagePath: './data/research-db'
   *   }
   * );
   * ```
   */
  createVectorDb(id: string, config: VectorDBConfig): IVectorDB {
    const vectorDb = this.openRouter.createVectorDb(config);
    this.vectorDbRegistry.set(id, vectorDb);
    return vectorDb;
  }

  /**
   * Get a registered vector database by ID
   * 
   * @param id - Vector database ID
   * @returns The vector database or undefined if not found
   */
  getVectorDb(id: string): IVectorDB | undefined {
    return this.vectorDbRegistry.get(id);
  }

  /**
   * Add a document to a vector database
   * 
   * @param dbId - Vector database ID
   * @param document - The document to add
   * @param namespace - Optional namespace/collection to add the document to
   * @returns Promise resolving to the document ID
   * 
   * @example
   * ```typescript
   * const docId = await orchestrator.addDocument(
   *   'research-knowledge',
   *   {
   *     id: 'doc1',
   *     content: 'Electric vehicles are becoming increasingly popular...',
   *     metadata: { source: 'research-report', topic: 'electric-vehicles' }
   *   }
   * );
   * ```
   */
  async addDocument(
    dbId: string,
    document: VectorDocument,
    namespace?: string
  ): Promise<string> {
    const vectorDb = this.vectorDbRegistry.get(dbId);
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not found: ${dbId}`, 400, null);
    }
    
    return vectorDb.addDocument(document, namespace);
  }

  /**
   * Add multiple documents to a vector database
   * 
   * @param dbId - Vector database ID
   * @param documents - Array of documents to add
   * @param namespace - Optional namespace/collection to add the documents to
   * @returns Promise resolving to an array of document IDs
   * 
   * @example
   * ```typescript
   * const docIds = await orchestrator.addDocuments(
   *   'research-knowledge',
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
  async addDocuments(
    dbId: string,
    documents: VectorDocument[],
    namespace?: string
  ): Promise<string[]> {
    const vectorDb = this.vectorDbRegistry.get(dbId);
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not found: ${dbId}`, 400, null);
    }
    
    return vectorDb.addDocuments(documents, namespace);
  }

  /**
   * Search a vector database using text query
   * 
   * @param dbId - Vector database ID
   * @param text - The text to search for
   * @param options - Search options
   * @returns Promise resolving to an array of search results
   * 
   * @example
   * ```typescript
   * const results = await orchestrator.searchByText(
   *   'research-knowledge',
   *   'electric vehicle market trends',
   *   { limit: 5, minScore: 0.7 }
   * );
   * ```
   */
  async searchByText(
    dbId: string,
    text: string,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const vectorDb = this.vectorDbRegistry.get(dbId);
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not found: ${dbId}`, 400, null);
    }
    
    return vectorDb.searchByText(text, options);
  }

  /**
   * Add knowledge to an agent's vector database
   * 
   * @param agentId - The agent ID
   * @param document - The document to add
   * @param namespace - Optional namespace/collection to add the document to
   * @returns Promise resolving to the document ID
   * 
   * @example
   * ```typescript
   * const docId = await orchestrator.addAgentKnowledge(
   *   'researcher',
   *   {
   *     id: 'doc1',
   *     content: 'Electric vehicles are becoming increasingly popular...',
   *     metadata: { source: 'research-report', topic: 'electric-vehicles' }
   *   }
   * );
   * ```
   */
  async addAgentKnowledge(
    agentId: string,
    document: VectorDocument,
    namespace?: string
  ): Promise<string> {
    return this.openRouter.addAgentKnowledge(agentId, document, namespace);
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
   * const docIds = await orchestrator.addAgentKnowledgeBatch(
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
  async addAgentKnowledgeBatch(
    agentId: string,
    documents: VectorDocument[],
    namespace?: string
  ): Promise<string[]> {
    return this.openRouter.addAgentKnowledgeBatch(agentId, documents, namespace);
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
   * const results = await orchestrator.searchAgentKnowledge(
   *   'researcher',
   *   'electric vehicle market trends',
   *   { limit: 5, minScore: 0.7 }
   * );
   * ```
   */
  async searchAgentKnowledge(
    agentId: string,
    text: string,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    return this.openRouter.searchAgentKnowledge(agentId, text, options);
  }

  /**
   * Create a multi-agent system with integrated knowledge and function calling
   * 
   * @param config - Configuration for the multi-agent system
   * @returns The created multi-agent system
   * 
   * @example
   * ```typescript
   * // Example of creating a multi-agent system
   * const mas = await orchestrator.createMultiAgentSystem({
   *   name: 'Research System',
   *   agents: [
   *     {
   *       id: 'researcher',
   *       name: 'Research Agent',
   *       description: 'Finds information',
   *       model: 'anthropic/claude-3-opus'
   *     }
   *   ],
   *   functions: [
   *     {
   *       name: 'search_web',
   *       description: 'Search the web',
   *       parameters: { query: { type: 'string' } },
   *       implementation: async (args) => ({ results: ['result1'] })
   *     }
   *   ]
   * });
   * });
   * ```
   */
  async createMultiAgentSystem(config: {
    name: string;
    agents: Partial<Agent>[];
    functions?: {
      name: string;
      description: string;
      parameters: Record<string, any>;
      required?: string[];
      implementation: (args: any) => any;
    }[];
    knowledgeBases?: {
      id: string;
      config: VectorDBConfig;
      documents?: VectorDocument[];
    }[];
  }): Promise<{
    name: string;
    agents: ExtendedAgentConfig[];
    functions: FunctionDefinition[];
    vectorDbs: Map<string, IVectorDB>;
  }> {
    const result = {
      name: config.name,
      agents: [] as ExtendedAgentConfig[],
      functions: [] as FunctionDefinition[],
      vectorDbs: new Map<string, IVectorDB>()
    };
    
    // Create agents
    for (const agentConfig of config.agents) {
      const agent = this.createAgent(agentConfig);
      result.agents.push(agent);
    }
    
    // Register functions
    if (config.functions) {
      for (const funcConfig of config.functions) {
        const funcDef = this.registerFunction(
          funcConfig.name,
          funcConfig.description,
          funcConfig.parameters,
          funcConfig.required,
          funcConfig.implementation
        );
        result.functions.push(funcDef);
      }
    }
    
    // Create knowledge bases
    if (config.knowledgeBases) {
      for (const kbConfig of config.knowledgeBases) {
        const vectorDb = this.createVectorDb(kbConfig.id, kbConfig.config);
        result.vectorDbs.set(kbConfig.id, vectorDb);
        
        // Add documents if provided
        if (kbConfig.documents && kbConfig.documents.length > 0) {
          await this.addDocuments(kbConfig.id, kbConfig.documents);
        }
      }
    }
    
    return result;
  }
}