/**
 * OpenRouter SDK
 * A comprehensive TypeScript SDK for seamlessly integrating with the OpenRouter API.
 * This SDK provides universal access to multiple AI models through OpenRouter's unified interface.
 * 
 * Features:
 * - 🔑 Simple authentication and configuration
 * - 🤖 Access to all models available on OpenRouter
 * - 💬 Complete chat completions support
 * - 🌊 Streaming functionality
 * - 📊 Text embeddings generation
 * - 🖼️ Image generation capabilities
 * - 🎤 Audio transcription support
 * - 🛠️ Function/tool calling integration
 * - 📲 Multimodal content support (text + images)
 * - 📝 JSON mode for structured outputs
 * - 🔄 Middleware support for request/response modification
 * - 💰 Cost estimation and tracking
 * - 🚦 Configurable rate limiting
 * - 🔁 Automatic retries with exponential backoff
 * - 💾 Intelligent model caching
 * - 📚 Batch processing for multiple requests
 * - 📦 Complete TypeScript type definitions
 * - ⏱️ Configurable timeouts and request cancellation
 * - 📋 Comprehensive error handling
 * - 🧩 Utility classes for common tasks
 * 
 * @example
 * ```typescript
 * import { createOpenRouter } from 'openrouter-sdk';
 * const openRouter = createOpenRouter({ apiKey: 'your_api_key_here' });
 * ```
 */

