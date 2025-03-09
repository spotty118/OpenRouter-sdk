/**
 * CrewAI agent orchestration implementation
 *
 * Provides utilities for creating, managing and orchestrating agents and tasks
 * in a multi-agent system.
 */
import { ProcessMode, TaskStatus } from '../interfaces/index.js';
import { Logger } from './logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import { VectorDB, createVectorDB } from './vector-db.js';
/**
 * CrewAI utility class for orchestrating multiple AI agents
 */
export class CrewAI {
    /**
     * Create a new CrewAI instance
     */
    constructor() {
        this.vectorDbs = new Map();
        this.logger = new Logger('info');
    }
    /**
     * Create a new agent with specified capabilities
     *
     * @param agentConfig - The agent configuration
     * @returns The created agent
     *
     * @example
     * ```typescript
     * const researchAgent = crewAI.createAgent({
     *   id: 'researcher',
     *   name: 'Research Specialist',
     *   description: 'Expert at finding and analyzing information',
     *   model: 'anthropic/claude-3-opus-20240229',
     *   systemMessage: 'You are a research specialist who excels at finding accurate information.',
     *   temperature: 0.2
     * });
     * ```
     */
    createAgent(agentConfig) {
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
     * const researchTask = crewAI.createTask({
     *   id: 'market-research',
     *   name: 'Market Research',
     *   description: 'Research the current market trends for electric vehicles',
     *   assignedAgentId: 'researcher',
     *   expectedOutput: 'A comprehensive report on EV market trends with key statistics'
     * });
     * ```
     */
    createTask(taskConfig) {
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
     * const researchWorkflow = crewAI.createWorkflow({
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
    createWorkflow(workflowConfig) {
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
     * const researchCrew = crewAI.createCrew({
     *   id: 'research-team',
     *   name: 'Research Team',
     *   description: 'A team that researches and summarizes information',
     *   agents: [researchAgent, writerAgent],
     *   processMode: ProcessMode.SEQUENTIAL,
     *   verbose: true
     * });
     * ```
     */
    createCrew(crewConfig) {
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
        const agentIds = new Set();
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
     * Execute a single task with a specific agent
     *
     * @param task - The task to execute
     * @param agent - The agent to execute the task
     * @param config - Optional execution configuration
     * @param callbacks - Optional callbacks for task lifecycle events
     * @returns A promise resolving to the task result
     *
     * @example
     * ```typescript
     * const result = await crewAI.executeTask(
     *   researchTask,
     *   researchAgent,
     *   { maxIterations: 3 },
     *   {
     *     onTaskComplete: (result) => console.log(`Task completed: ${result.output}`)
     *   }
     * );
     * ```
     */
    async executeTask(task, agent, config, callbacks) {
        const startTime = new Date();
        if (callbacks?.onTaskStart) {
            callbacks.onTaskStart(task.id, agent.id);
        }
        try {
            this.logger.info(`Executing task: ${task.name} (${task.id}) with agent: ${agent.name} (${agent.id})`);
            // This is where the actual task execution would occur
            // In a real implementation, this would involve sending requests to LLM APIs,
            // handling tool usage, etc.
            // For now, return a mock result
            const result = {
                taskId: task.id,
                agentId: agent.id,
                status: TaskStatus.COMPLETED,
                output: `Task ${task.name} completed successfully with agent ${agent.name}`,
                completedAt: new Date()
            };
            if (callbacks?.onTaskComplete) {
                callbacks.onTaskComplete(result);
            }
            return result;
        }
        catch (error) {
            const errorResult = {
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
     * const results = await crewAI.executeWorkflow(
     *   researchWorkflow,
     *   { 'researcher': researchAgent, 'writer': writerAgent },
     *   { processMode: ProcessMode.SEQUENTIAL },
     *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
     * );
     * ```
     */
    async executeWorkflow(workflow, agents, config, callbacks) {
        this.logger.info(`Executing workflow: ${workflow.name} (${workflow.id}) with ${workflow.tasks.length} tasks`);
        const results = {};
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
        }
        else if (processMode === ProcessMode.PARALLEL) {
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
        }
        else if (processMode === ProcessMode.HIERARCHICAL) {
            // Execute tasks based on their dependencies
            if (!workflow.dependencies) {
                throw new OpenRouterError('Hierarchical execution requires task dependencies', 400, null);
            }
            // Build dependency graph
            const dependencyGraph = {};
            workflow.tasks.forEach(task => {
                dependencyGraph[task.id] = workflow.dependencies?.[task.id] || [];
            });
            // Track completed tasks
            const completed = new Set();
            // Execute tasks in dependency order
            while (completed.size < workflow.tasks.length) {
                const readyTasks = workflow.tasks.filter(task => !completed.has(task.id) &&
                    (dependencyGraph[task.id]?.every(dep => completed.has(dep)) ?? true));
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
        }
        else {
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
     * const runStatus = await crewAI.runCrew(
     *   researchCrew,
     *   [researchTask, summaryTask],
     *   { processMode: ProcessMode.SEQUENTIAL },
     *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
     * );
     * ```
     */
    async runCrew(crew, tasks, config, callbacks) {
        const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const startTime = new Date();
        this.logger.info(`Running crew: ${crew.name} (${crew.id}) with ${tasks.length} tasks, run ID: ${runId}`);
        // Initial status
        const status = {
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
            const agentMap = {};
            crew.agents.forEach(agent => {
                agentMap[agent.id] = agent;
            });
            // Create internal callbacks to track status
            const internalCallbacks = {
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
            }
            else if (processMode === ProcessMode.PARALLEL) {
                // Execute all tasks in parallel
                const promises = tasks.map(async (task) => {
                    const agent = agentMap[task.assignedAgentId];
                    if (!agent) {
                        throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
                    }
                    return this.executeTask(task, agent, config, internalCallbacks);
                });
                await Promise.all(promises);
            }
            else {
                throw new OpenRouterError(`Unsupported process mode: ${processMode}`, 400, null);
            }
            // Update final status
            status.status = 'completed';
            status.endTime = new Date();
            return status;
        }
        catch (error) {
            // Update status on failure
            status.status = 'failed';
            status.endTime = new Date();
            status.error = error instanceof Error ? error.message : String(error);
            this.logger.error(`Crew run failed: ${runId}`, error);
            return status;
        }
    }
    /**
     * Initialize a vector database for an agent
     *
     * @param agentId - The agent ID
     * @param config - Vector database configuration
     * @returns The initialized vector database
     */
    initializeVectorDb(agentId, config) {
        if (this.vectorDbs.has(agentId)) {
            return this.vectorDbs.get(agentId);
        }
        let vectorDb;
        // Check if config has a 'type' property, indicating it's an ExtendedVectorDBConfig
        if (config.type) {
            vectorDb = createVectorDB(config);
        }
        else {
            // For backward compatibility, create a standard VectorDB
            vectorDb = new VectorDB(config);
        }
        this.vectorDbs.set(agentId, vectorDb);
        return vectorDb;
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
     * const docId = await crewAI.addKnowledge(
     *   'researcher',
     *   {
     *     id: 'doc1',
     *     content: 'Electric vehicles are becoming increasingly popular...',
     *     metadata: { source: 'research-report', topic: 'electric-vehicles' }
     *   }
     * );
     * ```
     */
    async addKnowledge(agentId, document, namespace) {
        const vectorDb = this.vectorDbs.get(agentId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
        }
        return vectorDb.addDocument(document, namespace);
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
     * const docIds = await crewAI.addKnowledgeBatch(
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
    async addKnowledgeBatch(agentId, documents, namespace) {
        const vectorDb = this.vectorDbs.get(agentId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
        }
        return vectorDb.addDocuments(documents, namespace);
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
     * const results = await crewAI.searchKnowledge(
     *   'researcher',
     *   'electric vehicle market trends',
     *   { limit: 5, minScore: 0.7 }
     * );
     * ```
     */
    async searchKnowledge(agentId, text, options) {
        const vectorDb = this.vectorDbs.get(agentId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
        }
        return vectorDb.searchByText(text, options);
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
     * const document = await crewAI.getKnowledgeDocument('researcher', 'doc1');
     * ```
     */
    async getKnowledgeDocument(agentId, documentId, namespace) {
        const vectorDb = this.vectorDbs.get(agentId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
        }
        return vectorDb.getDocument(documentId, namespace);
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
     * const success = await crewAI.deleteKnowledgeDocument('researcher', 'doc1');
     * ```
     */
    async deleteKnowledgeDocument(agentId, documentId, namespace) {
        const vectorDb = this.vectorDbs.get(agentId);
        if (!vectorDb) {
            throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
        }
        return vectorDb.deleteDocument(documentId, namespace);
    }
}
//# sourceMappingURL=crew-ai.js.map
