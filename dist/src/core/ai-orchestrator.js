/**
 * AI Orchestrator - Integrated system combining OpenRouter, CrewAI, and Vector DB
 *
 * This class provides a unified interface for working with AI models, agent orchestration,
 * function calling, and knowledge management through vector databases.
 */
import { OpenRouter } from './open-router.js';
import { FunctionCalling } from '../utils/function-calling.js';
import { Logger } from '../utils/logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
/**
 * AI Orchestrator class that integrates OpenRouter, CrewAI, and Vector DB capabilities
 */
export class AIOrchestrator {
    /**
     * Create a new AI Orchestrator instance
     *
     * @param config - OpenRouter configuration
     */
    constructor(config) {
        this.functionRegistry = new Map();
        this.agentRegistry = new Map();
        this.taskRegistry = new Map();
        this.workflowRegistry = new Map();
        this.crewRegistry = new Map();
        this.vectorDbRegistry = new Map();
        this.openRouter = new OpenRouter(config);
        this.logger = new Logger(config.logLevel || 'info');
    }
    /**
     * Get the underlying OpenRouter instance
     *
     * @returns The OpenRouter instance
     */
    getOpenRouter() {
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
     */
    registerFunction(name, description, parameters, required = [], implementation) {
        const functionDef = FunctionCalling.createFunctionDefinition(name, description, parameters, required);
        this.functionRegistry.set(name, implementation);
        this.logger.debug(`Registered function: ${name}`);
        return functionDef;
    }
    /**
     * Execute tool calls from an AI model response
     *
     * @param toolCalls - Tool calls from the model
     * @returns Results of executed functions
     */
    async executeToolCalls(toolCalls) {
        const functionMap = {};
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
     */
    async chat(options) {
        // Convert registered functions to tools if needed
        if (!options.tools && this.functionRegistry.size > 0) {
            const tools = [];
            for (const [name, _] of this.functionRegistry.entries()) {
                const functionDef = FunctionCalling.createFunctionDefinition(name, '', // Description will be filled from registry in a real implementation
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
     */
    createAgent(agentConfig) {
        const agent = this.openRouter.createAgent(agentConfig);
        this.agentRegistry.set(agent.id, agent);
        return agent;
    }
    /**
     * Create and register a new task
     *
     * @param taskConfig - Task configuration
     * @returns The created task
     */
    createTask(taskConfig) {
        const task = this.openRouter.createTask(taskConfig);
        this.taskRegistry.set(task.id, task);
        return task;
    }
    /**
     * Create and register a new workflow
     *
     * @param workflowConfig - Workflow configuration
     * @returns The created workflow
     */
    createWorkflow(workflowConfig) {
        const workflow = this.openRouter.createWorkflow(workflowConfig);
        this.workflowRegistry.set(workflow.id, workflow);
        return workflow;
    }
    /**
     * Create and register a new crew
     *
     * @param crewConfig - Crew configuration
     * @returns The created crew
     */
    createCrew(crewConfig) {
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
     */
    async executeTask(taskId, agentId, config, callbacks) {
        // Resolve task
        let task;
        if (typeof taskId === 'string') {
            const registeredTask = this.taskRegistry.get(taskId);
            if (!registeredTask) {
                throw new OpenRouterError(`Task not found: ${taskId}`, 400, null);
            }
            task = registeredTask;
        }
        else {
            task = taskId;
        }
        // Resolve agent
        let agent;
        if (typeof agentId === 'string') {
            const registeredAgent = this.agentRegistry.get(agentId);
            if (!registeredAgent) {
                throw new OpenRouterError(`Agent not found: ${agentId}`, 400, null);
            }
            agent = registeredAgent;
        }
        else {
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
     */
    async executeWorkflow(workflowId, config, callbacks) {
        // Resolve workflow
        let workflow;
        if (typeof workflowId === 'string') {
            const registeredWorkflow = this.workflowRegistry.get(workflowId);
            if (!registeredWorkflow) {
                throw new OpenRouterError(`Workflow not found: ${workflowId}`, 400, null);
            }
            workflow = registeredWorkflow;
        }
        else {
            workflow = workflowId;
        }
        // Collect agents needed for this workflow
        const agents = {};
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
     */
    async runCrew(crewId, taskIds, config, callbacks) {
        // Resolve crew
        let crew;
        if (typeof crewId === 'string') {
            const registeredCrew = this.crewRegistry.get(crewId);
            if (!registeredCrew) {
                throw new OpenRouterError(`Crew not found: ${crewId}`, 400, null);
            }
            crew = registeredCrew;
        }
        else {
            crew = crewId;
        }
        // Resolve tasks
        const tasks = [];
        for (const taskId of taskIds) {
            if (typeof taskId === 'string') {
                const registeredTask = this.taskRegistry.get(taskId);
                if (!registeredTask) {
                    throw new OpenRouterError(`Task not found: ${taskId}`, 400, null);
                }
                tasks.push(registeredTask);
            }
            else {
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
     */
    createVectorDb(id, config) {
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
    getVectorDb(id) {
        return this.vectorDbRegistry.get(id);
    }
    /**
     * Add a document to a vector database
     *
     * @param dbId - Vector database ID
     * @param document - The document to add
     * @param namespace - Optional namespace/collection to add the document to
     * @returns Promise resolving to the document ID
     */
    async addDocument(dbId, document, namespace) {
        const vectorDb = this.vectorDbRegistry.get(dbId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not found: ${dbId}`, 400, null);
        }
        await vectorDb.addDocument({
            collectionName: namespace || 'default',
            document,
            embedding: [] // This should be generated by the vector database implementation
        });
        return document.id;
    }
    /**
     * Add multiple documents to a vector database
     *
     * @param dbId - Vector database ID
     * @param documents - Array of documents to add
     * @param namespace - Optional namespace/collection to add the documents to
     * @returns Promise resolving to an array of document IDs
     */
    async addDocuments(dbId, documents, namespace) {
        const vectorDb = this.vectorDbRegistry.get(dbId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not found: ${dbId}`, 400, null);
        }
        const ids = [];
        for (const document of documents) {
            await vectorDb.addDocument({
                collectionName: namespace || 'default',
                document,
                embedding: [] // This should be generated by the vector database implementation
            });
            const id = document.id;
            ids.push(id);
        }
        return ids;
    }
    /**
     * Search a vector database using text query
     *
     * @param dbId - Vector database ID
     * @param text - The text to search for
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    async searchByText(dbId, text, options) {
        const vectorDb = this.vectorDbRegistry.get(dbId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not found: ${dbId}`, 400, null);
        }
        return vectorDb.search({
            collectionName: options?.collectionName || 'default',
            query: text,
            ...options
        });
    }
    /**
     * Add knowledge to an agent's vector database
     *
     * @param agentId - The agent ID
     * @param document - The document to add
     * @param namespace - Optional namespace/collection to add the document to
     * @returns Promise resolving to the document ID
     */
    async addAgentKnowledge(agentId, document, namespace) {
        return this.openRouter.addAgentKnowledge(agentId, document, namespace);
    }
    /**
     * Add multiple documents to an agent's knowledge base
     *
     * @param agentId - The agent ID
     * @param documents - Array of documents to add
     * @param namespace - Optional namespace/collection to add the documents to
     * @returns Promise resolving to an array of document IDs
     */
    async addAgentKnowledgeBatch(agentId, documents, namespace) {
        return this.openRouter.addAgentKnowledgeBatch(agentId, documents, namespace);
    }
    /**
     * Search an agent's knowledge base using text query
     *
     * @param agentId - The agent ID
     * @param text - The text to search for
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    async searchAgentKnowledge(agentId, text, options) {
        return this.openRouter.searchAgentKnowledge(agentId, text, options);
    }
    /**
     * Create a multi-agent system with integrated knowledge and function calling
     *
     * @param config - Configuration for the multi-agent system
     * @returns The created multi-agent system
     */
    async createMultiAgentSystem(config) {
        const result = {
            name: config.name,
            agents: [],
            functions: [],
            vectorDbs: new Map()
        };
        // Create agents
        for (const agentConfig of config.agents) {
            const agent = this.createAgent(agentConfig);
            result.agents.push(agent);
        }
        // Register functions
        if (config.functions) {
            for (const funcConfig of config.functions) {
                const funcDef = this.registerFunction(funcConfig.name, funcConfig.description, funcConfig.parameters, funcConfig.required, funcConfig.implementation);
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
//# sourceMappingURL=ai-orchestrator.js.map