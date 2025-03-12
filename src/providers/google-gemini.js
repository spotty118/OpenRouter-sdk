/**
 * Google Gemini Provider Implementation
 * 
 * This provider integrates with Google's Gemini API and tracks metrics through OneAPI.
 */

import oneapiModule from '../oneapi.js';
import * as logger from '../utils/logger.js';

// Define Google Gemini model mappings
const MODEL_MAPPING = {
  // OpenRouter model ID to Google model
  'google/gemini-pro': 'gemini-pro',
  'google/gemini-pro-vision': 'gemini-pro-vision',
  'google/gemini-1.5-pro': 'gemini-1.5-pro',
  'google/gemini-1.5-flash': 'gemini-1.5-flash',
  
  // Google model to OpenRouter model ID
  'gemini-pro': 'google/gemini-pro',
  'gemini-pro-vision': 'google/gemini-pro-vision',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'gemini-1.5-flash': 'google/gemini-1.5-flash'
};

// Custom error class for Google provider
class OpenRouterError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'OpenRouterError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class GeminiProvider {
  /**
   * Create a new Google Gemini provider instance
   * 
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    this.name = 'google';
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1/models';
    this.version = config.version || 'v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = logger.createProviderLogger('google');
    
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
   * Map OpenRouter model ID to Google Gemini model
   * 
   * @param {string} openRouterModelId - OpenRouter model ID
   * @returns {string} Google model name
   */
  mapToProviderModel(openRouterModelId) {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Google Gemini model to OpenRouter model ID
   * 
   * @param {string} googleModel - Google model name
   * @returns {string} OpenRouter model ID
   */
  mapToOpenRouterModel(googleModel) {
    return MODEL_MAPPING[googleModel] || googleModel;
  }

  /**
   * Create chat completion with Google Gemini
   * 
   * @param {Object} params - Completion request parameters
   * @returns {Promise<Object>} Completion response
   */
  async createChatCompletion(params) {
    const geminiModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/${geminiModel}:generateContent?key=${this.apiKey}`;
    
    // Metrics tracking
    const trackingId = `google_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'google',
          model: geminiModel,
          operation: 'chat_completion',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload - convert OpenRouter format to Gemini format
      const payload = {
        contents: params.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.max_tokens,
          topP: params.top_p || 0.8,
          topK: params.top_k || 40
        }
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
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
          `Google Gemini API error: ${errorData.error?.message || response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      const endTime = Date.now();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new OpenRouterError(
          'Google Gemini API returned empty response',
          400,
          { data }
        );
      }
      
      // Format response to standard OpenRouter format
      const content = data.candidates[0].content.parts[0].text;
      const completionResponse = {
        id: data.candidates[0].safetyRatings ? `google-${Date.now()}` : data.candidates[0].finishReason,
        model: this.mapToOpenRouterModel(geminiModel),
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content
          },
          finish_reason: data.candidates[0].finishReason
        }],
        usage: {
          prompt_tokens: Math.ceil(params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)),
          completion_tokens: Math.ceil(content.length / 4),
          total_tokens: Math.ceil(params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0) + content.length / 4)
        }
      };
      
      // Track successful completion
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'google',
          model: geminiModel,
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
          provider: 'google',
          model: geminiModel,
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
        `Error calling Google Gemini API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Stream chat completions from Google Gemini
   * 
   * @param {Object} params - Completion request parameters
   * @returns {AsyncGenerator} Async generator yielding completion chunks
   */
  async *streamChatCompletions(params) {
    const geminiModel = this.mapToProviderModel(params.model);
    const url = `${this.baseUrl}/${geminiModel}:streamGenerateContent?key=${this.apiKey}`;
    
    // Metrics tracking
    const trackingId = `google_stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let errorOccurred = false;
    let errorDetails = null;
    let totalOutputTokens = 0;
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'google',
          model: geminiModel,
          operation: 'chat_completion_stream',
          startTime: new Date(),
          metadata: {
            inputTokens: params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0)
          }
        });
      }
      
      // Build request payload - convert OpenRouter format to Gemini format
      const payload = {
        contents: params.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.max_tokens,
          topP: params.top_p || 0.8,
          topK: params.top_k || 40
        }
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
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
          `Google Gemini API error: ${errorData.error?.message || response.status}`,
          response.status,
          errorData
        );
      }
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseId = `google-${Date.now()}`;
      
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
          if (line.trim() === '') {
            continue;
          }
          
          try {
            const data = JSON.parse(line);
            
            if (data.candidates && data.candidates.length > 0) {
              const candidate = data.candidates[0];
              
              if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                const content = candidate.content.parts[0].text || '';
                totalOutputTokens += content.length / 4; // Approximate token count
                
                yield {
                  id: responseId,
                  model: this.mapToOpenRouterModel(geminiModel),
                  choices: [{
                    index: 0,
                    delta: {
                      content
                    },
                    finish_reason: candidate.finishReason
                  }],
                  usage: {
                    completion_tokens: Math.ceil(totalOutputTokens)
                  }
                };
              }
            }
          } catch (e) {
            // Ignore parse errors and continue
            this.logger.warn('Error parsing Google Gemini stream data:', e);
          }
        }
      }
      
      // Track successful completion
      const endTime = Date.now();
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        const inputTokens = params.messages.reduce((count, msg) => count + (msg.content.length / 4), 0);
        
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'google',
          model: geminiModel,
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
          provider: 'google',
          model: geminiModel,
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
        `Error streaming from Google Gemini API: ${error instanceof Error ? error.message : String(error)}`,
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
   * Create embeddings for a batch of texts using OneAPI (Google doesn't offer embeddings API directly)
   * 
   * @param {Object} params - Embedding request parameters
   * @returns {Promise<Object>} Embedding response with vectors
   */
  async createEmbeddings(params) {
    // Google currently doesn't offer a dedicated embeddings API
    // Instead, we'll use OneAPI to delegate to another provider that supports embeddings
    const trackingId = `google_embed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    
    try {
      // Track API call start through OneAPI
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'google',
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
            provider: 'google',
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
        'Google provider does not support direct embeddings and no fallback provider is available',
        501,
        { reason: 'unsupported_operation' }
      );
    } catch (error) {
      // Track error
      if (this.oneAPI && this.oneAPI.trackModelCall) {
        this.oneAPI.trackModelCall({
          trackingId,
          provider: 'google',
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
