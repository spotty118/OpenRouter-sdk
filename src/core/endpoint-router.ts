/**
 * Endpoint Router for routing requests to different API endpoints
 */

import { 
  CompletionRequest,
  EmbeddingRequest,
  ImageGenerationRequest,
  AudioTranscriptionRequest,
  validateCompletionRequest
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
import { RateLimiter } from '../utils/rate-limiter.js';
import { ValidationError } from '../errors/validation-error.js';

/**
 * Endpoint configuration options
 */
export interface EndpointConfig {
  baseUrl: string;
  apiKey: string;
  organizationId?: string;
  headers?: Record<string, string>;
  type: 'openai' | 'openrouter' | 'anthropic' | 'gemini' | 'vertex' | 'custom';
  requestTransformer?: (request: any, endpoint: string, headers: Record<string, string>) => any;
  responseTransformer?: (response: any) => any;
}

/**
 * Endpoint Router configuration
 */
export interface EndpointRouterConfig {
  defaultEndpointId: string;
  endpoints: Record<string, EndpointConfig>;
  providerManager?: ProviderManager;
  enableDirectProviders?: boolean;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Router options for routing specific requests
 */
export interface RoutingOptions {
  endpointId?: string;
  useDirectProvider?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Request tracking interface
 */
interface TrackedRequest {
  id: string;
  controller: AbortController;
  timestamp: number;
  endpoint: string;
  cleanup: () => void;
}

/**
 * Endpoint Router class for flexible routing to different API endpoints
 */
export class EndpointRouter {
  private config: EndpointRouterConfig;
  private logger: Logger;
  private providerIntegration: ProviderIntegration | null = null;
  private rateLimiter: RateLimiter;
  private requestsInFlight: Map<string, TrackedRequest> = new Map();
  private requestTimeout: number = 30000; // Default 30s timeout
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: EndpointRouterConfig) {
    this.config = {
      ...config,
      enableDirectProviders: config.enableDirectProviders !== false
    };
    
    this.logger = new Logger(config.logLevel || 'info');
    this.rateLimiter = new RateLimiter(60); // Default 60 requests per minute
    
    if (this.config.providerManager && this.config.enableDirectProviders) {
      this.providerIntegration = new ProviderIntegration(
        this.config.providerManager,
        config.logLevel || 'info',
        true
      );
    }
    
    this.cleanupInterval = setInterval(() => this.cleanupStaleRequests(), 60000);
    this.logger.info('Endpoint Router initialized with endpoints:', Object.keys(config.endpoints));
  }

  public dispose(): void {
    clearInterval(this.cleanupInterval);
    this.cancelAllRequests();
  }

  private cleanupStaleRequests(): void {
    const now = Date.now();
    for (const [id, request] of this.requestsInFlight.entries()) {
      if (now - request.timestamp > this.requestTimeout) {
        this.logger.warn(`Request ${id} exceeded timeout, cleaning up`);
        request.controller.abort();
        request.cleanup();
        this.requestsInFlight.delete(id);
      }
    }
  }

  private trackRequest(endpoint: string): TrackedRequest {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    
    const request: TrackedRequest = {
      id,
      controller,
      timestamp: Date.now(),
      endpoint,
      cleanup: () => {
        try {
          controller.abort();
        } catch (error) {
          this.logger.error(`Error cleaning up request ${id}:`, error);
        }
      }
    };
    
    this.requestsInFlight.set(id, request);
    return request;
  }

  private cleanupRequest(id: string): void {
    const request = this.requestsInFlight.get(id);
    if (request) {
      request.cleanup();
      this.requestsInFlight.delete(id);
    }
  }

  public cancelAllRequests(): void {
    for (const [id, request] of this.requestsInFlight.entries()) {
      request.cleanup();
      this.requestsInFlight.delete(id);
    }
  }

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
   * Add a new endpoint configuration at runtime
   * @param endpointId Unique identifier for the endpoint
   * @param config Endpoint configuration
   */
  public addEndpoint(endpointId: string, config: EndpointConfig): void {
    this.config.endpoints[endpointId] = config;
    this.logger.info(`Added new endpoint: ${endpointId}`);
  }
  
  /**
   * Get the list of configured endpoint IDs
   * @returns Array of endpoint IDs
   */
  public getEndpointIds(): string[] {
    return Object.keys(this.config.endpoints);
  }
  
  /**
   * Set the default endpoint to use when no endpointId is specified
   * @param endpointId Endpoint ID to set as default
   */
  public setDefaultEndpoint(endpointId: string): void {
    if (!this.config.endpoints[endpointId]) {
      throw new OpenRouterError(
        `Cannot set default endpoint: ${endpointId} is not a valid endpoint ID`,
        400,
        null
      );
    }
    
    this.config.defaultEndpointId = endpointId;
    this.logger.info(`Set default endpoint to: ${endpointId}`);
  }
  
  /**
   * Get the current default endpoint ID
   * @returns Default endpoint ID
   */
  public getDefaultEndpointId(): string {
    return this.config.defaultEndpointId;
  }

  private buildHeaders(endpoint: EndpointConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpoint.headers
    };
    
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
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'vertex':
        headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
        break;
      case 'custom':
        if (endpoint.apiKey) {
          headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
        }
        break;
    }
    
    return headers;
  }

  private async transformRequest(request: CompletionRequest, type: EndpointConfig['type']): Promise<any> {
    switch (type) {
      case 'openai':
      case 'openrouter':
        return request;
      case 'anthropic':
        return this.transformToAnthropic(request);
      case 'gemini':
        return this.transformToGemini(request);
      case 'vertex':
        return this.transformToVertex(request);
      default:
        return request;
    }
  }

  private async transformResponse(response: any, type: EndpointConfig['type']): Promise<CompletionResponse> {
    switch (type) {
      case 'openai':
      case 'openrouter':
        return response;
      case 'anthropic':
        return this.transformFromAnthropic(response);
      case 'gemini':
        return this.transformFromGemini(response);
      case 'vertex':
        return this.transformFromVertex(response);
      default:
        return response;
    }
  }

  private async transformStreamResponse(data: any, type: EndpointConfig['type']): Promise<Partial<CompletionResponse>> {
    switch (type) {
      case 'openai':
      case 'openrouter':
        return data;
      case 'anthropic':
        return this.transformStreamFromAnthropic(data);
      case 'gemini':
        return this.transformStreamFromGemini(data);
      case 'vertex':
        return this.transformStreamFromVertex(data);
      default:
        return data;
    }
  }

  private transformToAnthropic(request: CompletionRequest): any {
    let systemPrompt: string | undefined;
    let messages = [...request.messages];
    
    if (messages.length > 0 && messages[0].role === 'system') {
      const systemMessage = messages[0];
      systemPrompt = typeof systemMessage.content === 'string' 
        ? systemMessage.content 
        : JSON.stringify(systemMessage.content);
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

  private transformFromAnthropic(response: any): CompletionResponse {
    const content = response.content || [];
    let responseText = '';
    
    for (const item of content) {
      if (item.type === 'text') {
        responseText += item.text;
      }
    }
    
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

  private transformStreamFromAnthropic(data: any): Partial<CompletionResponse> {
    if (data.type === 'content_block_delta') {
      return {
        id: data.message_id || `anthropic-${Date.now()}`,
        model: 'anthropic/claude',
        choices: [
          {
            message: {
              role: 'assistant',
              content: data.delta?.text || ''
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

  private transformToGemini(request: CompletionRequest): any {
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

  private transformFromGemini(response: any): CompletionResponse {
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

  private transformToVertex(request: CompletionRequest): any {
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

  private transformFromVertex(response: any): CompletionResponse {
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

  async createChatCompletion(
    request: CompletionRequest,
    options: RoutingOptions = {}
  ): Promise<CompletionResponse> {
    try {
      validateCompletionRequest(request);
    } catch (error) {
      throw new ValidationError('Invalid completion request', error);
    }

    await this.rateLimiter.throttle();

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

    const endpoint = this.getEndpoint(options.endpointId);
    const trackedRequest = this.trackRequest(endpoint.baseUrl);
    
    try {
      const headers = this.buildHeaders(endpoint);
      const url = `${endpoint.baseUrl}/chat/completions`;
      const payload = await this.transformRequest(request, endpoint.type);

      const response = await this.makeRequest(
        url,
        'POST',
        payload,
        headers,
        trackedRequest.controller.signal,
        options.timeout || this.requestTimeout
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Endpoint request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }

      const result = await response.json();
      return await this.transformResponse(result, endpoint.type);
    } finally {
      this.cleanupRequest(trackedRequest.id);
    }
  }

  async *streamChatCompletions(
    request: CompletionRequest,
    options: RoutingOptions = {}
  ): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    try {
      validateCompletionRequest(request);
    } catch (error) {
      throw new ValidationError('Invalid completion request', error);
    }

    await this.rateLimiter.throttle();

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

    const endpoint = this.getEndpoint(options.endpointId);
    const trackedRequest = this.trackRequest(endpoint.baseUrl);
    
    try {
      const headers = this.buildHeaders(endpoint);
      const url = `${endpoint.baseUrl}/chat/completions`;
      const payload = {
        ...await this.transformRequest(request, endpoint.type),
        stream: true
      };

      const response = await this.makeRequest(
        url,
        'POST',
        payload,
        headers,
        trackedRequest.controller.signal,
        options.timeout || 60000
      );

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

      try {
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

            if (trimmedLine.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                const transformedData = await this.transformStreamResponse(data, endpoint.type);
                yield transformedData;
              } catch (e) {
                this.logger.warn('Failed to parse stream data:', trimmedLine);
              }
            }
          }
        }

        // Process any remaining data in buffer
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            const transformedData = await this.transformStreamResponse(data, endpoint.type);
            yield transformedData;
          } catch (e) {
            this.logger.warn('Failed to parse final stream data:', buffer);
          }
        }
      } finally {
        try {
          await reader.cancel();
        } catch (error) {
          this.logger.error('Error canceling stream reader:', error);
        }
      }
    } finally {
      this.cleanupRequest(trackedRequest.id);
    }
  }

  private async makeRequest(
    url: string,
    method: string,
    body: any,
    headers: Record<string, string>,
    signal: AbortSignal,
    timeout: number
  ): Promise<Response> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
        signal: this.createCombinedSignal([signal, timeoutController.signal])
      });
      
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private createCombinedSignal(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    
    return controller.signal;
  }
}
