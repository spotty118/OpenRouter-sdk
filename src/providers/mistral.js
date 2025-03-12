/**
 * Mistral Provider Implementation
 * 
 * This provider integrates with Mistral AI's API and tracks metrics through OneAPI.
 */

import oneapiModule from '../oneapi.js';
import * as logger from '../utils/logger.js';

// Define Mistral model mappings
const MODEL_MAPPING = {
  // OpenRouter model ID to Mistral model
  'mistral/mistral-tiny': 'mistral-tiny',
  'mistral/mistral-small': 'mistral-small',
  'mistral/mistral-medium': 'mistral-medium',
  'mistral/mistral-large': 'mistral-large',
  
  // Mistral model to OpenRouter model ID
  'mistral-tiny': 'mistral/mistral-tiny',
  'mistral-small': 'mistral/mistral-small',
  'mistral-medium': 'mistral/mistral-medium',
  'mistral-large': 'mistral/mistral-large'
};

// Custom error class for Mistral provider
class OpenRouterError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'OpenRouterError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class MistralProvider {
  /**
   * Create a new Mistral provider instance
   * 
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    this.name = 'mistral';
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = logger.createProviderLogger('mistral');
    
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
   * Map OpenRouter model ID to Mistral model
   * 
   * @param {string} openRouterModelId - OpenRouter model ID
   * @returns {string} Mistral model name
   */
  mapToProviderModel(openRouterModelId) {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Mistral model to OpenRouter model ID
   * 
   * @param {string} mistralModel - Mistral model name
   * @returns {string} OpenRouter model ID
   */
  mapToOpenRouterModel(mistralModel) {
    return MODEL_MAPPING[mistralModel] || mistralModel;
  }

  /**
   * Create chat completion with Mistral AI
   * 
   * @param {Object} params - Completion request parameters
   * @returns {Promise<Object>} Completion response
   */
  async createChatCompletion(params) {
    const mistralModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Metrics tracking
    const trackingId = `mistral_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: mistralModel,
          operation: 'chat_completion',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload
      const payload = {
        model: mistralModel,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p
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
          `Mistral API error: ${errorData.error?.message || response.status}`,
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
        choices: data.choices.map((choice, index) => ({
          index,
          message: choice.message,
          finish_reason: choice.finish_reason
        })),
        usage: data.usage || {
          prompt_tokens: Math.ceil(params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)),
          completion_tokens: Math.ceil(data.choices[0].message.content.length / 4),
          total_tokens: Math.ceil(params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0) + data.choices[0].message.content.length / 4)
        }
      };
      
      // Track successful completion
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: mistralModel,
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
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: mistralModel,
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
        `Error calling Mistral API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Stream chat completions from Mistral AI
   * 
   * @param {Object} params - Completion request parameters
   * @returns {AsyncGenerator} Async generator yielding completion chunks
   */
  async *streamChatCompletions(params) {
    const mistralModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Metrics tracking
    const trackingId = `mistral_stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    let totalOutputTokens = 0;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: mistralModel,
          operation: 'chat_completion_stream',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload
      const payload = {
        model: mistralModel,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
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
          `Mistral API error: ${errorData.error?.message || response.status}`,
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
            if (parsed.choices && parsed.choices.length > 0) {
              const choice = parsed.choices[0];
              const content = choice.delta?.content || '';
              totalOutputTokens += content.length / 4; // Approximate token count
              
              yield {
                id: responseId || parsed.id,
                model: modelName || this.mapToOpenRouterModel(mistralModel),
                choices: [{
                  index: 0,
                  delta: {
                    content
                  },
                  finish_reason: choice.finish_reason
                }],
                usage: {
                  completion_tokens: Math.ceil(totalOutputTokens)
                }
              };
            }
          } catch (e) {
            // Ignore parse errors and continue
            this.logger.warn('Error parsing Mistral stream data:', e);
          }
        }
      }
      
      // Track successful completion
      const endTime = Date.now();
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        const inputTokens = params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0);
        
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: mistralModel,
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
          provider: 'mistral',
          model: mistralModel,
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
        `Error streaming from Mistral API: ${error instanceof Error ? error.message : String(error)}`,
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
    // Mistral embeddings API
    const url = `${this.baseUrl}/embeddings`;
    const trackingId = `mistral_embed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: params.model || 'mistral-embed',
          operation: 'embedding',
          startTime: new Date(),
          metadata: {
            inputCount: Array.isArray(params.input) ? params.input.length : 1
          }
        });
      }
      
      // Build request payload
      const input = Array.isArray(params.input) ? params.input : [params.input];
      const payload = {
        model: params.model || 'mistral-embed',
        input
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
          `Mistral API error: ${errorData.error?.message || response.status}`,
          response.status,
          errorData
        );
      }
      
      const data = await response.json();
      const endTime = Date.now();
      
      // Format response to match OpenRouter embedding format
      const embeddingResponse = {
        object: 'list',
        data: data.data.map((item, index) => ({
          object: 'embedding',
          embedding: item.embedding,
          index
        })),
        model: data.model,
        usage: data.usage
      };
      
      // Track successful completion
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: params.model || 'mistral-embed',
          operation: 'embedding',
          endTime: new Date(),
          duration: endTime - startTime,
          status: 'success',
          metadata: {
            inputCount: input.length,
            vectorCount: embeddingResponse.data.length,
            dimensions: embeddingResponse.data[0]?.embedding.length
          }
        });
      }
      
      return embeddingResponse;
    } catch (error) {
      // Track error
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'mistral',
          model: params.model || 'mistral-embed',
          operation: 'embedding',
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
        `Error generating embeddings: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { originalError: String(error) }
      );
    }
  }
}