// Core configuration interfaces
export interface OpenRouterConfig {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
    headers?: Record<string, string>;
    timeout?: number;
    maxRetries?: number;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
    enableCaching?: boolean;
    cacheTTL?: number; // Cache time-to-live in milliseconds
    rateLimitRPM?: number; // Rate limit requests per minute
  }
  
  // Message types
  export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | ContentPart[];
    name?: string;
    tool_call_id?: string;
  }
  
  export interface ContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'medium' | 'high' | 'auto';
    };
  }
  
  // Tool definitions for function calling
  export interface FunctionDefinition {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
    required?: string[];
  }
  
  export interface ToolDefinition {
    type: 'function';
    function: FunctionDefinition;
  }
  
  export interface ToolChoice {
    type: 'function' | 'none' | 'auto';
  }
  
  export interface ToolCall {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }
  
  // Request types
  export interface CompletionRequest {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stream?: boolean;
    transforms?: string[];
    additional_stop_sequences?: string[];
    response_format?: { type: 'json_object' | 'text' };
    seed?: number;
    tools?: ToolDefinition[] | null;
    tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    frequency_penalty?: number;
    presence_penalty?: number;
    logit_bias?: Record<string, number>;
    user?: string;
  }
  
  export interface EmbeddingRequest {
    model: string;
    input: string | string[];
    encoding_format?: 'float' | 'base64';
    user?: string;
  }
  
  export interface ImageGenerationRequest {
    model: string;
    prompt: string;
    n?: number;
    size?: string;
    response_format?: 'url' | 'b64_json';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    user?: string;
  }
  
  export interface AudioTranscriptionRequest {
    model: string;
    file: Blob | ArrayBuffer | string; // Blob in browser, ArrayBuffer in Node.js, Base64 string in either
    language?: string;
    prompt?: string;
    response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    temperature?: number;
    timestamp_granularities?: Array<'segment' | 'word'>;
  }
  
  // Response types
  export interface CompletionResponse {
    id: string;
    model: string;
    choices: {
      message: ChatMessage;
      finish_reason: string;
      index: number;
      logprobs?: any;
    }[];
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }
  
  export interface EmbeddingResponse {
    id: string;
    object: string;
    data: {
      embedding: number[];
      index: number;
      object: string;
    }[];
    model: string;
    usage: {
      prompt_tokens: number;
      total_tokens: number;
    };
  }
  
  export interface ImageGenerationResponse {
    created: number;
    data: {
      url?: string;
      b64_json?: string;
      revised_prompt?: string;
    }[];
  }
  
  export interface AudioTranscriptionResponse {
    text: string;
    segments?: Array<{
      id: number;
      text: string;
      start: number;
      end: number;
    }>;
    language?: string;
  }
  
  export interface ModelsResponse {
    data: ModelInfo[];
  }
  
  export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
    pricing: {
      prompt: string;
      completion: string;
    };
    context_length: number;
    architecture?: string;
    created?: number;
    owned_by?: string;
    capabilities?: {
      chat?: boolean;
      embeddings?: boolean;
      images?: boolean;
      audio?: boolean;
      tools?: boolean;
      json_mode?: boolean;
      vision?: boolean;
    };
  }
  
  // Cost tracking
  export interface CostEstimate {
    promptCost: number;
    completionCost: number;
    totalCost: number;
    currency: string;
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }
  
  // Middleware interface
  export interface Middleware {
    pre?: (request: any) => Promise<any>;
    post?: (response: any) => Promise<any>;
    error?: (error: any) => Promise<any>;
  }
  
  // Cache interfaces
  interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
  }
  
  interface Cache<T> {
    get(key: string): T | null;
    set(key: string, value: T, ttl?: number): void;
    delete(key: string): void;
    clear(): void;
  }
  
  // Simple in-memory cache implementation
  class MemoryCache<T> implements Cache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private defaultTTL: number;
  
    constructor(defaultTTL: number = 60 * 60 * 1000) { // Default 1 hour
      this.defaultTTL = defaultTTL;
    }
  
    get(key: string): T | null {
      const entry = this.cache.get(key);
      if (!entry) return null;
      
      // Check if entry is expired
      if (Date.now() > entry.expiry) {
        this.cache.delete(key);
        return null;
      }
      
      return entry.data;
    }
  
    set(key: string, value: T, ttl?: number): void {
      const expiry = Date.now() + (ttl || this.defaultTTL);
      this.cache.set(key, {
        data: value,
        timestamp: Date.now(),
        expiry
      });
    }
  
    delete(key: string): void {
      this.cache.delete(key);
    }
  
    clear(): void {
      this.cache.clear();
    }
  }
  
  // Logger implementation
  class Logger {
    private level: 'none' | 'error' | 'warn' | 'info' | 'debug';
    private levels = {
      none: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4
    };
  
    constructor(level: 'none' | 'error' | 'warn' | 'info' | 'debug' = 'info') {
      this.level = level;
    }
  
    error(message: string, ...args: any[]): void {
      if (this.levels[this.level] >= this.levels.error) {
        console.error(`[OpenRouter ERROR] ${message}`, ...args);
      }
    }
  
    warn(message: string, ...args: any[]): void {
      if (this.levels[this.level] >= this.levels.warn) {
        console.warn(`[OpenRouter WARN] ${message}`, ...args);
      }
    }
  
    info(message: string, ...args: any[]): void {
      if (this.levels[this.level] >= this.levels.info) {
        console.info(`[OpenRouter INFO] ${message}`, ...args);
      }
    }
  
    debug(message: string, ...args: any[]): void {
      if (this.levels[this.level] >= this.levels.debug) {
        console.debug(`[OpenRouter DEBUG] ${message}`, ...args);
      }
    }
  }
  
  // Rate limiter implementation
  class RateLimiter {
    private maxRequestsPerMinute: number;
    private requestTimestamps: number[] = [];
  
    constructor(maxRequestsPerMinute: number = 0) {
      this.maxRequestsPerMinute = maxRequestsPerMinute;
    }
  
    async throttle(): Promise<void> {
      if (this.maxRequestsPerMinute <= 0) return;
  
      // Clean up old timestamps (older than 1 minute)
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  
      // Check if we've hit the rate limit
      if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
        // Calculate time to wait until we can make another request
        const oldestTimestamp = this.requestTimestamps[0];
        const timeToWait = oldestTimestamp + 60 * 1000 - now;
        
        if (timeToWait > 0) {
          await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
      }
  
      // Add current timestamp to list
      this.requestTimestamps.push(Date.now());
    }
  }
  
  // Retry logic with exponential backoff
  async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    logger: Logger,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry if this is the last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Don't retry for certain types of errors
        if (error instanceof OpenRouterError) {
          // Don't retry on 4xx errors except for 429 (too many requests)
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            throw error;
          }
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5),
          30 * 1000 // Max 30 seconds
        );
        
        logger.debug(`Request failed, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  // Main SDK class
  export class OpenRouter {
    private apiKey: string;
    private baseUrl: string;
    private apiVersion: string;
    private defaultModel: string;
    private headers: Record<string, string>;
    private timeout: number;
    private maxRetries: number;
    private logger: Logger;
    private cache: Cache<any>;
    private middlewares: Middleware[] = [];
    private rateLimiter: RateLimiter;
    private totalCost: number = 0;
    private requestsInFlight: Set<AbortController> = new Set();
  
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
      this.cache = config.enableCaching !== false ? new MemoryCache(cacheTTL) : new MemoryCache(0);
      
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
    }
  
    /**
     * Add middleware to the SDK
     * @param middleware Middleware to add
     * @returns The SDK instance for method chaining
     * @example openRouter.use({ pre: (req) => { console.log(req); return req; } })
     */
    use(middleware: Middleware): OpenRouter {
      this.middlewares.push(middleware);
      return this;
    }
  
    /**
     * Clear all middlewares
     * @returns The SDK instance for chaining
     * @example openRouter.clearMiddlewares()
    */
    clearMiddlewares(): OpenRouter {
      this.middlewares = [];
      return this;
    }
  
    /**
     * Cancel all in-flight requests
     * @example openRouter.cancelAllRequests()
     * @description Cancels all currently pending requests by aborting their controllers
    */
    cancelAllRequests(): void {
      for (const controller of this.requestsInFlight) {
        controller.abort();
      }
      this.requestsInFlight.clear();
    }
  
    /**
     * Get total estimated cost of all requests
     * @returns Total cost of all requests in USD
     * @example const totalCost = openRouter.getTotalCost();
    */
    getTotalCost(): number {
      return this.totalCost;
    }
  
    /**
     * Reset the cost tracker to zero
     * Reset total cost counter
     */
    resetCostTracker(): void {
      this.totalCost = 0;
    }
  
    /**
     * Clear all cached data
     * @example openRouter.clearCache()
     * @description Removes all cached model information and other data
    */
    clearCache(): void {
      this.cache.clear();
    }
  
    /**
     * Create a chat completion
     * 
     * @param options - The completion request options
     * @returns Promise resolving to the completion response
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
     * 
     * console.log(response.choices[0].message.content);
     * ```
     * 
     * @example
     * ```typescript
     * // JSON mode example
     * const jsonResponse = await openRouter.createChatCompletion({
     *   messages: [
     *     { role: 'user', content: 'List the top 3 planets by size.' }
     *   ],
     *   model: 'openai/gpt-4-turbo',
     *   response_format: { type: 'json_object' }
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
     * @returns An async generator yielding completion chunks
     * 
     * @example
     * ```typescript
     * // Streaming example
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
     * 
     * @description
     * This method returns an async generator that yields completion chunks as they
     * become available from the API. This allows for displaying partial results to the
     * user in real-time.
    */
    async *streamChatCompletions(
      options: Partial<CompletionRequest> & { messages: ChatMessage[] }
    ): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
      const url = `${this.baseUrl}/${this.apiVersion}/chat/completions`;

      this.logger.info(`Streaming chat completion with model: ${options.model || this.defaultModel}`);
      const payload: CompletionRequest = {
        model: options.model || this.defaultModel,
        messages: options.messages,
        max_tokens: options.max_tokens,
        temperature: options.temperature,
        top_p: options.top_p,
        top_k: options.top_k,
        stream: true,
        transforms: options.transforms,
        additional_stop_sequences: options.additional_stop_sequences,
        response_format: options.response_format,
        seed: options.seed,
        tools: options.tools,
        tool_choice: options.tool_choice,
        frequency_penalty: options.frequency_penalty,
        presence_penalty: options.presence_penalty,
        logit_bias: options.logit_bias,
        user: options.user
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
        let promptTokens = 0;
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
     * 
     * // Process multiple texts at once
     * const batchEmbeddings = await openRouter.createEmbedding({
     *   model: 'openai/text-embedding-3-small',
     *   input: ['First sentence', 'Second sentence', 'Third sentence']
     * });
     * ```
    */
    async createEmbedding(options: EmbeddingRequest): Promise<EmbeddingResponse> {
      const url = `${this.baseUrl}/${this.apiVersion}/embeddings`;
      
      try {
        return await this.makeRequest<EmbeddingResponse>(
          'POST',
          url,
          options
        );
      } catch (error) {
        throw error; 
      }
    }
  
    /**
     * Generate images using AI models
     * 
     * @param options - The image generation request options
     * @returns Promise resolving to the image generation response with URLs or base64 data
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
     * 
     * @description
     * Creates images based on text prompts. The response contains either URLs or base64-encoded image data.
    */
    async createImage(options: ImageGenerationRequest): Promise<ImageGenerationResponse> {
      const url = `${this.baseUrl}/${this.apiVersion}/images/generations`;
      
      try {
        return await this.makeRequest<ImageGenerationResponse>(
          'POST',
          url,
          options
        );
      } catch (error) {
        throw error;
      }
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
     * 
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
      } else if (options.file instanceof Blob) {
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
      
      try {
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
      } catch (error) {
        throw error;
      }
    }
  
    /**
     * Get a list of available models from OpenRouter
     * @returns A promise that resolves to the models response
     * 
     * @example
     * ```typescript
     * const models = await openRouter.listModels();
     * 
     * // Filter by capability
     * const chatModels = models.data.filter(model => model.capabilities?.chat);
     * const imageModels = models.data.filter(model => model.capabilities?.images);
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
     * @param modelId The model ID
     * @returns A promise that resolves to the model info or null if not found
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
     * @param requests Array of completion requests
     * @param concurrency Maximum number of concurrent requests (default: 3)
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
     * // Process with concurrency limit of 2
     * const results = await openRouter.batchChatCompletions(batchRequests, 2);
     * 
     * // Handle results (some may be errors)
     * results.forEach((result, index) => {
     *   if (result instanceof Error) {
     *     console.error(`Request ${index} failed:`, result);
     *   } else {
     *     console.log(`Request ${index} succeeded:`, result.choices[0].message.content);
     *   }
     * });
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
     * Estimate the cost of a request
     * @param model The model info
     * @param promptTokens Number of prompt tokens
     * @param completionTokens Number of completion tokens
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
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     * @returns Response data
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
            
            return responseData;
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
     * @param url The URL to fetch
     * @param options The fetch options
     * @returns A promise that resolves to the fetch response
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
     * @param signals Array of AbortSignals
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
  
  // Custom error class
  export class OpenRouterError extends Error {
    status: number;
    data: any;
    
    constructor(message: string, status: number = 0, data: any = null) {
      super(message);
      this.name = 'OpenRouterError';
      this.status = status;
      this.data = data;
    }
  }
  
  // Helper function to create a new OpenRouter instance
  /**
  * Create a new OpenRouter SDK instance
  * 
  * @param config - Configuration for the OpenRouter SDK
  * @returns A configured OpenRouter instance
  * 
  * @example
  * ```typescript
  * const openRouter = createOpenRouter({
  *   apiKey: 'your_api_key_here',
  *   defaultModel: 'openai/gpt-4'
  * });
  * ```
  */
  export function createOpenRouter(config: OpenRouterConfig): OpenRouter {
    return new OpenRouter(config);
  }
  
  // Helper tokens counting function (very approximate)
  export function countTokens(text: string): number {
    // This is a very simplified token counter
    // In practice, use a proper tokenizer for the model you're using
    return Math.ceil(text.length / 4);
  }
  
  // Utility for working with function calling
  export class FunctionCalling {
    /**
     * Create a function definition object
     * @param name Function name
     * @param description Function description
     * @param parameters Object mapping parameter names to their JSON Schema definitions
     * @param required Array of required parameter names
     * @returns Function definition object
     * 
     * @example
     * const getWeatherFunction = FunctionCalling.createFunctionDefinition(
     *   'get_weather', 'Get weather for a location', { location: { type: 'string' } }, ['location']
     * );
     * @param parameters Function parameters schema in JSON Schema format
     * @param required Array of required parameter names
     * @returns Function definition object
     */
    static createFunctionDefinition(
      name: string,
      description: string,
      parameters: Record<string, any>,
      required?: string[]
    ): FunctionDefinition {
      return {
        name,
        description,
        parameters: {
          type: 'object',  
            // Parameter definitions with types and descriptions
          properties: parameters,
          required
        },
        required
      };
    }
  
    /**
     * Parse and execute function calls from model response
     * @param toolCalls Tool calls from model response
     * @param functions Map of function names to implementations
     * @returns Results of executed functions
     * 
     * @example
     * ```typescript
     * // After getting a response with tool calls
     * const toolCalls = response.choices[0].message.tool_calls;
     * 
     * // Define your function implementations
     * const functions = {
     *   get_weather: (args) => ({ temperature: 72, conditions: 'sunny', location: args.location }),
     *   search_database: (args) => ({ results: ['result1', 'result2'], query: args.query })
     * };
     *
     * // Execute all tool calls
     * const results = await FunctionCalling.executeToolCalls(toolCalls, functions);
     * ```
     */
    static async executeToolCalls(
      toolCalls: ToolCall[], functions: Record<string, (...args: any[]) => any>): Promise<Record<string, any>> {
      const results: Record<string, any> = {};
      
      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue;
        
        const { name, arguments: argsString } = toolCall.function;
        if (!functions[name]) {
          results[toolCall.id] = { error: `Function ${name} not found` };
          continue;
        }
        
        try {
          const args = JSON.parse(argsString);
          results[toolCall.id] = await functions[name](args);
        } catch (error) {
          results[toolCall.id] = { error: `Error executing function: ${error.message}` };
        }
      }
      
      return results;
    }
  }
  
  // Utility for working with multimodal inputs
  export class MultiModal {
    /**
     * Create a text content part
     * @param text Text content
     * @returns Content part object
     * 
     * @example
     * ```typescript
     * const textPart = MultiModal.text('Describe this image:');
     */
    static text(text: string): ContentPart {
      return { type: 'text', text };
    }
  
    /**
     * Create an image URL content part
     * @param url Image URL
     * @param detail Detail level ('low', 'medium', 'high', 'auto')
     * @returns Content part object
     * 
     * @example
     * ```typescript
     * const imagePart = MultiModal.imageUrl('https://example.com/image.jpg', 'high');
     */
    static imageUrl(url: string, detail: 'low' | 'medium' | 'high' | 'auto' = 'auto'): ContentPart {
      return { type: 'image_url', image_url: { url, detail } };
    }
  
    /**
     * Create a content array with multiple parts
     * @param parts Array of content parts
     * @returns Array of content parts
     * 
     * @example
     * ```typescript
     * const multimodalContent = MultiModal.content(
     *   MultiModal.text('What can you see in this image?'),
     *   MultiModal.imageUrl('https://example.com/image.jpg')
     * );
     */
    static content(...parts: ContentPart[]): ContentPart[] {
      return parts;
    }
  }