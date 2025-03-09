/**
 * AI Orchestrator - Integrated system combining OpenRouter, CrewAI, and Vector DB
 *
 * This class provides a unified interface for working with AI models, agent orchestration,
 * function calling, and knowledge management through vector databases.
 */
import { OpenRouterConfig, CompletionRequest, ChatMessage, Agent, ExtendedAgentConfig, Task, TaskResult, CrewConfig, Workflow, TaskExecutionConfig, TaskCallbacks, CrewRunStatus, VectorDocument, VectorSearchOptions, VectorSearchResult, VectorDB, FunctionDefinition, ToolCall } from '../interfaces/index.js';
import { ExtendedVectorDBConfig } from '../utils/vector-db.js';
import { OpenRouter } from './open-router.js';
/**
 * AI Orchestrator class that integrates OpenRouter, CrewAI, and Vector DB capabilities
 */
export declare class AIOrchestrator {
    private openRouter;
    private logger;
    private functionRegistry;
    private agentRegistry;
    private taskRegistry;
    private workflowRegistry;
    private crewRegistry;
    private vectorDbRegistry;
    /**
     * Create a new AI Orchestrator instance
     *
     * @param config - OpenRouter configuration
     */
    constructor(config: OpenRouterConfig);
    /**
     * Get the underlying OpenRouter instance
     *
     * @returns The OpenRouter instance
     */
    getOpenRouter(): OpenRouter;
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
    registerFunction(name: string, description: string, parameters: Record<string, any>, required: string[] | undefined, implementation: (args: any) => any): FunctionDefinition;
    /**
     * Execute tool calls from an AI model response
     *
     * @param toolCalls - Tool calls from the model
     * @returns Results of executed functions
     */
    executeToolCalls(toolCalls: ToolCall[]): Promise<Record<string, any>>;
    /**
     * Send a chat completion request with integrated function calling
     *
     * @param options - Chat completion options
     * @returns The completion response
     */
    chat(options: Partial<CompletionRequest> & {
        messages: ChatMessage[];
    }): Promise<import("../interfaces/responses.js").CompletionResponse>;
    /**
     * Create and register a new agent
     *
     * @param agentConfig - Agent configuration
     * @returns The created agent
     */
    createAgent(agentConfig: Partial<Agent>): ExtendedAgentConfig;
    /**
     * Create and register a new task
     *
     * @param taskConfig - Task configuration
     * @returns The created task
     */
    createTask(taskConfig: Task): Task;
    /**
     * Create and register a new workflow
     *
     * @param workflowConfig - Workflow configuration
     * @returns The created workflow
     */
    createWorkflow(workflowConfig: Workflow): Workflow;
    /**
     * Create and register a new crew
     *
     * @param crewConfig - Crew configuration
     * @returns The created crew
     */
    createCrew(crewConfig: CrewConfig): CrewConfig;
    /**
     * Execute a task with a specific agent
     *
     * @param taskId - Task ID or task object
     * @param agentId - Agent ID or agent object
     * @param config - Optional execution configuration
     * @param callbacks - Optional callbacks for task lifecycle events
     * @returns Promise resolving to the task result
     */
    executeTask(taskId: string | Task, agentId: string | Agent | ExtendedAgentConfig, config?: TaskExecutionConfig, callbacks?: TaskCallbacks): Promise<TaskResult>;
    /**
     * Execute a workflow with registered agents
     *
     * @param workflowId - Workflow ID or workflow object
     * @param config - Optional execution configuration
     * @param callbacks - Optional callbacks for task lifecycle events
     * @returns Promise resolving to the workflow results
     */
    executeWorkflow(workflowId: string | Workflow, config?: TaskExecutionConfig, callbacks?: TaskCallbacks): Promise<Record<string, TaskResult>>;
    /**
     * Run a crew with specified tasks
     *
     * @param crewId - Crew ID or crew object
     * @param taskIds - Array of task IDs or task objects
     * @param config - Optional execution configuration
     * @param callbacks - Optional callbacks for task lifecycle events
     * @returns Promise resolving to the crew run status
     */
    runCrew(crewId: string | CrewConfig, taskIds: (string | Task)[], config?: TaskExecutionConfig, callbacks?: TaskCallbacks): Promise<CrewRunStatus>;
    /**
     * Create and register a new vector database
     *
     * @param id - Unique identifier for the vector database
     * @param config - Vector database configuration
     * @returns The created vector database
     */
    createVectorDb(id: string, config: ExtendedVectorDBConfig): VectorDB;
    /**
     * Get a registered vector database by ID
     *
     * @param id - Vector database ID
     * @returns The vector database or undefined if not found
     */
    getVectorDb(id: string): VectorDB | undefined;
    /**
     * Add a document to a vector database
     *
     * @param dbId - Vector database ID
     * @param document - The document to add
     * @param namespace - Optional namespace/collection to add the document to
     * @returns Promise resolving to the document ID
     */
    addDocument(dbId: string, document: VectorDocument, namespace?: string): Promise<string>;
    /**
     * Add multiple documents to a vector database
     *
     * @param dbId - Vector database ID
     * @param documents - Array of documents to add
     * @param namespace - Optional namespace/collection to add the documents to
     * @returns Promise resolving to an array of document IDs
     */
    addDocuments(dbId: string, documents: VectorDocument[], namespace?: string): Promise<string[]>;
    /**
     * Search a vector database using text query
     *
     * @param dbId - Vector database ID
     * @param text - The text to search for
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    searchByText(dbId: string, text: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Add knowledge to an agent's vector database
     *
     * @param agentId - The agent ID
     * @param document - The document to add
     * @param namespace - Optional namespace/collection to add the document to
     * @returns Promise resolving to the document ID
     */
    addAgentKnowledge(agentId: string, document: VectorDocument, namespace?: string): Promise<string>;
    /**
     * Add multiple documents to an agent's knowledge base
     *
     * @param agentId - The agent ID
     * @param documents - Array of documents to add
     * @param namespace - Optional namespace/collection to add the documents to
     * @returns Promise resolving to an array of document IDs
     */
    addAgentKnowledgeBatch(agentId: string, documents: VectorDocument[], namespace?: string): Promise<string[]>;
    /**
     * Search an agent's knowledge base using text query
     *
     * @param agentId - The agent ID
     * @param text - The text to search for
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    searchAgentKnowledge(agentId: string, text: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Create a multi-agent system with integrated knowledge and function calling
     *
     * @param config - Configuration for the multi-agent system
     * @returns The created multi-agent system
     */
    createMultiAgentSystem(config: {
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
            config: ExtendedVectorDBConfig;
            documents?: VectorDocument[];
        }[];
    }): Promise<{
        name: string;
        agents: ExtendedAgentConfig[];
        functions: FunctionDefinition[];
        vectorDbs: Map<string, VectorDB>;
    }>;
}
//# sourceMappingURL=ai-orchestrator.d.ts.map