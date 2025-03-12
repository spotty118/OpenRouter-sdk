/**
 * Provider interfaces for direct API integration
 * 
 * These interfaces define the structure for provider-specific clients 
 * that can be used as alternatives to the OpenRouter API.
 */

import { 
  CompletionRequest, 
  EmbeddingRequest,
  ImageGenerationRequest,
  AudioTranscriptionRequest
} from './requests.js';

import {
  CompletionResponse,
  EmbeddingResponse,
  ImageGenerationResponse,
  AudioTranscriptionResponse
} from './responses.js';

/**
 * Provider-specific configuration options
 */
export interface ProviderConfig {
  /**
   * API key for the provider
   */
  apiKey: string;

  /**
   * Base URL for the provider's API
   */
  baseUrl?: string;

  /**
   * Organization ID (for providers that require it)
   */
  organizationId?: string;

  /**
   * Project ID (for Google Cloud providers)
   */
  projectId?: string;

  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>;

  /**
   * Timeout for requests in milliseconds
   */
  timeout?: number;

  /**
   * Maximum number of retries
   */
  maxRetries?: number;
  
  /**
   * OneAPI integration options
   */
  oneApi?: {
    /**
     * Whether to use OneAPI for this provider
     */
    enabled: boolean;
    
    /**
     * OneAPI-specific configuration
     */
    configId?: string;
    
    /**
     * Whether to track metrics with OneAPI
     */
    trackMetrics?: boolean;
    
    /**
     * Default model mappings for this provider
     */
    modelMappings?: Record<string, string>;
    
    /**
     * Fallback providers if this one fails
     */
    fallbacks?: string[];
  };
}

/**
 * Base interface for all AI providers
 */
export interface Provider {
  /**
   * Provider name
   */
  readonly name: string;
  
  /**
   * OneAPI integration status
   */
  readonly oneApiEnabled?: boolean;
  
  /**
   * OneAPI client reference if available
   */
  readonly oneApiClient?: any;

  /**
   * Generate completions from a prompt
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  createChatCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Stream completions from a prompt
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown>;

  /**
   * Generate embeddings from text
   * 
   * @param request Embedding request parameters
   * @returns Promise resolving to embedding response
   */
  createEmbedding?(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Generate images from a prompt
   * 
   * @param request Image generation request parameters
   * @returns Promise resolving to image generation response
   */
  createImage?(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  
  /**
   * Track metrics for API calls using OneAPI
   * 
   * @param metrics Metrics data to record
   */
  trackMetrics?(metrics: {
    requestType: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    startTime: Date;
    endTime?: Date;
    status: 'success' | 'error';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): void;
  
  /**
   * Get tracked metrics for this provider
   * 
   * @param options Query options for metrics
   * @returns Promise resolving to metrics data
   */
  getMetrics?(options?: {
    startDate?: Date;
    endDate?: Date;
    model?: string;
    requestType?: string;
  }): Promise<any>;
  
  /**
   * Check if a model is available through this provider
   * 
   * @param modelId Model identifier to check
   * @returns Promise resolving to availability status
   */
  checkModelAvailability?(modelId: string): Promise<boolean>;

  /**
   * Transcribe audio to text
   * 
   * @param request Audio transcription request parameters
   * @returns Promise resolving to audio transcription response
   */
  createTranscription?(request: AudioTranscriptionRequest): Promise<AudioTranscriptionResponse>;

  /**
   * Map a provider-specific model name to an OpenRouter model ID
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns Provider-specific model name
   */
  mapToProviderModel(openRouterModelId: string): string;
}

/**
 * Provider types supported by OpenRouter
 */
export enum ProviderType {
  OPENROUTER = 'openrouter',
  OPENAI = 'openai',
  GOOGLE_GEMINI = 'google_gemini',
  GOOGLE_VERTEX = 'google_vertex',
  ANTHROPIC = 'anthropic',
  CLAUDE = 'claude',  // Added Claude as distinct from generic Anthropic
  MISTRAL = 'mistral',
  TOGETHER = 'together'
}
