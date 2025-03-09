/**
 * Core OpenRouter class implementation
 */
import { OpenRouterConfig,
  CompletionRequest,
  EmbeddingRequest,
  ImageGenerationRequest,
  AudioTranscriptionRequest,
  CompletionResponse,
  EmbeddingResponse,
  ImageGenerationResponse,
  AudioTranscriptionResponse,
  ModelsResponse,
  ModelInfo,
  Plugin,
  ReasoningConfig,
  ProviderPreferences,
  ResponseFormat,
  ChatMessage,
  CostEstimate,
  Middleware,
  Agent,
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
  IVectorDB } from '../interfaces/index.js';

import { Logger,
  MemoryCache,
  RateLimiter,
  retry,
  ProviderRouting,
  WebSearch,
  StructuredOutput,
  Reasoning,
  CrewAI,
  VectorDB,
  createVectorDB,
  ExtendedVectorDBConfig } from '../utils/index.js';

import { OpenRouterError } from '../errors/openrouter-error.js';
import { ExtendedAgentConfig } from '../interfaces/crew-ai.js';

/**
 * Main OpenRouter SDK class
 * 
 * Provides methods for interacting with the OpenRouter API to access
 * various AI models for chat completions, embeddings, image generation,
 * and audio transcription.
 */
export class OpenRouter {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion: string;
  private defaultModel: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;
  private cache: MemoryCache<any>;
  private middlewares: Middleware[] = [];
  private rateLimiter: RateLimiter;
  private totalCost: number = 0;
  private requestsInFlight: Set<AbortController> = new Set();
  private crewAI: CrewAI;
  private vectorDbs: Map<string, IVectorDB> = new Map();

  /**
   * Create a new OpenRouter SDK instance
   * 
   * @param config - SDK configuration options
   */
  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api';
    this.apiVersion = 'v1';
    this.defaultModel = config.defaultModel || 'openai/gpt-3.5-turbo';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger(config.logLevel || 'info');
    
    // Initialize cache
    const cacheTTL = config.cacheTTL || 60 * 60 * 1000; // Default 1 hour
    this.cache = new MemoryCache(config.enableCaching !== false ? cacheTTL : 0);
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(config.rateLimitRPM || 0);
    
