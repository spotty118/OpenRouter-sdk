/**
 * Core OpenRouter class implementation
 */
import { OpenRouterConfig, CompletionRequest, EmbeddingRequest, ImageGenerationRequest, AudioTranscriptionRequest, CompletionResponse, EmbeddingResponse, ImageGenerationResponse, AudioTranscriptionResponse, ModelsResponse, ModelInfo, Plugin, ReasoningConfig, ProviderPreferences, ResponseFormat, ChatMessage, CostEstimate, Middleware, Agent, Task, TaskResult, CrewConfig, Workflow, TaskExecutionConfig, TaskCallbacks, CrewRunStatus, VectorDocument, VectorSearchOptions, VectorSearchResult, VectorDB } from '../interfaces/index.js';
import { ExtendedVectorDBConfig } from '../utils/vector-db.js';
import { ExtendedAgentConfig } from '../interfaces/crew-ai.js';
/**
 * Main OpenRouter SDK class
 *
 * Provides methods for interacting with the OpenRouter API to access
 * various AI models for chat completions, embeddings, image generation,
 * and audio transcription.
 */
export declare class OpenRouter {
    private apiKey;
    private baseUrl;
    private apiVersion;
    private defaultModel;
    private headers;
    private timeout;
    private maxRetries;
    private logger;
    private cache;
    private middlewares;
    private rateLimiter;
    private totalCost;
    private requestsInFlight;
    private crewAI;
    private vectorDbs;
    /**
     * Create a new OpenRouter SDK instance
     *
     * @param config - SDK configuration options
     */
    constructor(config: OpenRouterConfig);
    /**
     * Add middleware to the SDK
     *
     * @param middleware - Middleware to add
     * @returns The SDK instance for method chaining
     *
     * @example
     * ```typescript
     * openRouter.use({
     *   pre: async (request) => {
     *     console.log('Request:', request);
     *     request.temperature = 0.5; // Modify request if needed
     *     return request;
     *   },
     *   post: async (response) => {
     *     console.log('Response:', response);
     *     // Modify response if needed
     *     return response;
     *   }
     * });
     * ```
     */
    use(middleware: Middleware): OpenRouter;
    /**
     * Clear all middlewares
     *
     * @returns The SDK instance for chaining
     */
    clearMiddlewares(): OpenRouter;
    /**
     * Cancel all in-flight requests
     */
    cancelAllRequests(): void;
    /**
     * Get total estimated cost of all requests
     *
     * @returns Total cost in USD
     */
    getTotalCost(): number;
    /**
     * Reset total cost counter
     */
    resetCostTracker(): void;
    /**
     * Clear the SDK cache
     */
    clearCache(): void;
    /**
     * Send a chat completion request to OpenRouter
     *
     * @param options - The completion request options
     * @returns A promise that resolves to the completion response
     *
     * @example
     * ```typescript
     * const response = await openRouter.createChatCompletion({
     *   messages: [
     *     { role: 'system', content: 'You are a helpful assistant.' },
     *     { role: 'user', content: 'What is the capital of France?' }
     *   ],
     *   model: 'openai/gpt-4',
     *   temperature: 0.7
     * });
     * ```
     */
    createChatCompletion(options: Partial<CompletionRequest> & {
        messages: ChatMessage[];
    }): Promise<CompletionResponse>;
    /**
     * Stream chat completions
     *
     * @param options - The completion request options
     * @returns An async generator that yields completion chunks
     *
     * @example
     * ```typescript
     * for await (const chunk of openRouter.streamChatCompletions({
     *   messages: [
     *     { role: 'user', content: 'Write a poem about the sea.' }
     *   ],
     *   model: 'anthropic/claude-3-sonnet-20240229'
     * })) {
     *   const content = chunk.choices?.[0]?.delta?.content || '';
     *   process.stdout.write(content);
     * }
     * ```
     */
    streamChatCompletions(options: Partial<CompletionRequest> & {
        messages: ChatMessage[];
    }): AsyncGenerator<Partial<CompletionResponse>, void, unknown>;
    /**
     * Generate text embeddings
     *
     * @param options - The embedding request options
     * @returns Promise resolving to the embedding response
     *
     * @example
     * ```typescript
     * const embeddings = await openRouter.createEmbedding({
     *   model: 'openai/text-embedding-3-small',
     *   input: 'The quick brown fox jumps over the lazy dog'
     * });
     * ```
     */
    createEmbedding(options: EmbeddingRequest): Promise<EmbeddingResponse>;
    /**
     * Generate images using AI models
     *
     * @param options - The image generation request options
     * @returns Promise resolving to the image generation response
     *
     * @example
     * ```typescript
     * const image = await openRouter.createImage({
     *   model: 'openai/dall-e-3',
     *   prompt: 'A serene lake surrounded by mountains at sunset',
     *   size: '1024x1024',
     *   quality: 'hd'
     * });
     *
     * console.log('Image URL:', image.data[0].url);
     * ```
     */
    createImage(options: ImageGenerationRequest): Promise<ImageGenerationResponse>;
    /**
     * Transcribe audio to text
     *
     * @param options - The audio transcription request options
     * @returns Promise resolving to the transcription response
     *
     * @example
     * ```typescript
     * // With a file from browser
     * const fileInput = document.querySelector('input[type="file"]');
     * const file = fileInput.files[0];
     *
     * const transcription = await openRouter.createTranscription({
     *   model: 'openai/whisper-1',
     *   file: file,
     *   language: 'en'
     * });
     * ```
     */
    createTranscription(options: AudioTranscriptionRequest): Promise<AudioTranscriptionResponse>;
    /**
     * Get a list of available models from OpenRouter
     *
     * @returns Promise resolving to the models response
     *
     * @example
     * ```typescript
     * const models = await openRouter.listModels();
     * const chatModels = models.data.filter(model => model.capabilities?.chat);
     * ```
     */
    listModels(): Promise<ModelsResponse>;
    /**
     * Generate a unique cache key for a request
     */
    private generateCacheKey;
    /**
     * Get information about a specific model
     *
     * @param modelId - The model ID
     * @returns Promise resolving to the model info or null if not found
     */
    getModelInfo(modelId: string): Promise<ModelInfo | null>;
    /**
     * Batch process multiple chat completion requests
     *
     * @param requests - Array of completion requests
     * @param concurrency - Maximum number of concurrent requests (default: 3)
     * @returns Array of responses or errors
     *
     * @example
     * ```typescript
     * const batchRequests = [
     *   {
     *     messages: [{ role: 'user', content: 'Tell me about Paris' }],
     *     model: 'openai/gpt-3.5-turbo'
     *   },
     *   {
     *     messages: [{ role: 'user', content: 'Tell me about London' }],
     *     model: 'anthropic/claude-instant-1'
     *   }
     * ];
     *
     * const results = await openRouter.batchChatCompletions(batchRequests, 2);
     * ```
     */
    batchChatCompletions(requests: Array<Partial<CompletionRequest> & {
        messages: ChatMessage[];
    }>, concurrency?: number): Promise<Array<CompletionResponse | Error>>;
    /**
     * Enable web search for a model
     *
     * @param modelId - The ID of the model to enable web search for
     * @param maxResults - Maximum number of search results to return (default: 5)
     * @param searchPrompt - Custom prompt to attach the search results
     * @returns The model ID with online suffix
     *
     * @example
     * ```typescript
     * // Enable web search for GPT-4
     * const onlineModel = openRouter.enableWebSearch('openai/gpt-4');
     * const response = await openRouter.createChatCompletion({
     *   model: onlineModel,
     *   messages: [{ role: 'user', content: 'What happened in the news today?' }]
     * });
     * ```
     */
    enableWebSearch(modelId: string, maxResults?: number, searchPrompt?: string): string;
    /**
     * Create web search plugin configuration
     *
     * @param maxResults - Maximum number of search results to return (default: 5)
     * @param searchPrompt - Custom prompt to attach the search results
     * @returns Web plugin configuration
     *
     * @example
     * ```typescript
     * // Create web search plugin config and use in a request
     * const webPlugin = openRouter.createWebSearchPlugin(3);
     *
     * const response = await openRouter.createChatCompletion({
     *   model: 'openai/gpt-4o',
     *   plugins: [webPlugin],
     *   messages: [{ role: 'user', content: 'What happened in the news today?' }]
     * });
     * ```
     */
    createWebSearchPlugin(maxResults?: number, searchPrompt?: string): Plugin;
    /**
     * Apply model suffix for special capabilities
     *
     * @param modelId - The ID of the model
     * @param suffix - The suffix to apply ('nitro', 'floor', or 'online')
     * @returns Model ID with the suffix
     *
     * @example
     * ```typescript
     * // Get highest throughput for Claude
     * const nitroModel = openRouter.applyModelSuffix('anthropic/claude-3-opus', 'nitro');
     *
     * // Get lowest price for Llama
     * const budgetModel = openRouter.applyModelSuffix('meta-llama/llama-3.1-70b', 'floor');
     * ```
     */
    applyModelSuffix(modelId: string, suffix: 'nitro' | 'floor' | 'online'): string;
    /**
     * Create provider routing preferences for specific ordering
     *
     * @param providerNames - Array of provider names in order of preference
     * @param allowFallbacks - Whether to allow fallbacks to other providers
     * @returns Provider routing preferences
     *
     * @example
     * ```typescript
     * // Try Together first, then OpenAI, with no fallbacks to other providers
     * const providerPrefs = openRouter.orderProviders(['Together', 'OpenAI'], false);
     *
     * const response = await openRouter.createChatCompletion({
     *   model: 'mistralai/mixtral-8x7b-instruct',
     *   provider: providerPrefs,
     *   messages: [{ role: 'user', content: 'Hello' }]
     * });
     * ```
     */
    orderProviders(providerNames: string[], allowFallbacks?: boolean): ProviderPreferences;
    /**
     * Create provider routing preferences sorted by price, throughput, or latency
     *
     * @param sortBy - The attribute to sort providers by
     * @returns Provider routing preferences
     *
     * @example
     * ```typescript
     * // Sort providers by throughput
     * const providerPrefs = openRouter.sortProviders('throughput');
     *
     * const response = await openRouter.createChatCompletion({
     *   model: 'meta-llama/llama-3.1-70b-instruct',
     *   provider: providerPrefs,
     *   messages: [{ role: 'user', content: 'Hello' }]
     * });
     * ```
     */
    sortProviders(sortBy: 'price' | 'throughput' | 'latency'): ProviderPreferences;
    /**
     * Configure reasoning tokens with specific effort level
     *
     * @param level - Effort level ('high', 'medium', or 'low')
     * @param exclude - Whether to exclude reasoning from the response
     * @returns Reasoning configuration object
     *
     * @example
     * ```typescript
     * // Create high-effort reasoning config
     * const reasoningConfig = openRouter.setReasoningEffort('high');
     *
     * const response = await openRouter.createChatCompletion({
     *   model: 'anthropic/claude-3.5-sonnet',
     *   reasoning: reasoningConfig,
     *   messages: [{ role: 'user', content: 'Solve this step by step: 24 * 15 + 7^2' }]
     * });
     * ```
     */
    setReasoningEffort(level: 'high' | 'medium' | 'low', exclude?: boolean): ReasoningConfig;
    /**
     * Create a JSON object response format
     *
     * @returns A response format configuration for JSON object output
     *
     * @example
     * ```typescript
     * // Request a JSON response
     * const response = await openRouter.createChatCompletion({
     *   model: 'openai/gpt-4o',
     *   response_format: openRouter.createJsonResponseFormat(),
     *   messages: [{ role: 'user', content: 'List the top 3 planets by size as a JSON array' }]
     * });
     * ```
     */
    createJsonResponseFormat(): ResponseFormat;
    /**
     * Create a response format with JSON Schema validation
     *
     * @param schema - The JSON Schema definition
     * @param name - The name of the schema
     * @param strict - Whether to enforce strict validation
     * @returns A response format configuration with JSON Schema validation
     *
     * @example
     * ```typescript
     * // Define a schema for weather information
     * const weatherSchema = {
     *   type: 'object',
     *   properties: {
     *     location: { type: 'string', description: 'City name' },
     *     temperature: { type: 'number', description: 'Temperature in Celsius' },
     *     conditions: { type: 'string', description: 'Weather conditions' }
     *   },
     *   required: ['location', 'temperature', 'conditions']
     * };
     *
     * // Request a structured response following the schema
     * const response = await openRouter.createChatCompletion({
     *   model: 'openai/gpt-4o',
     *   response_format: openRouter.createSchemaResponseFormat(weatherSchema, 'weather'),
     *   messages: [{ role: 'user', content: 'What\'s the weather like in London?' }]
     * });
     * ```
     */
    createSchemaResponseFormat(schema: any, name?: string, strict?: boolean): ResponseFormat;
    /**
     * Add fallback models to a request
     *
     * @param primaryModel - The primary model to use
     * @param fallbackModels - Array of fallback models to try if the primary model fails
     * @returns An array with the primary model and fallbacks
     *
     * @example
     * ```typescript
     * const models = openRouter.withFallbacks('openai/gpt-4o', ['anthropic/claude-3-opus', 'meta-llama/llama-3-70b-instruct']);
     * ```
     */
    withFallbacks(primaryModel: string, fallbackModels: string[]): string[];
    /**
     * Create a new agent for CrewAI orchestration
     *
     * @param agentConfig - The agent configuration
     * @returns The created agent
     *
     * @example
     * ```typescript
     * const researchAgent = openRouter.createAgent({
     *   id: 'researcher',
     *   name: 'Research Specialist',
     *   description: 'Expert at finding and analyzing information',
     *   model: 'anthropic/claude-3-opus-20240229',
     *   systemMessage: 'You are a research specialist who excels at finding accurate information.',
     *   temperature: 0.2
     * });
     * ```
     */
    createAgent(agentConfig: Partial<Agent>): ExtendedAgentConfig;
    /**
     * Create a new task for CrewAI orchestration
     *
     * @param taskConfig - The task configuration
     * @returns The created task
     *
     * @example
     * ```typescript
     * const researchTask = openRouter.createTask({
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
     * const researchWorkflow = openRouter.createWorkflow({
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
     * const researchCrew = openRouter.createCrew({
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
     * const result = await openRouter.executeTask(
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
     * const results = await openRouter.executeWorkflow(
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
     * const runStatus = await openRouter.runCrew(
     *   researchCrew,
     *   [researchTask, summaryTask],
     *   { processMode: ProcessMode.SEQUENTIAL },
     *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
     * );
     * ```
     */
    runCrew(crew: CrewConfig, tasks: Task[], config?: TaskExecutionConfig, callbacks?: TaskCallbacks): Promise<CrewRunStatus>;
    /**
     * Create a new vector database
     *
     * @template T - Type of vector database configuration
     * @param config - Vector database configuration
     * @returns The created vector database
     *
     * @example
     * ```typescript
     * // Create a standard in-memory vector database
     * const vectorDb = openRouter.createVectorDb({
     *   dimensions: 1536,
     *   maxVectors: 10000,
     *   similarityMetric: 'cosine',
     *   persistToDisk: true,
     *   storagePath: './data/vectordb'
     * });
     *
     * // Create a Chroma vector database
     * const chromaDb = openRouter.createVectorDb({
     *   dimensions: 1536,
     *   type: 'chroma',
     *   chroma: {
     *     chromaUrl: 'http://localhost:8000',
     *     collectionPrefix: 'my-app-'
     *   }
     * });
     * ```
     */
    createVectorDb(config: ExtendedVectorDBConfig): VectorDB;
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
     * const docId = await openRouter.addAgentKnowledge(
     *   'researcher',
     *   {
     *     id: 'doc1',
     *     content: 'Electric vehicles are becoming increasingly popular...',
     *     metadata: { source: 'research-report', topic: 'electric-vehicles' }
     *   }
     * );
     * ```
     */
    addAgentKnowledge(agentId: string, document: VectorDocument, namespace?: string): Promise<string>;
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
     * const docIds = await openRouter.addAgentKnowledgeBatch(
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
    addAgentKnowledgeBatch(agentId: string, documents: VectorDocument[], namespace?: string): Promise<string[]>;
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
     * const results = await openRouter.searchAgentKnowledge(
     *   'researcher',
     *   'electric vehicle market trends',
     *   { limit: 5, minScore: 0.7 }
     * );
     * ```
     */
    searchAgentKnowledge(agentId: string, text: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
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
     * const document = await openRouter.getAgentKnowledgeDocument('researcher', 'doc1');
     * ```
     */
    getAgentKnowledgeDocument(agentId: string, documentId: string, namespace?: string): Promise<VectorDocument | null>;
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
     * const success = await openRouter.deleteAgentKnowledgeDocument('researcher', 'doc1');
     * ```
     */
    deleteAgentKnowledgeDocument(agentId: string, documentId: string, namespace?: string): Promise<boolean>;
    /**
     * Estimate the cost of a request
     *
     * @param model - The model info
     * @param promptTokens - Number of prompt tokens
     * @param completionTokens - Number of completion tokens (default: 0)
     * @returns Cost estimate
     */
    estimateCost(model: ModelInfo, promptTokens: number, completionTokens?: number): CostEstimate;
    /**
     * Make an API request with retries and middleware support
     *
     * @param method - HTTP method
     * @param url - Request URL
     * @param data - Request data
     * @returns Promise resolving to the response data
     */
    private makeRequest;
    /**
     * Fetch with timeout implementation
     *
     * @param url - The URL to fetch
     * @param options - The fetch options
     * @returns Promise resolving to the fetch response
     */
    private fetchWithTimeout;
    /**
     * Create a combined AbortSignal from multiple signals
     *
     * @param signals - Array of AbortSignals
     * @returns A new AbortSignal that aborts when any of the input signals abort
     */
    private createCombinedSignal;
}
//# sourceMappingURL=open-router.d.ts.map