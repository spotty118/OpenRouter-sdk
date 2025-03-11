/**
 * Anthropic API provider implementation for Claude models
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
 * Anthropic specific configuration
 */
export interface AnthropicConfig extends ProviderConfig {
  /**
   * Optional version of Claude to use
   */
  claudeVersion?: string;
}

/**
 * Model mapping between OpenRouter and Anthropic models
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Anthropic model
  'anthropic/claude-3-opus-20240229': 'claude-3-opus-20240229',
  'anthropic/claude-3-sonnet-20240229': 'claude-3-sonnet-20240229',
  'anthropic/claude-3-haiku-20240307': 'claude-3-haiku-20240307',
  'anthropic/claude-2.1': 'claude-2.1',
  'anthropic/claude-2.0': 'claude-2.0',
  'anthropic/claude-instant-1.2': 'claude-instant-1.2',

  // Anthropic model to OpenRouter model ID
  'claude-3-opus-20240229': 'anthropic/claude-3-opus-20240229',
  'claude-3-sonnet-20240229': 'anthropic/claude-3-sonnet-20240229',
  'claude-3-haiku-20240307': 'anthropic/claude-3-haiku-20240307',
  'claude-2.1': 'anthropic/claude-2.1',
  'claude-2.0': 'anthropic/claude-2.0',
  'claude-instant-1.2': 'anthropic/claude-instant-1.2'
};

/**
 * Anthropic (Claude) provider implementation
 */
export class AnthropicProvider implements Provider {
  readonly name = 'anthropic';
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;
  private claudeVersion: string;
  
  // Add messages property to match the Anthropic client API expected in example files
  public messages = {
    create: async (params: any) => {
      // Convert from Anthropic SDK format to our internal format
      const adaptedRequest: CompletionRequest = {
        model: params.model,
        messages: params.messages || [],
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        top_p: params.top_p,
        top_k: params.top_k,
        stream: params.stream
      };
      
      // Call our existing createChatCompletion method
      return this.createChatCompletion(adaptedRequest);
    }
  };

