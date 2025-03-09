/**
 * Endpoint Router for routing requests to different API endpoints
 * 
 * This provides a flexible way to route requests to different endpoints
 * based on configuration, allowing for easy switching between providers
 * or custom endpoints with minimal code changes.
 */

import { 
  CompletionRequest,
  EmbeddingRequest,
  ImageGenerationRequest,
  AudioTranscriptionRequest
} from '../interfaces/requests.js';
import {
  CompletionResponse,
  EmbeddingResponse,
  ImageGenerationResponse,
  AudioTranscriptionResponse
} from '../interfaces/responses.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import { Logger } from '../utils/logger.js';
import { OpenRouter } from './open-router.js';
import { Provider, ProviderType } from '../interfaces/provider.js';
import { ProviderManager } from '../utils/provider-manager.js';
import { ProviderIntegration } from '../utils/provider-integration.js';

/**
 * Endpoint configuration options
 */
export interface EndpointConfig {
  /**
   * Base URL for the API endpoint
   */
  baseUrl: string;
  
  /**
   * API key for authentication
   */
  apiKey: string;
  
  /**
   * Optional organization ID (for services like OpenAI that use it)
   */
  organizationId?: string;
  
  /**
   * Optional extra headers to include in requests
   */
  headers?: Record<string, string>;
  
  /**
   * Endpoint type/format (determines how to format requests)
   */
  type: 'openai' | 'openrouter' | 'anthropic' | 'gemini' | 'vertex' | 'custom';
  
  /**
   * Optional custom request transformer for 'custom' type endpoints
   */
  requestTransformer?: (request: any, endpoint: string, headers: Record<string, string>) => any;
  
  /**
   * Optional custom response transformer for 'custom' type endpoints
   */
  responseTransformer?: (response: any) => any;
}

/**
 * Endpoint Router configuration
 */
export interface EndpointRouterConfig {
  /**
   * Default endpoint ID to use when no specific endpoint is requested
   */
  defaultEndpointId: string;
  
  /**
   * Map of endpoint IDs to endpoint configurations
   */
  endpoints: Record<string, EndpointConfig>;
  
  /**
   * Optional provider manager for native provider integrations
   */
  providerManager?: ProviderManager;
  
  /**
   * Flag to enable direct provider integration (default: true)
   */
  enableDirectProviders?: boolean;
  
  /**
   * Log level
   */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Router options for routing specific requests
 */
export interface RoutingOptions {
  /**
   * Specific endpoint ID to use for this request
   */
  endpointId?: string;
  
  /**
   * Whether to use a direct provider if available
   */
  useDirectProvider?: boolean;
  
  /**
   * Maximum number of retries
   */
  maxRetries?: number;
  
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Endpoint Router class for flexible routing to different API endpoints
 */
export class EndpointRouter {
  private config: EndpointRouterConfig;
  private logger: Logger;
  private providerIntegration: ProviderIntegration | null = null;
  
  /**
   * Create a new Endpoint Router
   * 
   * @param config Router configuration
   */
  constructor(config: EndpointRouterConfig) {
    this.config = {
      ...config,
      enableDirectProviders: config.enableDirectProviders !== false
    };
    
    this.logger = new Logger(config.logLevel || 'info');
    
    // Set up provider integration if provider manager is provided
    if (this.config.providerManager && this.config.enableDirectProviders) {
      this.providerIntegration = new ProviderIntegration(
        this.config.providerManager,
        config.logLevel || 'info',
        true // enable direct integration
      );
    }
    
    this.logger.info('Endpoint Router initialized with endpoints:', Object.keys(config.endpoints));
  }
  
  /**
   * Get an endpoint configuration by ID
   * 
   * @param endpointId Endpoint ID
   * @returns Endpoint configuration
   */
  private getEndpoint(endpointId?: string): EndpointConfig {
    const id = endpointId || this.config.defaultEndpointId;
    const endpoint = this.config.endpoints[id];
    
    if (!endpoint) {
      throw new OpenRouterError(
        `Endpoint not found: ${id}`,
        404,
        null
      );
    }
    
    return endpoint;
  }
  
  /**
   * Build headers for a request to an endpoint
   * 
   * @param endpoint Endpoint configuration
   * @returns Headers object
   */
  private buildHeaders(endpoint: EndpointConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpoint.headers
    };
    
