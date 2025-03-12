/**
 * Anthropic Provider Implementation with OneAPI Integration
 * 
 * Enhanced provider with comprehensive metrics tracking and error handling
 */

import oneapiModule from '../oneapi.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import * as logger from '../utils/logger.js';

/**
 * Model mapping between OpenRouter and Anthropic models
 */
const MODEL_MAPPING = {
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

export class AnthropicProvider {
  /**
   * Create a new Anthropic provider instance
   * 
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    this.name = 'anthropic';
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.headers = {
      'x-api-key': this.apiKey,
      'anthropic-version': config.claudeVersion || '2023-06-01',
      'Content-Type': 'application/json'
    };
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = logger.createProviderLogger('anthropic');
    
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
  }

  /**
   * Check if the provider is properly configured
   * 
   * @returns {boolean} True if provider is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }
  
  /**
   * Map OpenRouter model ID to Anthropic model
   * 
   * @param {string} openRouterModelId - OpenRouter model ID
   * @returns {string} Anthropic model name
   */
  mapToProviderModel(openRouterModelId) {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Anthropic model to OpenRouter model ID
   * 
   * @param {string} anthropicModel - Anthropic model name
   * @returns {string} OpenRouter model ID
   */
  mapToOpenRouterModel(anthropicModel) {
    return MODEL_MAPPING[anthropicModel] || anthropicModel;
  }

  /**
   * Create chat completion with Anthropic Claude
   * 
   * @param {Object} params - Completion request parameters
   * @returns {Promise<Object>} Completion response
   */
  async createChatCompletion(params) {
    const anthropicModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/messages`;
    
    // Metrics tracking
    const trackingId = `anthropic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: anthropicModel,
          operation: 'chat_completion',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload
      const payload = {
        model: anthropicModel,
        messages: params.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stop_sequences: params.additional_stop_sequences
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        // Enhanced error handling
        const errorData = await response.json().catch(() => ({
          error: { message: `HTTP error ${response.status}` }
        }));
        
        // Set error for tracking
        errorOccurred = true;
        errorDetails = errorData;
        
        throw new OpenRouterError(
          `Anthropic API error: ${errorData.error?.message || response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      const endTime = Date.now();
      
      // Format response to standard OpenRouter format
      const completionResponse = {
        id: data.id,
        model: this.mapToOpenRouterModel(data.model),
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: data.content[0].text
          },
          finish_reason: data.stop_reason
        }],
        usage: {
          prompt_tokens: Math.ceil(data.usage?.input_tokens) || Math.ceil(params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)),
          completion_tokens: Math.ceil(data.usage?.output_tokens) || Math.ceil(data.content[0].text.length / 4),
          total_tokens: Math.ceil(data.usage?.input_tokens + data.usage?.output_tokens) || Math.ceil((params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0) + data.content[0].text.length / 4))
        }
      };
      
      // Track successful completion
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: anthropicModel,
          operation: 'chat_completion',
          endTime: new Date(),
          duration: endTime - startTime,
          status: 'success',
          metadata: {
            inputTokens: completionResponse.usage.prompt_tokens,
            outputTokens: completionResponse.usage.completion_tokens,
            totalTokens: completionResponse.usage.total_tokens
          }
        });
      }
      
      return completionResponse;
    } catch (error) {
      // Track error
      if (this.oneAPI && this.oneAPI.trackModelCall && errorOccurred) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: anthropicModel,
          operation: 'chat_completion',
          endTime: new Date(),
          duration: Date.now() - startTime,
          status: 'error',
          error: error instanceof Error ? error : String(error),
          metadata: {
            errorType: error instanceof OpenRouterError ? 'api_error' : 'runtime_error',
            statusCode: error instanceof OpenRouterError ? error.statusCode : 500,
            errorDetails: errorDetails
          }
        });
      }
      
      // Re-throw OpenRouterError or wrap other errors
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling Anthropic API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Stream chat completions from Anthropic Claude
   * 
   * @param {Object} params - Completion request parameters
   * @returns {AsyncGenerator} Async generator yielding completion chunks
   */
  async *streamChatCompletions(params) {
    const anthropicModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/messages`;
    
    // Metrics tracking
    const trackingId = `anthropic_stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    let totalOutputTokens = 0;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: anthropicModel,
          operation: 'chat_completion_stream',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload
      const payload = {
        model: anthropicModel,
        messages: params.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stop_sequences: params.additional_stop_sequences,
        stream: true
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        // Enhanced error handling
        const errorData = await response.json().catch(() => ({
          error: { message: `HTTP error ${response.status}` }
        }));
        
        // Set error for tracking
        errorOccurred = true;
        errorDetails = errorData;
        
        throw new OpenRouterError(
          `Anthropic API error: ${errorData.error?.message || response.status}`,
          response.status,
          errorData
        );
      }

      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseId = null;
      let modelName = null;
      
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) {
            continue;
          }
          
          const data = line.slice(6);
          if (data === '[DONE]') {
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            
            // Keep track of response metadata
            if (!responseId && parsed.id) {
              responseId = parsed.id;
            }
            
            if (!modelName && parsed.model) {
              modelName = this.mapToOpenRouterModel(parsed.model);
            }
            
            // Build chunk response in OpenRouter format
            if (parsed.type === 'content_block_delta' || parsed.type === 'content_block_start') {
              const content = parsed.delta?.text || parsed.content?.text || '';
              totalOutputTokens += content.length / 4; // Approximate token count
              
              yield {
                id: responseId,
                model: modelName || this.mapToOpenRouterModel(anthropicModel),
                choices: [{
                  index: 0,
                  delta: {
                    content
                  },
                  finish_reason: parsed.stop_reason
                }],
                usage: {
                  completion_tokens: Math.ceil(totalOutputTokens)
                }
              };
            }
          } catch (e) {
            // Ignore parse errors and continue
            this.logger.warn('Error parsing Anthropic stream data:', e);
          }
        }
      }
      
      // Track successful completion
      const endTime = Date.now();
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        const inputTokens = params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0);
        
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: anthropicModel,
          operation: 'chat_completion_stream',
          endTime: new Date(),
          duration: endTime - startTime,
          status: 'success',
          metadata: {
            inputTokens: Math.ceil(inputTokens),
            outputTokens: Math.ceil(totalOutputTokens),
            totalTokens: Math.ceil(inputTokens + totalOutputTokens)
          }
        });
      }
      
    } catch (error) {
      // Track error
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: anthropicModel,
          operation: 'chat_completion_stream',
          endTime: new Date(),
          duration: Date.now() - startTime,
          status: 'error',
          error: error instanceof Error ? error : String(error),
          metadata: {
            errorType: error instanceof OpenRouterError ? 'api_error' : 'runtime_error',
            statusCode: error instanceof OpenRouterError ? error.statusCode : 500,
            errorDetails: errorDetails
          }
        });
      }
      
      // Re-throw OpenRouterError or wrap other errors
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error streaming from Anthropic API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { originalError: String(error) }
      );
    }
  }
  
  /**
   * Backward compatibility method for existing code
   * 
   * @param {Object} params - Completion request parameters
   * @returns {Object} Stream interface compatible with existing code
   */
  async createChatCompletionStream(params) {
    // Create a readable stream from our streamChatCompletions generator
    const self = this;
    const generator = this.streamChatCompletions(params);
    
    return {
      async next() {
        try {
          const { value, done } = await generator.next();
          
          if (done) {
            return { done: true, value: undefined };
          }
          
          return { done: false, value };
        } catch (error) {
          self.logger.error('Error in stream next:', error);
          throw error;
        }
      },

      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }

  /**
   * Create embeddings for a batch of texts
   * 
   * @param {Object} params - Embedding request parameters
   * @returns {Promise<Object>} Embedding response with vectors
   */
  async createEmbeddings(params) {
    // Anthropic currently doesn't offer a dedicated embeddings API
    // Instead, we'll use OneAPI to delegate to another provider that supports embeddings
    const trackingId = `anthropic_embed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: 'delegated_embedding',
          operation: 'embedding',
          startTime: new Date(),
          metadata: {
            inputCount: Array.isArray(params.input) ? params.input.length : 1,
            delegated: true
          }
        });
      }
      
      // Check if OneAPI has an embeddings provider available
      if (this.oneAPI && this.oneAPI.generateEmbeddings) {
        const result = await this.oneAPI.generateEmbeddings({
          texts: Array.isArray(params.input) ? params.input : [params.input],
          model: params.model || 'text-embedding-3-small',
          dimensions: params.dimensions
        });
        
        // Track successful completion
        const endTime = Date.now();
        if (this.oneAPI && this.oneAPI.trackModelCall) {
          this.oneAPI.trackModelCall({
            trackingId,
            provider: 'anthropic',
            model: 'delegated_embedding',
            operation: 'embedding',
            endTime: new Date(),
            duration: endTime - startTime,
            status: 'success',
            metadata: {
              delegatedProvider: result.provider || 'unknown',
              vectorCount: result.data?.length || 0
            }
          });
        }
        
        // Format response to match OpenRouter embedding format
        return {
          object: 'list',
          data: result.data.map((vector, index) => ({
            object: 'embedding',
            embedding: vector,
            index
          })),
          model: result.model || 'delegated_embedding',
          usage: result.usage || {
            prompt_tokens: 0,
            total_tokens: 0
          }
        };
      }
      
      // If OneAPI embedding is not available, throw error
      throw new OpenRouterError(
        'Anthropic provider does not support direct embeddings and no fallback provider is available',
        501,
        { reason: 'unsupported_operation' }
      );
    } catch (error) {
      // Track error
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'anthropic',
          model: 'delegated_embedding',
          operation: 'embedding',
          endTime: new Date(),
          duration: Date.now() - startTime,
          status: 'error',
          error: error instanceof Error ? error : String(error),
          metadata: {
            errorType: error instanceof OpenRouterError ? 'api_error' : 'runtime_error',
            statusCode: error instanceof OpenRouterError ? error.statusCode : 500
          }
        });
      }
      
      // Re-throw OpenRouterError or wrap other errors
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error generating embeddings: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { originalError: String(error) }
      );
    }
  }
}
