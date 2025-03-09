/**
 * Together AI provider implementation
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
 * Together AI specific configuration
 */
export interface TogetherConfig extends ProviderConfig {
  /**
   * Optional API version
   */
  apiVersion?: string;
}

/**
 * Model mapping between OpenRouter and Together AI models (partial list)
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Together AI model
  'meta-llama/llama-3-8b-instruct': 'meta-llama/Llama-3-8b-instruct',
  'meta-llama/llama-3-70b-instruct': 'meta-llama/Llama-3-70b-instruct',
  'mistralai/mixtral-8x7b-instruct': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  'mistralai/mistral-7b-instruct': 'mistralai/Mistral-7B-Instruct-v0.2',
  
  // Together AI model to OpenRouter model ID
  'meta-llama/Llama-3-8b-instruct': 'meta-llama/llama-3-8b-instruct',
  'meta-llama/Llama-3-70b-instruct': 'meta-llama/llama-3-70b-instruct',
  'mistralai/Mixtral-8x7B-Instruct-v0.1': 'mistralai/mixtral-8x7b-instruct',
  'mistralai/Mistral-7B-Instruct-v0.2': 'mistralai/mistral-7b-instruct'
};

/**
 * Chat template formats for different model families
 */
const CHAT_TEMPLATES: Record<string, string> = {
  'llama': 'llama-2',
  'llama-3': 'llama-3',
  'mixtral': 'mistral',
  'mistral': 'mistral',
  'gemma': 'gemma',
  'falcon': 'falcon'
};

/**
 * Together AI provider implementation
 */
export class TogetherProvider implements Provider {
  readonly name = 'together';
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;

  /**
   * Create a new Together AI provider instance
   * 
   * @param config Together AI configuration options
   */
  constructor(config: TogetherConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.together.xyz/v1';
    this.timeout = config.timeout || 60000; // Longer timeout for Together
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger('info');

    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...config.headers
    };
  }

  /**
   * Map OpenRouter model ID to Together AI model
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns Together AI model name
   */
  mapToProviderModel(openRouterModelId: string): string {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Together AI model to OpenRouter model ID
   * 
   * @param togetherModel Together AI model name
   * @returns OpenRouter model ID
   */
  mapToOpenRouterModel(togetherModel: string): string {
    return MODEL_MAPPING[togetherModel] || togetherModel;
  }

  /**
   * Detect the chat template format to use for a model
   * 
   * @param modelName The model name
   * @returns The chat template format name
   */
  private detectChatTemplate(modelName: string): string | undefined {
    const lowerModelName = modelName.toLowerCase();
    
    for (const [family, template] of Object.entries(CHAT_TEMPLATES)) {
      if (lowerModelName.includes(family)) {
        return template;
      }
    }
    
    return undefined;
  }

  /**
   * Create chat completion with Together AI
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const togetherModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Build request payload - Together's API is compatible with OpenAI format
    const payload: any = {
      model: togetherModel,
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream: false
    };
    
    // Add optional parameters
    if (request.additional_stop_sequences) {
      payload.stop = request.additional_stop_sequences;
    }
    
    if (request.response_format) {
      payload.response_format = request.response_format;
    }
    
    // Detect and set chat template if needed
    const chatTemplate = this.detectChatTemplate(togetherModel);
    if (chatTemplate) {
      payload.chat_template = chatTemplate;
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
          `Together AI request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const togetherResponse = await response.json();
      
      // Convert Together AI response to OpenRouter format (minimal conversion as formats are similar)
      return {
        id: togetherResponse.id || `together-${Date.now()}`,
        model: this.mapToOpenRouterModel(togetherModel),
        choices: togetherResponse.choices,
        usage: togetherResponse.usage
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling Together AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Stream chat completions from Together AI
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const togetherModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Build request payload
    const payload: any = {
      model: togetherModel,
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream: true
    };
    
    // Add optional parameters
    if (request.additional_stop_sequences) {
      payload.stop = request.additional_stop_sequences;
    }
    
    if (request.response_format) {
      payload.response_format = request.response_format;
    }
    
    // Detect and set chat template if needed
    const chatTemplate = this.detectChatTemplate(togetherModel);
    if (chatTemplate) {
      payload.chat_template = chatTemplate;
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
          `Together AI streaming request failed with status ${response.status}`, 
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
              this.logger.warn('Failed to parse Together AI stream data:', line);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error streaming from Together AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate embeddings with Together AI
   * 
   * @param request Embedding request parameters
   * @returns Promise resolving to embedding response
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const togetherModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/embeddings`;
    
    // Ensure that the input is properly formatted
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    
    try {
      // Together API can handle batch requests
      const payload = {
        model: togetherModel,
        input: inputs
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
          `Together AI embedding request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const data = await response.json();
      
      // Extract usage information
      const promptTokens = data.usage?.prompt_tokens || 0;
      const totalTokens = data.usage?.total_tokens || promptTokens;
      
      // Format the response to match OpenRouter's format
      return {
        id: data.id || `together-emb-${Date.now()}`,
        object: 'list',
        data: data.data || [],
        model: this.mapToOpenRouterModel(togetherModel),
        usage: {
          prompt_tokens: promptTokens,
          total_tokens: totalTokens
        }
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error creating embeddings with Together AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
}