    // Add authorization header based on endpoint type
    switch (endpoint.type) {
      case 'openai':
      case 'openrouter':
        headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
        
        if (endpoint.organizationId) {
          headers['OpenAI-Organization'] = endpoint.organizationId;
        }
        break;
        
      case 'anthropic':
        headers['x-api-key'] = endpoint.apiKey;
        headers['anthropic-version'] = '2023-06-01'; // Use latest API version as default
        break;
        
      case 'gemini':
        // Gemini uses API key as a query parameter instead of a header
        break;
        
      case 'vertex':
        headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
        break;
        
      case 'custom':
        // Custom endpoints should provide their own headers
        if (endpoint.apiKey) {
          headers['Authorization'] = `Bearer ${endpoint.apiKey}`; // Default to Bearer auth
        }
        break;
    }
    
    return headers;
  }
  
  /**
   * Route a chat completion request to the appropriate endpoint
   * 
   * @param request Completion request
   * @param options Routing options
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(
    request: CompletionRequest,
    options: RoutingOptions = {}
  ): Promise<CompletionResponse> {
    // Try direct provider integration first if enabled
    if (
      (options.useDirectProvider !== false) &&
      this.config.enableDirectProviders &&
      this.providerIntegration
    ) {
      try {
        const directResponse = await this.providerIntegration.tryChatCompletion(request);
        if (directResponse) {
          this.logger.info(`Used direct provider for model: ${request.model}`);
          return directResponse;
        }
      } catch (error) {
        this.logger.warn(`Direct provider failed, falling back to endpoint:`, error);
      }
    }
    
    // Fall back to endpoint routing
    const endpoint = this.getEndpoint(options.endpointId);
    const headers = this.buildHeaders(endpoint);
    const url = `${endpoint.baseUrl}/chat/completions`;
    
    // Prepare request payload based on endpoint type
    let payload: any;
    
    switch (endpoint.type) {
      case 'openai':
      case 'openrouter':
        // OpenAI and OpenRouter share the same format
        payload = { ...request };
        break;
        
      case 'anthropic':
        payload = this.transformToAnthropic(request);
        break;
        
      case 'gemini':
        payload = this.transformToGemini(request);
        break;
        
      case 'vertex':
        payload = this.transformToVertex(request);
        break;
        
      case 'custom':
        if (endpoint.requestTransformer) {
          payload = endpoint.requestTransformer(request, url, headers);
        } else {
          payload = { ...request };
        }
        break;
    }
    
    // Make the request
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeout || 30000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Endpoint request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }
      
      let result = await response.json();
      
      // Transform the response if needed
      if (endpoint.type === 'custom' && endpoint.responseTransformer) {
        result = endpoint.responseTransformer(result);
      } else if (endpoint.type === 'anthropic') {
        result = this.transformFromAnthropic(result);
      } else if (endpoint.type === 'gemini') {
        result = this.transformFromGemini(result);
      } else if (endpoint.type === 'vertex') {
        result = this.transformFromVertex(result);
      }
      
      return result;
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      
      throw new OpenRouterError(
        `Error calling endpoint: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
  
  /**
   * Route a streaming chat completion request to the appropriate endpoint
   * 
   * @param request Completion request
   * @param options Routing options
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(
    request: CompletionRequest,
    options: RoutingOptions = {}
  ): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    // Try direct provider integration first if enabled
    if (
      (options.useDirectProvider !== false) &&
      this.config.enableDirectProviders &&
      this.providerIntegration
    ) {
      try {
        const provider = this.providerIntegration.findProviderForModel(request.model);
        if (provider) {
          this.logger.info(`Using direct provider for streaming model: ${request.model}`);
          yield* provider.streamChatCompletions(request);
          return;
        }
      } catch (error) {
        this.logger.warn(`Direct provider streaming failed, falling back to endpoint:`, error);
      }
    }
    
    // Fall back to endpoint routing
    const endpoint = this.getEndpoint(options.endpointId);
    const headers = this.buildHeaders(endpoint);
    const url = `${endpoint.baseUrl}/chat/completions`;
    
    // Prepare request payload based on endpoint type
    let payload: any;
    
    switch (endpoint.type) {
      case 'openai':
      case 'openrouter':
        // OpenAI and OpenRouter share the same format
        payload = {
          ...request,
          stream: true
        };
        break;
        
      case 'anthropic':
        payload = {
          ...this.transformToAnthropic(request),
          stream: true
        };
        break;
        
      case 'gemini':
        payload = {
          ...this.transformToGemini(request),
          stream: true
        };
        break;
        
      case 'vertex':
        payload = {
          ...this.transformToVertex(request),
          stream: true
        };
        break;
        
      case 'custom':
        if (endpoint.requestTransformer) {
          payload = endpoint.requestTransformer({
            ...request,
            stream: true
          }, url, headers);
        } else {
          payload = {
            ...request,
            stream: true
          };
        }
        break;
    }
    
    // Make the streaming request
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeout || 60000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Endpoint streaming request failed with status ${response.status}`,
          response.status,
          errorData
        );
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
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || line === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Transform if needed based on endpoint type
              let transformedData: any = data;
              
              if (endpoint.type === 'custom' && endpoint.responseTransformer) {
                transformedData = endpoint.responseTransformer(data);
              } else if (endpoint.type === 'anthropic') {
                transformedData = this.transformStreamFromAnthropic(data);
              } else if (endpoint.type === 'gemini') {
                transformedData = this.transformStreamFromGemini(data);
              } else if (endpoint.type === 'vertex') {
                transformedData = this.transformStreamFromVertex(data);
              }
              
              yield transformedData;
            } catch (e) {
              this.logger.warn('Failed to parse stream data:', line);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      
      throw new OpenRouterError(
        `Error streaming from endpoint: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
  
  // Transformation methods for different endpoint types
  
  /**
   * Transform OpenRouter format to Anthropic format
   */
  private transformToAnthropic(request: CompletionRequest): any {
    // Extract system prompt if present
    let systemPrompt: string | undefined;
    let messages = [...request.messages];
    
    if (messages.length > 0 && messages[0].role === 'system') {
      const systemMessage = messages[0];
      if (typeof systemMessage.content === 'string') {
        systemPrompt = systemMessage.content;
      } else {
        systemPrompt = JSON.stringify(systemMessage.content);
      }
      
      messages = messages.slice(1);
    }
    
    return {
      model: request.model.startsWith('anthropic/') 
        ? request.model.substring(10) 
        : request.model,
      messages,
      system: systemPrompt,
      max_tokens: request.max_tokens || 1024,
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      stop_sequences: request.additional_stop_sequences
    };
  }
  
