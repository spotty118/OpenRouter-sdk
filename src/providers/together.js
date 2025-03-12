/**
 * Together Provider Implementation
 * 
 * This provider integrates with Together AI's API and tracks metrics through OneAPI.
 */

import oneapiModule from '../oneapi.js';
import * as logger from '../utils/logger.js';

// Define Together model mappings
const MODEL_MAPPING = {
  // OpenRouter model ID to Together model
  'together/llama-3-70b-instruct': 'togethercomputer/llama-3-70b-instruct',
  'together/llama-3-8b-instruct': 'togethercomputer/llama-3-8b-instruct',
  'together/qwen-72b-chat': 'togethercomputer/qwen-72b-chat',
  'together/codellama-70b-instruct': 'togethercomputer/codellama-70b-instruct',
  'together/falcon-180b-chat': 'togethercomputer/falcon-180b-chat',
  
  // Together model to OpenRouter model ID
  'togethercomputer/llama-3-70b-instruct': 'together/llama-3-70b-instruct',
  'togethercomputer/llama-3-8b-instruct': 'together/llama-3-8b-instruct',
  'togethercomputer/qwen-72b-chat': 'together/qwen-72b-chat',
  'togethercomputer/codellama-70b-instruct': 'together/codellama-70b-instruct',
  'togethercomputer/falcon-180b-chat': 'together/falcon-180b-chat'
};

// Custom error class for Together provider
class OpenRouterError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'OpenRouterError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class TogetherProvider {
  /**
   * Create a new Together provider instance
   * 
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    this.name = 'together';
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.together.xyz/v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = logger.createProviderLogger('together');
    
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
   * Map OpenRouter model ID to Together model
   * 
   * @param {string} openRouterModelId - OpenRouter model ID
   * @returns {string} Together model name
   */
  mapToProviderModel(openRouterModelId) {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Together model to OpenRouter model ID
   * 
   * @param {string} togetherModel - Together model name
   * @returns {string} OpenRouter model ID
   */
  mapToOpenRouterModel(togetherModel) {
    return MODEL_MAPPING[togetherModel] || togetherModel;
  }

  /**
   * Create chat completion with Together
   * 
   * @param {Object} params - Completion request parameters
   * @returns {Promise<Object>} Completion response
   */
  async createChatCompletion(params) {
    const togetherModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Metrics tracking
    const trackingId = `together_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'together',
          model: togetherModel,
          operation: 'chat_completion',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload
      const payload = {
        model: togetherModel,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        top_k: params.top_k,
        request_type: 'language-model-inference'
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
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
          `Together API error: ${errorData.error?.message || response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      const endTime = Date.now();
      
      // Format response to standard OpenRouter format if needed
      // Together API already follows OpenAI format mostly, but ensure fields are consistent
      const completionResponse = {
        ...data,
        model: this.mapToOpenRouterModel(data.model || togetherModel),
      };
      
      // Track successful completion
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'together',
          model: togetherModel,
          operation: 'chat_completion',
          endTime: new Date(),
          duration: endTime - startTime,
          status: 'success',
          metadata: {
            inputTokens: completionResponse.usage?.prompt_tokens || Math.ceil(params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)),
            outputTokens: completionResponse.usage?.completion_tokens || 0,
            totalTokens: completionResponse.usage?.total_tokens || 0
          }
        });
      }
      
      return completionResponse;
    } catch (error) {
      // Track error
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'together',
          model: togetherModel,
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
        `Error calling Together API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Stream chat completions from Together API
   * 
   * @param {Object} params - Completion request parameters
   * @returns {AsyncGenerator} Async generator yielding completion chunks
   */
  async *streamChatCompletions(params) {
    const togetherModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/chat/completions`;
    
    // Metrics tracking
    const trackingId = `together_stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    let totalOutputTokens = 0;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'together',
          model: togetherModel,
          operation: 'chat_completion_stream',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload
      const payload = {
        model: togetherModel,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        top_k: params.top_k,
        stream: true,
        request_type: 'language-model-inference'
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
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
          `Together API error: ${errorData.error?.message || response.status}`,
          response.status,
          errorData
        );
      }
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseId = null;
      
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
            
            // Extract response ID if available
            if (!responseId && parsed.id) {
              responseId = parsed.id;
            }
            
            // Build chunk response in OpenRouter format
            if (parsed.choices && parsed.choices.length > 0) {
              const choice = parsed.choices[0];
              const content = choice.delta?.content || '';
              totalOutputTokens += content.length / 4; // Approximate token count
              
              yield {
                id: responseId || `together-${Date.now()}`,
                model: this.mapToOpenRouterModel(parsed.model || togetherModel),
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
            this.logger.warn('Error parsing Together stream data:', e);
          }
        }
      }
      
      // Track successful completion
      const endTime = Date.now();
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        const inputTokens = params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0);
        
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'together',
          model: togetherModel,
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
          provider: 'together',
          model: togetherModel,
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
        `Error streaming from Together API: ${error instanceof Error ? error.message : String(error)}`,
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
    const url = `${this.baseUrl}/embeddings`;
    const trackingId = `together_embed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'together',
          model: params.model || 'togethercomputer/m2-embed-large',
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
        model: params.model || 'togethercomputer/m2-embed-large',
        input
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
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
          `Together API error: ${errorData.error?.message || response.status}`,
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
          provider: 'together',
          model: params.model || 'togethercomputer/m2-embed-large',
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
          provider: 'together',
          model: params.model || 'togethercomputer/m2-embed-large',
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
