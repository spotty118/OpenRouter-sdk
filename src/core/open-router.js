/**
 * OpenRouter API Integration
 * 
 * This module provides integration with the OpenRouter API, allowing access to
 * multiple AI providers through a single unified interface.
 */

import OpenRouterError from '../errors/openrouter-error.js';

/**
 * OpenRouter class for interacting with the OpenRouter API
 */
export class OpenRouter {
  /**
   * Create a new OpenRouter instance
   * 
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - OpenRouter API key
   * @param {string} config.baseUrl - Base URL for the OpenRouter API
   * @param {number} config.timeout - Request timeout in milliseconds
   * @param {Object} config.defaultParams - Default parameters to include in requests
   */
  constructor(config = {}) {
    // Handle both browser and Node.js environments
    const envApiKey = typeof process !== 'undefined' && process.env ? 
      process.env.OPENROUTER_API_KEY : undefined;
    
    this.apiKey = config.apiKey || envApiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.timeout = config.timeout || 60000;
    this.defaultParams = config.defaultParams || {};
    
    // Validate API key
    if (!this.apiKey) {
      console.warn('OpenRouter API key not provided. Some functionality may be limited.');
    }
  }

  /**
   * Check if the OpenRouter client is properly configured
   * 
   * @returns {boolean} True if configured, false otherwise
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Create headers for OpenRouter API requests
   * 
   * @param {Object} additionalHeaders - Additional headers to include
   * @returns {Object} Headers object
   */
  createHeaders(additionalHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://openrouter-sdk.example.com',
      'X-Title': 'OpenRouter SDK',
      ...additionalHeaders
    };
    
    return headers;
  }

  /**
   * Make a request to the OpenRouter API
   * 
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const headers = this.createHeaders(options.headers);
    const body = options.body ? JSON.stringify(options.body) : undefined;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, options.timeout || this.timeout);
    
    const requestOptions = {
      method,
      headers,
      body,
      signal: controller.signal
    };
    
    try {
      const response = await fetch(url, requestOptions);
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          errorData.error?.message || `OpenRouter API error: ${response.status} ${response.statusText}`,
          response.status,
          errorData
        );
      }
      
      // Parse and return response data
      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new OpenRouterError(
          `OpenRouter request timed out after ${this.timeout}ms`,
          408,
          { originalError: error }
        );
      }
      
      if (error instanceof OpenRouterError) {
        throw error;
      }
      
      // Handle network errors, timeouts, etc.
      throw new OpenRouterError(
        `OpenRouter request failed: ${error.message}`,
        0,
        { originalError: error }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * List available models
   * 
   * @returns {Promise<Object>} List of available models
   */
  async listModels() {
    return this.request('/models');
  }

  /**
   * Create a chat completion
   * 
   * @param {Object} params - Chat completion parameters
   * @returns {Promise<Object>} Chat completion response
   */
  async createChatCompletion(params) {
    const body = {
      ...this.defaultParams,
      ...params
    };
    
    return this.request('/chat/completions', {
      method: 'POST',
      body
    });
  }

  /**
   * Create a streaming chat completion
   * 
   * @param {Object} params - Chat completion parameters
   * @returns {Promise<ReadableStream>} Stream of chat completion chunks
   */
  async createChatCompletionStream(params) {
    const body = {
      ...this.defaultParams,
      ...params,
      stream: true
    };
    
    const url = `${this.baseUrl}/chat/completions`;
    const headers = this.createHeaders();
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          errorData.error?.message || `OpenRouter API error: ${response.status} ${response.statusText}`,
          response.status,
          errorData
        );
      }
      
      return response.body;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new OpenRouterError(
          `OpenRouter streaming request timed out after ${this.timeout}ms`,
          408,
          { originalError: error }
        );
      }
      
      if (error instanceof OpenRouterError) {
        throw error;
      }
      
      throw new OpenRouterError(
        `OpenRouter streaming request failed: ${error.message}`,
        0,
        { originalError: error }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create embeddings
   * 
   * @param {Object} params - Embedding parameters
   * @returns {Promise<Object>} Embedding response
   */
  async createEmbeddings(params) {
    const body = {
      ...this.defaultParams,
      ...params
    };
    
    return this.request('/embeddings', {
      method: 'POST',
      body
    });
  }

  /**
   * Create an image
   * 
   * @param {Object} params - Image generation parameters
   * @returns {Promise<Object>} Image generation response
   */
  async createImage(params) {
    const body = {
      ...this.defaultParams,
      ...params
    };
    
    return this.request('/images/generations', {
      method: 'POST',
      body
    });
  }
}

export default OpenRouter;