    // Set up default headers
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://api.openrouter.ai',
      'X-Title': 'OpenRouter SDK',
      ...config.headers
    };
    
    // Initialize CrewAI
    this.crewAI = new CrewAI();
  }

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
  use(middleware: Middleware): OpenRouter {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Clear all middlewares
   * 
   * @returns The SDK instance for chaining
   */
  clearMiddlewares(): OpenRouter {
    this.middlewares = [];
    return this;
  }

  /**
   * Cancel all in-flight requests
   */
  cancelAllRequests(): void {
    for (const controller of this.requestsInFlight) {
      controller.abort();
    }
    this.requestsInFlight.clear();
  }

  /**
   * Get total estimated cost of all requests
   * 
   * @returns Total cost in USD
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Reset total cost counter
   */
  resetCostTracker(): void {
    this.totalCost = 0;
  }

  /**
   * Clear the SDK cache
   */
  clearCache(): void {
    this.cache.clear();
  }

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
  async createChatCompletion(
    options: Partial<CompletionRequest> & { messages: ChatMessage[] }
  ): Promise<CompletionResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/chat/completions`;
    
    const payload: CompletionRequest = {
      model: options.model || this.defaultModel,
      messages: options.messages,
      // Only include properties that are defined
      ...(options.max_tokens !== undefined && { max_tokens: options.max_tokens }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.top_p !== undefined && { top_p: options.top_p }),
      ...(options.top_k !== undefined && { top_k: options.top_k }),
      ...(options.stream !== undefined && { stream: options.stream }),
      ...(options.transforms !== undefined && { transforms: options.transforms }),
      ...(options.additional_stop_sequences !== undefined && { additional_stop_sequences: options.additional_stop_sequences }),
      ...(options.response_format !== undefined && { response_format: options.response_format }),
      ...(options.seed !== undefined && { seed: options.seed }),
      ...(options.tools !== undefined && { tools: options.tools }),
      ...(options.tool_choice !== undefined && { tool_choice: options.tool_choice }),
      ...(options.frequency_penalty !== undefined && { frequency_penalty: options.frequency_penalty }),
      ...(options.presence_penalty !== undefined && { presence_penalty: options.presence_penalty }),
      ...(options.logit_bias !== undefined && { logit_bias: options.logit_bias }),
      ...(options.repetition_penalty !== undefined && { repetition_penalty: options.repetition_penalty }),
      ...(options.top_logprobs !== undefined && { top_logprobs: options.top_logprobs }),
      ...(options.min_p !== undefined && { min_p: options.min_p }),
      ...(options.models?.length && { models: options.models }),
      ...(options.provider && { provider: options.provider }),
      ...(options.plugins?.length && { plugins: options.plugins }),
      ...(options.reasoning && { reasoning: options.reasoning }),
      ...(options.include_reasoning !== undefined && { include_reasoning: options.include_reasoning }),
      ...(options.user !== undefined && { user: options.user })
    };

    let modifiedPayload = payload;
    
    // Generate cache key for this request if caching is enabled
    const cacheKey = this.generateCacheKey('completion', modifiedPayload);
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      this.logger.debug('Using cached chat completion response');
      return cachedResponse;
    }

    // Apply pre-request middlewares
    for (const middleware of this.middlewares) {
      if (middleware.pre) {
        modifiedPayload = await middleware.pre(modifiedPayload);
      }
    }

    // Add more descriptive info to log
    this.logger.info(`Creating chat completion with model: ${modifiedPayload.model}`, {
      modelId: modifiedPayload.model,
      messageCount: modifiedPayload.messages.length,
      maxTokens: modifiedPayload.max_tokens
    });

    // Throttle requests if rate limiting is enabled
    await this.rateLimiter.throttle();

    try {
      const response = await this.makeRequest<CompletionResponse>(
        'POST',
        url,
        modifiedPayload
      );

      // Track cost
      if (response.usage) {
        const model = await this.getModelInfo(modifiedPayload.model || this.defaultModel);
        if (model) {
          const costEstimate = this.estimateCost(
            model,
            response.usage.prompt_tokens,
            response.usage.completion_tokens
          );
          this.totalCost += costEstimate.totalCost;
        }
      }
      
      // Cache the response if appropriate
      if (!options.stream && response.choices?.length > 0) {
        this.cache.set(cacheKey, response);
      }

      return response;
    } catch (error) {
      // Apply error middlewares
      let processedError = error;
      for (const middleware of this.middlewares) {
        if (middleware.error) {
          processedError = await middleware.error(processedError);
        }
      }
      throw processedError;
    }
  }

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
  async *streamChatCompletions(
    options: Partial<CompletionRequest> & { messages: ChatMessage[] }
  ): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const url = `${this.baseUrl}/${this.apiVersion}/chat/completions`;

    this.logger.info(`Streaming chat completion with model: ${options.model || this.defaultModel}`);
    const payload: CompletionRequest = {
      model: options.model || this.defaultModel,
      messages: options.messages,
      // Force stream mode
      stream: true,
      ...(options.max_tokens !== undefined && { max_tokens: options.max_tokens }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.top_p !== undefined && { top_p: options.top_p }),
      ...(options.top_k !== undefined && { top_k: options.top_k }),
      ...(options.transforms !== undefined && { transforms: options.transforms }),
      ...(options.additional_stop_sequences !== undefined && { additional_stop_sequences: options.additional_stop_sequences }),
      ...(options.response_format !== undefined && { response_format: options.response_format }),
      ...(options.seed !== undefined && { seed: options.seed }),
      ...(options.tools !== undefined && { tools: options.tools }),
      ...(options.tool_choice !== undefined && { tool_choice: options.tool_choice }),
      ...(options.frequency_penalty !== undefined && { frequency_penalty: options.frequency_penalty }),
      ...(options.presence_penalty !== undefined && { presence_penalty: options.presence_penalty }),
      ...(options.logit_bias !== undefined && { logit_bias: options.logit_bias }),
      ...(options.repetition_penalty !== undefined && { repetition_penalty: options.repetition_penalty }),
      ...(options.top_logprobs !== undefined && { top_logprobs: options.top_logprobs }),
      ...(options.min_p !== undefined && { min_p: options.min_p }),
      ...(options.models?.length && { models: options.models }),
      ...(options.provider && { provider: options.provider }),
      ...(options.plugins?.length && { plugins: options.plugins }),
      ...(options.reasoning && { reasoning: options.reasoning }),
      ...(options.include_reasoning !== undefined && { include_reasoning: options.include_reasoning }),
      ...(options.user !== undefined && { user: options.user })
    };

    let modifiedPayload = payload;
    
    // Apply pre-request middlewares
    for (const middleware of this.middlewares) {
      if (middleware.pre) {
        modifiedPayload = await middleware.pre(modifiedPayload);
      }
    }

    // Throttle requests if rate limiting is enabled
    await this.rateLimiter.throttle();

    const controller = new AbortController();
    this.requestsInFlight.add(controller);
    
    try {
      // First, get model info for cost estimation
      const modelInfo = await this.getModelInfo(modifiedPayload.model || this.defaultModel);
      const promptTokens = 0;
      let completionTokens = 0;

      // Make the streaming request
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(modifiedPayload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(`Stream request failed with status ${response.status}`, response.status, errorData);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new OpenRouterError('Response body is not readable', 0, null);
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Process all complete lines
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              
              // Apply post-response middlewares
              let modifiedData = data;
              for (const middleware of this.middlewares) {
                if (middleware.post) {
                  modifiedData = await middleware.post(modifiedData);
                }
              }

              // Track completion tokens for each chunk
              if (data.choices?.[0]?.delta?.content) {
                // This is a very rough estimate
                completionTokens += data.choices[0].delta.content.length / 4;
              }
              
              yield modifiedData;
            } catch (e) {
              this.logger.warn('Failed to parse SSE data:', trimmedLine);
            }
          }
        }
      }

      // Estimate cost if we have model info
      if (modelInfo) {
        const costEstimate = this.estimateCost(
          modelInfo,
          promptTokens,
          completionTokens
        );
        this.totalCost += costEstimate.totalCost;
      }
    } catch (error) {
      // Apply error middlewares
      let processedError = error;
      for (const middleware of this.middlewares) {
        if (middleware.error) {
          processedError = await middleware.error(processedError);
        }
      }
      throw processedError;
    } finally {
      this.requestsInFlight.delete(controller);
    }
  }

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
  async createEmbedding(options: EmbeddingRequest): Promise<EmbeddingResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/embeddings`;
    
    return await this.makeRequest<EmbeddingResponse>(
      'POST',
      url,
      options
    );
  }

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
  async createImage(options: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/images/generations`;
    
    return await this.makeRequest<ImageGenerationResponse>(
      'POST',
      url,
      options
    );
  }

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
  async createTranscription(options: AudioTranscriptionRequest): Promise<AudioTranscriptionResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/audio/transcriptions`;
    
    const formData = new FormData();
    this.logger.info(`Transcribing audio with model: ${options.model}`);
    
    // Handle different file formats
    if (typeof options.file === 'string') {
      // Assume base64 string
      const byteCharacters = atob(options.file);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
      formData.append('file', blob, 'audio.mp3');
    } else if (typeof Buffer !== 'undefined' && options.file instanceof Buffer) {
      formData.append('file', new Blob([options.file]), 'audio.mp3');
    } else if (options.file instanceof Blob || options.file instanceof File) {
      formData.append('file', options.file);
    } else if (options.file instanceof ArrayBuffer) {
      const blob = new Blob([options.file]);
      formData.append('file', blob, 'audio.mp3');
    }
    
    // Add other fields
    formData.append('model', options.model);
    
    if (options.language) formData.append('language', options.language);
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.response_format) formData.append('response_format', options.response_format);
    if (options.temperature !== undefined) formData.append('temperature', options.temperature.toString());
    if (options.timestamp_granularities) {
      options.timestamp_granularities.forEach(granularity => {
        formData.append('timestamp_granularities[]', granularity);
      });
    }
    
    // Custom headers for form data (remove Content-Type as it will be set by the browser)
    const headers = { ...this.headers };
    delete headers['Content-Type'];
    
    const controller = new AbortController();
    this.requestsInFlight.add(controller);
    
    try {
      // Make the request
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(`Request failed with status ${response.status}`, response.status, errorData);
      }
      
      return await response.json();
    } finally {
      this.requestsInFlight.delete(controller);
    }
  }

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
  async listModels(): Promise<ModelsResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/models`;
    const cacheKey = 'models_list';
    
    // Check cache first
    const cachedModels = this.cache.get(cacheKey) as ModelsResponse | null;
    if (cachedModels) {
      this.logger.debug('Using cached models list', { modelCount: cachedModels.data.length });
      return cachedModels;
    }
    
    try {
      this.logger.info('Fetching available models from OpenRouter');
      const models = await this.makeRequest<ModelsResponse>('GET', url);
      
      // Cache the result
      this.cache.set(cacheKey, models);
      this.logger.debug('Models fetched and cached', { modelCount: models.data.length });
      
      return models;
    } catch (error) {
      this.logger.error('Failed to fetch models:', error);
      throw error;
    }
  }

  /**
   * Generate a unique cache key for a request
   */
  private generateCacheKey(type: string, payload: any): string {
    // Create a deterministic representation of the payload
    return `${type}_${JSON.stringify(payload)}`;
  }

  /**
   * Get information about a specific model
   * 
   * @param modelId - The model ID
   * @returns Promise resolving to the model info or null if not found
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const cacheKey = `model_${modelId}`;
    
    // Check cache first
    const cachedModel = this.cache.get(cacheKey) as ModelInfo | null;
    if (cachedModel) {
      return cachedModel;
    }
    
    try {
      const models = await this.listModels();
      const model = models.data.find(m => m.id === modelId);
      
      if (model) {
        // Cache the result
        this.cache.set(cacheKey, model);
        return model;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get model info for ${modelId}:`, error);
      return null;
    }
  }

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
  async batchChatCompletions(
    requests: Array<Partial<CompletionRequest> & { messages: ChatMessage[] }>,
    concurrency: number = 3
  ): Promise<Array<CompletionResponse | Error>> {
    const results: Array<CompletionResponse | Error> = new Array(requests.length);
    const queue = requests.map((req, index) => ({ req, index }));

    this.logger.info(`Processing batch of ${requests.length} requests with concurrency ${concurrency}`);

    if (requests.length === 0) {
      return [];
    }

    const workers = Array(Math.min(concurrency, requests.length))
      .fill(0)
      .map(async () => {
        while (queue.length > 0) {
          const { req, index } = queue.shift()!;
          
          try {
            results[index] = await this.createChatCompletion(req);
          } catch (error) {
            results[index] = error instanceof Error ? error : new Error(String(error));
          }
        }
      });
    
    await Promise.all(workers);
    return results;
  }

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
  enableWebSearch(modelId: string, maxResults: number = 5, searchPrompt?: string): string {
    // WebSearch.enableForModel only takes modelId in the current implementation
    return WebSearch.enableForModel(modelId);
  }

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
  createWebSearchPlugin(maxResults: number = 5, searchPrompt?: string): Plugin {
    return WebSearch.createPlugin(maxResults, searchPrompt);
  }

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
  applyModelSuffix(modelId: string, suffix: 'nitro' | 'floor' | 'online'): string {
    return ProviderRouting.applyModelSuffix(modelId, suffix);
  }

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
  orderProviders(providerNames: string[], allowFallbacks: boolean = true): ProviderPreferences {
    return ProviderRouting.orderProviders(providerNames, allowFallbacks);
  }

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
  sortProviders(sortBy: 'price' | 'throughput' | 'latency'): ProviderPreferences {
    return ProviderRouting.sortProviders(sortBy);
  }

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
  setReasoningEffort(level: 'high' | 'medium' | 'low', exclude: boolean = false): ReasoningConfig {
    return Reasoning.setEffort(level, exclude);
  }

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
  createJsonResponseFormat(): ResponseFormat {
    return StructuredOutput.asJson();
  }

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
  createSchemaResponseFormat(schema: any, name: string = 'output', strict: boolean = true): ResponseFormat {
    return StructuredOutput.withSchema(schema, name, strict);
  }

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
  withFallbacks(primaryModel: string, fallbackModels: string[]): string[] {
    return [primaryModel, ...fallbackModels];
  }

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
  createAgent(agentConfig: Partial<Agent>): ExtendedAgentConfig {
    return this.crewAI.createAgent(agentConfig as ExtendedAgentConfig);
  }

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
  createTask(taskConfig: Task): Task {
    return this.crewAI.createTask(taskConfig);
  }

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
  createWorkflow(workflowConfig: Workflow): Workflow {
    return this.crewAI.createWorkflow(workflowConfig);
  }

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
  createCrew(crewConfig: CrewConfig): CrewConfig {
    return this.crewAI.createCrew(crewConfig);
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
  async executeTask(
    task: Task,
    agent: Agent | ExtendedAgentConfig,
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<TaskResult> {
    return this.crewAI.executeTask(task, agent, config, callbacks);
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
   * const results = await openRouter.executeWorkflow(
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
    return this.crewAI.executeWorkflow(workflow, agents, config, callbacks);
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
   * const runStatus = await openRouter.runCrew(
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
    return this.crewAI.runCrew(crew, tasks, config, callbacks);
  }

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
  createVectorDb<T extends VectorDBConfig = VectorDBConfig>(config: T): IVectorDB {
    const id = `vectordb_${Date.now()}`;
    
    // Use the factory function to create the appropriate vector database
    let vectorDb: IVectorDB;
    
    if ('type' in config && Object.prototype.hasOwnProperty.call(config, 'type')) {
      // Extended config with type
      vectorDb = createVectorDB(config as ExtendedVectorDBConfig);
    } else {
      // Standard config, use in-memory VectorDB
      vectorDb = new VectorDB(config);
    }
    
    this.vectorDbs.set(id, vectorDb);
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
  async addAgentKnowledge(
    agentId: string,
    document: VectorDocument,
    namespace?: string
  ): Promise<string> {
    return this.crewAI.addKnowledge(agentId, document, namespace);
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
  async addAgentKnowledgeBatch(
    agentId: string,
    documents: VectorDocument[],
    namespace?: string
  ): Promise<string[]> {
    return this.crewAI.addKnowledgeBatch(agentId, documents, namespace);
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
   * const results = await openRouter.searchAgentKnowledge(
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
    return this.crewAI.searchKnowledge(agentId, text, options);
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
   * const document = await openRouter.getAgentKnowledgeDocument('researcher', 'doc1');
   * ```
   */
  async getAgentKnowledgeDocument(
    agentId: string,
    documentId: string,
    namespace?: string
  ): Promise<VectorDocument | null> {
    return this.crewAI.getKnowledgeDocument(agentId, documentId, namespace);
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
   * const success = await openRouter.deleteAgentKnowledgeDocument('researcher', 'doc1');
   * ```
   */
  async deleteAgentKnowledgeDocument(
    agentId: string,
    documentId: string,
    namespace?: string
  ): Promise<boolean> {
    return this.crewAI.deleteKnowledgeDocument(agentId, documentId, namespace);
  }

  /**
   * Estimate the cost of a request
   * 
   * @param model - The model info
   * @param promptTokens - Number of prompt tokens
   * @param completionTokens - Number of completion tokens (default: 0)
   * @returns Cost estimate
   */
  estimateCost(
    model: ModelInfo,
    promptTokens: number,
    completionTokens: number = 0
  ): CostEstimate {
    // Parse pricing from model info (e.g. "$0.0015/1K tokens")
    const promptCostMatch = model.pricing.prompt.match(/\$([0-9.]+)\/(\d+)K/);
    const completionCostMatch = model.pricing.completion.match(/\$([0-9.]+)\/(\d+)K/);
    
    let promptCostPer1K = 0;
    let completionCostPer1K = 0;
    
    if (promptCostMatch && promptCostMatch.length >= 3) {
      promptCostPer1K = parseFloat(promptCostMatch[1]);
    }
    
    if (completionCostMatch && completionCostMatch.length >= 3) {
      completionCostPer1K = parseFloat(completionCostMatch[1]);
    }
    
    const promptCost = (promptTokens / 1000) * promptCostPer1K;
    const completionCost = (completionTokens / 1000) * completionCostPer1K;
    const totalCost = promptCost + completionCost;
    
    this.logger.debug(`Cost estimate for ${model.id}:`, 
      { promptTokens, completionTokens, promptCost, completionCost, totalCost });
    
    return {
      promptCost,
      completionCost,
      totalCost,
      currency: 'USD',
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      }
    };
  }

  /**
   * Make an API request with retries and middleware support
   * 
   * @param method - HTTP method
   * @param url - Request URL
   * @param data - Request data
   * @returns Promise resolving to the response data
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    data?: any
  ): Promise<T> {
    return retry(
      async () => {
        const controller = new AbortController();
        this.requestsInFlight.add(controller);
        
        try {
          // Apply pre-request middleware
          let modifiedData = data;
          for (const middleware of this.middlewares) {
            if (middleware.pre) {
              modifiedData = await middleware.pre(modifiedData);
            }
          }
          
          const options: RequestInit = {
            method,
            headers: this.headers,
            signal: controller.signal
          };
          
          if (data && method !== 'GET') {
            options.body = JSON.stringify(modifiedData);
          }
          
          const response = await this.fetchWithTimeout(url, options);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new OpenRouterError(`Request failed with status ${response.status}`, response.status, errorData);
          }
          
          let responseData = await response.json();
          
          // Apply post-response middleware
          for (const middleware of this.middlewares) {
            if (middleware.post) {
              responseData = await middleware.post(responseData);
            }
          }
          
          return responseData as T;
        } finally {
          this.requestsInFlight.delete(controller);
        }
      },
      this.maxRetries,
      this.logger
    );
  }

  /**
   * Fetch with timeout implementation
   * 
   * @param url - The URL to fetch
   * @param options - The fetch options
   * @returns Promise resolving to the fetch response
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const { signal, ...fetchOptions } = options;
    
    // Create a custom timeout controller if one wasn't provided
    const timeoutController = new AbortController();
    const id = setTimeout(() => timeoutController.abort(), this.timeout);
    
    // Combine the provided signal with our timeout signal
    const combinedSignal = signal
      ? this.createCombinedSignal([signal, timeoutController.signal])
      : timeoutController.signal;
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal
      });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Create a combined AbortSignal from multiple signals
   * 
   * @param signals - Array of AbortSignals
   * @returns A new AbortSignal that aborts when any of the input signals abort
   */
  private createCombinedSignal(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    const onAbort = () => {
      controller.abort();
      // Clean up
      signals.forEach(signal => {
        signal.removeEventListener('abort', onAbort);
      });
    };
    
    signals.forEach(signal => {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort);
    });
    
    return controller.signal;
  }
}