  /**
   * Transform Anthropic response to OpenRouter format
   */
  private transformFromAnthropic(response: any): CompletionResponse {
    // Extract text content from response
    const content = response.content || [];
    let responseText = '';
    
    for (const item of content) {
      if (item.type === 'text') {
        responseText += item.text;
      }
    }
    
    // Estimate token count
    const promptTokens = response.usage?.input_tokens || 0;
    const completionTokens = response.usage?.output_tokens || 0;
    
    return {
      id: response.id || `anthropic-${Date.now()}`,
      model: response.model || 'anthropic/claude',
      choices: [
        {
          message: {
            role: 'assistant',
            content: responseText
          },
          finish_reason: response.stop_reason || 'stop',
          index: 0
        }
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  }
  
  /**
   * Transform Anthropic streaming response to OpenRouter format
   */
  private transformStreamFromAnthropic(data: any): Partial<CompletionResponse> {
    if (data.type === 'content_block_delta') {
      const deltaText = data.delta?.text || '';
      
      return {
        id: data.message_id || `anthropic-${Date.now()}`,
        model: 'anthropic/claude',
        choices: [
          {
            message: {
              role: 'assistant',
              content: deltaText
            },
              finish_reason: null as unknown as string,
            index: 0
          }
        ]
      };
    } else if (data.type === 'message_stop') {
      return {
        id: data.message_id || `anthropic-${Date.now()}`,
        model: 'anthropic/claude',
        choices: [
          {
            message: {
              role: 'assistant',
              content: ''
            },
            finish_reason: data.stop_reason || 'stop',
            index: 0
          }
        ]
      };
    }
    
    return {
      id: `anthropic-${Date.now()}`,
      choices: []
    };
  }
  
  /**
   * Transform OpenRouter format to Gemini format
   */
  private transformToGemini(request: CompletionRequest): any {
    // Gemini has a different format - transform messages to Gemini format
    // This is simplified - a full implementation would handle different content types
    
    return {
      model: request.model.startsWith('google/gemini') 
        ? request.model.substring(7) 
        : request.model,
      contents: request.messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        parts: [
          {
            text: typeof msg.content === 'string' 
              ? msg.content 
              : JSON.stringify(msg.content)
          }
        ]
      })),
      generationConfig: {
        temperature: request.temperature,
        topP: request.top_p,
        topK: request.top_k,
        maxOutputTokens: request.max_tokens,
        stopSequences: request.additional_stop_sequences
      }
    };
  }
  
