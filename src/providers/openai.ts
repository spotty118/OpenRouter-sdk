/**
 * OpenAI API provider implementation
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
 * OpenAI specific configuration
 */
export interface OpenAIConfig extends ProviderConfig {
  /**
   * Organization ID for the OpenAI API
   */
  organizationId?: string;
}

/**
 * Model mapping between OpenRouter and OpenAI models
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to OpenAI model
  'openai/gpt-3.5-turbo': 'gpt-3.5-turbo',
  'openai/gpt-4': 'gpt-4',
  'openai/gpt-4-turbo': 'gpt-4-turbo',
  'openai/gpt-4o': 'gpt-4o',
  'openai/gpt-4-vision': 'gpt-4-vision-preview',
  'openai/dall-e-3': 'dall-e-3',
  'openai/text-embedding-3-small': 'text-embedding-3-small',
  'openai/text-embedding-3-large': 'text-embedding-3-large',
  'openai/whisper-1': 'whisper-1',

  // OpenAI model to OpenRouter model ID
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  'gpt-4': 'openai/gpt-4',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4-vision-preview': 'openai/gpt-4-vision',
  'dall-e-3': 'openai/dall-e-3',
  'text-embedding-3-small': 'openai/text-embedding-3-small',
  'text-embedding-3-large': 'openai/text-embedding-3-large',
  'whisper-1': 'openai/whisper-1'
};

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements Provider {
  readonly name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;

  /**
   * Create a new OpenAI provider instance
   * 
   * @param config OpenAI configuration options
   */
  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger('info');

    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...config.headers
    };

    // Add organization header if provided
    if (config.organizationId) {
      this.headers['OpenAI-Organization'] = config.organizationId;
    }
  }

  /**
   * Map OpenRouter model ID to OpenAI model
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns OpenAI model name
   */
  mapToProviderModel(openRouterModelId: string): string {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map OpenAI model to OpenRouter model ID
   * 
   * @param openaiModel OpenAI model name
   * @returns OpenRouter model ID
   */
  mapToOpenRouterModel(openaiModel: string): string {
    return MODEL_MAPPING[openaiModel] || openaiModel;
  }

  /**
   * Create chat completion with OpenAI
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const openaiModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Build request payload
    const payload: any = {
      model: openaiModel,
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream: false,
      stop: request.additional_stop_sequences,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      logit_bias: request.logit_bias,
      user: request.user
    };
    
    // Add response format if specified
    if (request.response_format) {
      if (request.response_format.type === 'json_object') {
        payload.response_format = { type: 'json_object' };
      }
    }
    
    // Add tools if specified
    if (request.tools && request.tools.length > 0) {
      payload.tools = request.tools;
      
      if (request.tool_choice) {
        payload.tool_choice = request.tool_choice;
      }
    }
    
    // Add seed if specified
    if (request.seed !== undefined) {
      payload.seed = request.seed;
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
          `OpenAI request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const openaiResponse = await response.json();
      
      // Convert OpenAI response to OpenRouter format (minimal conversion needed as formats are similar)
      const completionResponse: CompletionResponse = {
        id: openaiResponse.id,
        model: this.mapToOpenRouterModel(openaiResponse.model),
        choices: openaiResponse.choices,
        usage: openaiResponse.usage
      };
      
      return completionResponse;
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling OpenAI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Stream chat completions from OpenAI
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const openaiModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Build request payload
    const payload: any = {
      model: openaiModel,
      messages: request.messages,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      stream: true,
      stop: request.additional_stop_sequences,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      logit_bias: request.logit_bias,
      user: request.user
    };
    
    // Add response format if specified
    if (request.response_format) {
      if (request.response_format.type === 'json_object') {
        payload.response_format = { type: 'json_object' };
      }
    }
    
    // Add tools if specified
    if (request.tools && request.tools.length > 0) {
      payload.tools = request.tools;
      
      if (request.tool_choice) {
        payload.tool_choice = request.tool_choice;
      }
    }
    
    // Add seed if specified
    if (request.seed !== undefined) {
      payload.seed = request.seed;
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
          `OpenAI streaming request failed with status ${response.status}`, 
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
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              
              yield {
                id: data.id,
                model: this.mapToOpenRouterModel(openaiModel),
                choices: data.choices
              };
            } catch (e) {
              this.logger.warn('Failed to parse OpenAI stream data:', trimmedLine);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error streaming from OpenAI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate embeddings with OpenAI
   * 
   * @param request Embedding request parameters
   * @returns Promise resolving to embedding response
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const openaiModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/embeddings`;
    
    // Build request payload
    const payload = {
      model: openaiModel,
      input: request.input,
      encoding_format: request.encoding_format,
      user: request.user
    };
    
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
          `OpenAI embedding request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const openaiResponse = await response.json();
      
      // Convert OpenAI response to OpenRouter format (minimal conversion needed as formats are similar)
      const embeddingResponse: EmbeddingResponse = {
        id: openaiResponse.id,
        object: openaiResponse.object,
        data: openaiResponse.data,
        model: this.mapToOpenRouterModel(openaiResponse.model),
        usage: openaiResponse.usage
      };
      
      return embeddingResponse;
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error creating embeddings with OpenAI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate images with OpenAI
   * 
   * @param request Image generation request parameters
   * @returns Promise resolving to image generation response
   */
  async createImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const openaiModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/images/generations`;
    
    // Build request payload
    const payload = {
      model: openaiModel,
      prompt: request.prompt,
      n: request.n || 1,
      size: request.size || '1024x1024',
      response_format: request.response_format || 'url',
      quality: request.quality || 'standard',
      style: request.style || 'vivid',
      user: request.user
    };
    
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
          `OpenAI image generation request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const openaiResponse = await response.json();
      
      // Return the OpenAI response directly as it already matches the expected format
      return openaiResponse;
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error generating images with OpenAI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Transcribe audio to text with OpenAI
   * 
   * @param request Audio transcription request parameters
   * @returns Promise resolving to audio transcription response
   */
  async createTranscription(request: AudioTranscriptionRequest): Promise<AudioTranscriptionResponse> {
    const openaiModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/audio/transcriptions`;
    
    const formData = new FormData();
    formData.append('model', openaiModel);
    
    // Handle different file formats
    if (typeof request.file === 'string') {
      // Assume base64 string
      const byteCharacters = atob(request.file);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
      formData.append('file', blob, 'audio.mp3');
    } else if (request.file instanceof Blob) {
      formData.append('file', request.file);
    } else if (request.file instanceof ArrayBuffer) {
      const blob = new Blob([request.file]);
      formData.append('file', blob, 'audio.mp3');
    }
    
    // Add optional parameters
    if (request.language) formData.append('language', request.language);
    if (request.prompt) formData.append('prompt', request.prompt);
    if (request.response_format) formData.append('response_format', request.response_format);
    if (request.temperature !== undefined) formData.append('temperature', request.temperature.toString());
    if (request.timestamp_granularities) {
      request.timestamp_granularities.forEach(granularity => {
        formData.append('timestamp_granularities[]', granularity);
      });
    }
    
    // Custom headers for form data (remove Content-Type as it will be set by the browser)
    const headers = { ...this.headers };
    delete headers['Content-Type'];
    
    try {
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `OpenAI transcription request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const openaiResponse = await response.json();
      
      // Return the OpenAI response directly as it already matches the expected format
      return openaiResponse;
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error transcribing audio with OpenAI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
}
