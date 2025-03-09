/**
 * Mistral AI provider implementation
 */

import { Provider, ProviderConfig } from '../interfaces/provider.js';
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
import { ChatMessage } from '../interfaces/messaging.js';
import { Logger } from '../utils/logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * Mistral AI specific configuration
 */
export interface MistralConfig extends ProviderConfig {
  /**
   * Optional API version
   */
  apiVersion?: string;
}

/**
 * Model mapping between OpenRouter and Mistral AI models
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Mistral AI model
  'mistralai/mistral-tiny': 'mistral-tiny',
  'mistralai/mistral-small': 'mistral-small',
  'mistralai/mistral-medium': 'mistral-medium',
  'mistralai/mistral-large': 'mistral-large',
  'mistralai/mistral-large-latest': 'mistral-large-latest',
  'mistralai/mistral-embed': 'mistral-embed',
  
  // Mistral AI model to OpenRouter model ID
  'mistral-tiny': 'mistralai/mistral-tiny',
  'mistral-small': 'mistralai/mistral-small',
  'mistral-medium': 'mistralai/mistral-medium',
  'mistral-large': 'mistralai/mistral-large',
  'mistral-large-latest': 'mistralai/mistral-large-latest',
  'mistral-embed': 'mistralai/mistral-embed'
};

/**
 * Mistral AI provider implementation
 */
export class MistralProvider implements Provider {
  readonly name = 'mistral';
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;

  /**
   * Create a new Mistral AI provider instance
   * 
   * @param config Mistral AI configuration options
   */
  constructor(config: MistralConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger('info');

    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...config.headers
    };
  }

  /**
   * Map OpenRouter model ID to Mistral AI model
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns Mistral AI model name
   */
  mapToProviderModel(openRouterModelId: string): string {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Mistral AI model to OpenRouter model ID
   * 
   * @param mistralModel Mistral AI model name
   * @returns OpenRouter model ID
   */
  mapToOpenRouterModel(mistralModel: string): string {
    return MODEL_MAPPING[mistralModel] || mistralModel;
  }

  /**
   * Create chat completion with Mistral AI
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const mistralModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Build request payload - Mistral's API is compatible with OpenAI format
    const payload: any = {
      model: mistralModel,
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream: false,
      safe_prompt: true // Mistral's safe mode enabled by default
    };
    
    // Add optional parameters
    if (request.additional_stop_sequences) {
      payload.stop = request.additional_stop_sequences;
    }
    
    if (request.response_format) {
      payload.response_format = request.response_format;
    }
    
    try {
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Mistral AI request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const mistralResponse = await response.json();
      
      // Convert Mistral AI response to OpenRouter format (minimal conversion as formats are similar)
      return {
        id: mistralResponse.id || `mistral-${Date.now()}`,
        model: this.mapToOpenRouterModel(mistralModel),
        choices: mistralResponse.choices,
        usage: mistralResponse.usage
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling Mistral AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Stream chat completions from Mistral AI
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const mistralModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Build request payload
    const payload: any = {
      model: mistralModel,
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream: true,
      safe_prompt: true
    };
    
    // Add optional parameters
    if (request.additional_stop_sequences) {
      payload.stop = request.additional_stop_sequences;
    }
    
    if (request.response_format) {
      payload.response_format = request.response_format;
    }
    
    try {
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Mistral AI streaming request failed with status ${response.status}`, 
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
              
              // Map model name for consistency
              if (data.model) {
                data.model = this.mapToOpenRouterModel(data.model);
              }
              
              yield data;
            } catch (e) {
              this.logger.warn('Failed to parse Mistral AI stream data:', line);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error streaming from Mistral AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate embeddings with Mistral AI
   * 
   * @param request Embedding request parameters
   * @returns Promise resolving to embedding response
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const mistralModel = this.mapToProviderModel(request.model || 'mistral-embed');
    const url = `${this.baseUrl}/embeddings`;
    
    // Ensure that the input is properly formatted
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    
    try {
      const results = [];
      let totalTokens = 0;
      
      // Mistral supports batch processing, but we'll do individual requests for consistency
      for (let i = 0; i < inputs.length; i++) {
        const payload = {
          model: mistralModel,
          input: inputs[i]
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeout)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new OpenRouterError(
            `Mistral AI embedding request failed with status ${response.status}`, 
            response.status, 
            errorData
          );
        }
        
        const data = await response.json();
        const embedding = data.data?.[0]?.embedding || [];
        const tokens = data.usage?.total_tokens || Math.ceil(inputs[i].length / 4);
        totalTokens += tokens;
        
        results.push({
          embedding,
          index: i,
          object: 'embedding'
        });
      }
      
      return {
        id: `mistral-emb-${Date.now()}`,
        object: 'list',
        data: results,
        model: this.mapToOpenRouterModel(mistralModel),
        usage: {
          prompt_tokens: totalTokens,
          total_tokens: totalTokens
        }
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error creating embeddings with Mistral AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
}