  /**
   * Transform Gemini response to OpenRouter format
   */
  private transformFromGemini(response: any): CompletionResponse {
    // Extract text from Gemini response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      id: response.candidates?.[0]?.responseId || `gemini-${Date.now()}`,
      model: 'google/gemini',
      choices: [
        {
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: response.candidates?.[0]?.finishReason?.toLowerCase() || 'stop',
          index: 0
        }
      ],
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: (response.usageMetadata?.promptTokenCount || 0) + 
                     (response.usageMetadata?.candidatesTokenCount || 0)
      }
    };
  }
  
  /**
   * Transform Gemini streaming response to OpenRouter format
   */
  private transformStreamFromGemini(data: any): Partial<CompletionResponse> {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      id: data.candidates?.[0]?.responseId || `gemini-${Date.now()}`,
      model: 'google/gemini',
      choices: [
        {
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: data.candidates?.[0]?.finishReason?.toLowerCase() || null,
          index: 0
        }
      ]
    };
  }
  
  /**
   * Transform OpenRouter format to Vertex AI format
   */
  private transformToVertex(request: CompletionRequest): any {
    // Simplified - actual implementation would handle all the Vertex API specifics
    
    return {
      model: request.model.startsWith('google-vertex/') 
        ? request.model.substring(14) 
        : request.model,
      instances: [
        {
          messages: request.messages.map(msg => ({
            author: msg.role,
            content: typeof msg.content === 'string' 
              ? msg.content 
              : JSON.stringify(msg.content)
          }))
        }
      ],
      parameters: {
        temperature: request.temperature,
        topP: request.top_p,
        topK: request.top_k,
        maxOutputTokens: request.max_tokens,
        stopSequences: request.additional_stop_sequences
      }
    };
  }
  
  /**
   * Transform Vertex AI response to OpenRouter format
   */
  private transformFromVertex(response: any): CompletionResponse {
    // Extract text from Vertex response
    const text = response.predictions?.[0]?.content || '';
    
    return {
      id: `vertex-${Date.now()}`,
      model: 'google-vertex/model',
      choices: [
        {
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: 'stop',
          index: 0
        }
      ],
      usage: {
        prompt_tokens: response.metadata?.tokenCount?.promptTokenCount || 0,
        completion_tokens: response.metadata?.tokenCount?.outputTokenCount || 0,
        total_tokens: (response.metadata?.tokenCount?.promptTokenCount || 0) + 
                     (response.metadata?.tokenCount?.outputTokenCount || 0)
      }
    };
  }
  
  /**
   * Transform Vertex AI streaming response to OpenRouter format
   */
  private transformStreamFromVertex(data: any): Partial<CompletionResponse> {
    const text = data.predictions?.[0]?.content || '';
    
    return {
      id: `vertex-${Date.now()}`,
      model: 'google-vertex/model',
      choices: [
        {
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: data.predictions?.[0]?.finishReason || null,
          index: 0
        }
      ]
    };
  }
  
  /**
   * Add a new endpoint configuration
   * 
   * @param id Endpoint ID
   * @param config Endpoint configuration
   */
  addEndpoint(id: string, config: EndpointConfig): void {
    this.config.endpoints[id] = config;
    this.logger.info(`Added endpoint: ${id}`);
  }
  
  /**
   * Remove an endpoint configuration
   * 
   * @param id Endpoint ID
   */
  removeEndpoint(id: string): void {
    delete this.config.endpoints[id];
    this.logger.info(`Removed endpoint: ${id}`);
  }
  
  /**
   * Set the default endpoint
   * 
   * @param id Endpoint ID
   */
  setDefaultEndpoint(id: string): void {
    if (!this.config.endpoints[id]) {
      throw new OpenRouterError(
        `Cannot set default endpoint: ${id} not found`,
        404,
        null
      );
    }
    
    this.config.defaultEndpointId = id;
    this.logger.info(`Set default endpoint to: ${id}`);
  }
  
  /**
   * Get all available endpoint IDs
   * 
   * @returns Array of endpoint IDs
   */
  getEndpointIds(): string[] {
    return Object.keys(this.config.endpoints);
  }
  
  /**
   * Get the default endpoint ID
   * 
   * @returns Default endpoint ID
   */
  getDefaultEndpointId(): string {
    return this.config.defaultEndpointId;
  }
}
