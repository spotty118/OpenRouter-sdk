/**
 * CrewAI agent orchestration implementation
 *
 * Provides utilities for creating, managing and orchestrating agents and tasks
 * in a multi-agent system.
 */
import { Agent, Task, TaskResult, CrewConfig, TaskExecutionConfig, Workflow, TaskCallbacks, CrewRunStatus } from '../interfaces/index.js';
import { ExtendedAgentConfig } from '../interfaces/crew-ai.js';
import { VectorDocument, VectorSearchOptions, VectorSearchResult } from '../interfaces/vector-db.js';
/**
 * CrewAI utility class for orchestrating multiple AI agents
 */
export declare class CrewAI {
    private logger;
    private vectorDbs;
    /**
     * Create a new CrewAI instance
     */
    constructor();
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
    createAgent(agentConfig: ExtendedAgentConfig): ExtendedAgentConfig;
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
    createTask(taskConfig: Task): Task;
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
    createWorkflow(workflowConfig: Workflow): Workflow;
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
    createCrew(crewConfig: CrewConfig): CrewConfig;
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
    executeTask(task: Task, agent: Agent | ExtendedAgentConfig, config?: TaskExecutionConfig, callbacks?: TaskCallbacks): Promise<TaskResult>;
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
    executeWorkflow(workflow: Workflow, agents: Record<string, Agent | ExtendedAgentConfig>, config?: TaskExecutionConfig, callbacks?: TaskCallbacks): Promise<Record<string, TaskResult>>;
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
    runCrew(crew: CrewConfig, tasks: Task[], config?: TaskExecutionConfig, callbacks?: TaskCallbacks): Promise<CrewRunStatus>;
    /**
     * Initialize a vector database for an agent
     *
     * @param agentId - The agent ID
     * @param config - Vector database configuration
     * @returns The initialized vector database
     */
    private initializeVectorDb;
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
    addKnowledge(agentId: string, document: VectorDocument, namespace?: string): Promise<string>;
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
    addKnowledgeBatch(agentId: string, documents: VectorDocument[], namespace?: string): Promise<string[]>;
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
    searchKnowledge(agentId: string, text: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
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
    getKnowledgeDocument(agentId: string, documentId: string, namespace?: string): Promise<VectorDocument | null>;
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
    deleteKnowledgeDocument(agentId: string, documentId: string, namespace?: string): Promise<boolean>;
}
//# sourceMappingURL=crew-ai.d.ts.map