  /**
   * Create a new Anthropic provider instance
   * 
   * @param config Anthropic configuration options
   */
  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger('info');
    this.claudeVersion = config.claudeVersion || '2023-06-01';

    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': this.claudeVersion,
      ...config.headers
    };
  }

  /**
   * Map OpenRouter model ID to Anthropic model
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns Anthropic model name
   */
  mapToProviderModel(openRouterModelId: string): string {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Anthropic model to OpenRouter model ID
   * 
   * @param anthropicModel Anthropic model name
   * @returns OpenRouter model ID
   */
  mapToOpenRouterModel(anthropicModel: string): string {
    return MODEL_MAPPING[anthropicModel] || anthropicModel;
  }

  /**
   * Convert OpenRouter chat messages to Anthropic format
   * 
   * @param messages OpenRouter chat messages
   * @returns Anthropic format messages
   */
  private convertMessagesToAnthropicFormat(messages: ChatMessage[]): { system?: string; messages: any[] } {
    let systemPrompt: string | undefined;
    const anthropicMessages: any[] = [];
    
    // Extract system message if it's the first one
    if (messages.length > 0 && messages[0].role === 'system') {
      const systemMessage = messages[0];
      if (typeof systemMessage.content === 'string') {
        systemPrompt = systemMessage.content;
      } else {
        // If system message has multiple content parts, convert to text
        systemPrompt = JSON.stringify(systemMessage.content);
      }
      
      // Remove the system message from further processing
      messages = messages.slice(1);
    }
    
    // Convert remaining messages
    for (const message of messages) {
      if (message.role === 'user' || message.role === 'assistant') {
        let content: any;
        
        if (typeof message.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          // For multimodal messages (Claude 3 supports images)
          content = message.content.map(part => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'image_url') {
              // Convert to Claude's media format
              const mediaType = part.image_url?.url?.startsWith('data:') 
                ? 'base64' 
                : 'url';
              
              let source: any = {};
              
              if (mediaType === 'base64') {
                // Extract base64 data
                const match = part.image_url?.url?.match(/^data:image\/\w+;base64,(.+)$/);
                if (match) {
                  source = {
                    type: 'base64',
                    media_type: part.image_url?.url?.substring(5, part.image_url?.url?.indexOf(';')),
                    data: match[1]
                  };
                }
              } else {
                source = {
                  type: 'url',
                  url: part.image_url?.url
                };
              }
              
              return {
                type: 'image',
                source
              };
            }
            
            // Default to text for unknown types
            return { type: 'text', text: JSON.stringify(part) };
          });
        }
        
        anthropicMessages.push({
          role: message.role,
          content
        });
      }
      // Skip tool messages as Claude doesn't have direct equivalent
    }
    
    return {
      system: systemPrompt,
      messages: anthropicMessages
    };
  }
  
  /**
   * Create chat completion with Anthropic Claude
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const anthropicModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/messages`;
    
    const formattedRequest = this.convertMessagesToAnthropicFormat(request.messages);
    
    // Build request payload
    const payload: any = {
      model: anthropicModel,
      messages: formattedRequest.messages,
      max_tokens: request.max_tokens || 1024,
      stream: false
    };
    
    // Add optional parameters
    if (formattedRequest.system) {
      payload.system = formattedRequest.system;
    }
    
    if (request.temperature !== undefined) {
      payload.temperature = request.temperature;
    }
    
    if (request.top_p !== undefined) {
      payload.top_p = request.top_p;
    }
    
    if (request.top_k !== undefined) {
      payload.top_k = request.top_k;
    }
    
    if (request.additional_stop_sequences) {
      payload.stop_sequences = request.additional_stop_sequences;
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
          `Anthropic request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const anthropicResponse = await response.json();
      
      // Convert Anthropic response to OpenRouter format
      const content = anthropicResponse.content || [];
      let responseText = '';
      
      // Extract text content from response
      for (const item of content) {
        if (item.type === 'text') {
          responseText += item.text;
        }
      }
      
      // Estimate token count
      const promptTokens = anthropicResponse.usage?.input_tokens || 0;
      const completionTokens = anthropicResponse.usage?.output_tokens || 0;
      
      return {
        id: anthropicResponse.id || `anthropic-${Date.now()}`,
        model: this.mapToOpenRouterModel(anthropicModel),
        choices: [
          {
            message: {
              role: 'assistant',
              content: responseText
            },
            finish_reason: anthropicResponse.stop_reason || 'stop',
            index: 0
          }
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling Anthropic API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Stream chat completions from Anthropic Claude
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const anthropicModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/messages`;
    
    const formattedRequest = this.convertMessagesToAnthropicFormat(request.messages);
    
    // Build request payload
    const payload: any = {
      model: anthropicModel,
      messages: formattedRequest.messages,
      max_tokens: request.max_tokens || 1024,
      stream: true
    };
    
    // Add optional parameters
    if (formattedRequest.system) {
      payload.system = formattedRequest.system;
    }
    
    if (request.temperature !== undefined) {
      payload.temperature = request.temperature;
    }
    
    if (request.top_p !== undefined) {
      payload.top_p = request.top_p;
    }
    
    if (request.top_k !== undefined) {
      payload.top_k = request.top_k;
    }
    
    if (request.additional_stop_sequences) {
      payload.stop_sequences = request.additional_stop_sequences;
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
          `Anthropic streaming request failed with status ${response.status}`, 
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
      let responseId = `anthropic-${Date.now()}`;
      
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
              
              // Skip ping or other non-content events
              if (!data.type || data.type === 'ping') continue;
              
              // Get stream event data
              if (data.type === 'content_block_delta') {
                const deltaText = data.delta?.text || '';
                
                // Use the message ID if available
                if (data.message_id) {
                  responseId = data.message_id;
                }
                
                yield {
                  id: responseId,
                  model: this.mapToOpenRouterModel(anthropicModel),
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
                // Final message with stop reason
                yield {
                  id: responseId,
                  model: this.mapToOpenRouterModel(anthropicModel),
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
            } catch (e) {
              this.logger.warn('Failed to parse Anthropic stream data:', line);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error streaming from Anthropic API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
}
