/**
 * OpenAI Provider Implementation
 * Integrated with OneAPI for unified API access
 */

import oneapiModule from '../oneapi.js';

export class OpenAIProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.organizationId = config.organizationId;
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
    this.preferredModels = {
      chat: 'gpt-4-turbo',
      completion: 'gpt-3.5-turbo-instruct',
      embedding: 'text-embedding-ada-002',
      vision: 'gpt-4-vision'
    };
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured() {
    return !!this.apiKey || this.oneAPI.hasProviderConfig('openai');
  }

  /**
   * Get API key - either from instance or from OneAPI
   * @private
   */
  _getApiKey() {
    // Use instance apiKey if available
    if (this.apiKey) {
      return this.apiKey;
    }
    
    // Otherwise get from OneAPI
    try {
      const config = this.oneAPI.getProviderConfig('openai');
      return config?.apiKey;
    } catch (error) {
      console.error('Error getting OpenAI API key from OneAPI:', error);
      throw new Error('OpenAI API key not configured');
    }
  }

  /**
   * Create a chat completion
   * @param {Object} params - API parameters
   * @returns {Promise<Object>} API response
   */
  async createChatCompletion(params) {
    // Try to use OneAPI first for unified tracking and logging
    try {
      const oneApiParams = {
        provider: 'openai',
        model: params.model || this.preferredModels.chat,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        maxTokens: params.max_tokens || params.maxTokens,
        session: params.session,
        user: params.user,
        options: {
          ...params.options,
          stream: false
        }
      };
      
      return await this.oneAPI.chatCompletion(oneApiParams);
    } catch (oneApiError) {
      console.warn('OneAPI chat completion failed, falling back to direct API call:', oneApiError);
      
      // Fall back to direct API call
      const apiKey = this._getApiKey();
      
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.organizationId) {
        headers['OpenAI-Organization'] = this.organizationId;
      }
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: params.model || this.preferredModels.chat,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || params.maxTokens || 1024,
          user: params.user
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      return await response.json();
    }
  }

  /**
   * Create a streaming chat completion
   * @param {Object} params - API parameters
   * @returns {ReadableStream} Stream of completion chunks
   */
  async createChatCompletionStream(params) {
    // Try to use OneAPI first for unified tracking and logging
    try {
      const oneApiParams = {
        provider: 'openai',
        model: params.model || this.preferredModels.chat,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        maxTokens: params.max_tokens || params.maxTokens,
        session: params.session,
        user: params.user,
        options: {
          ...params.options,
          stream: true
        }
      };
      
      return await this.oneAPI.chatCompletionStream(oneApiParams);
    } catch (oneApiError) {
      console.warn('OneAPI streaming chat completion failed, falling back to direct API call:', oneApiError);
      
      // Fall back to direct API call
      const apiKey = this._getApiKey();
      
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.organizationId) {
        headers['OpenAI-Organization'] = this.organizationId;
      }
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: params.model || this.preferredModels.chat,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || params.maxTokens || 1024,
          stream: true,
          user: params.user
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API stream error: ${response.status} - ${errorData}`);
      }

      return response.body;
    }
  }
  
  /**
   * Create embeddings from text
   * @param {Object} params - API parameters
   * @returns {Promise<Object>} API response with embeddings
   */
  async createEmbeddings(params) {
    // Try OneAPI first
    try {
      const oneApiParams = {
        provider: 'openai',
        model: params.model || this.preferredModels.embedding,
        input: params.input,
        user: params.user
      };
      
      return await this.oneAPI.createEmbeddings(oneApiParams);
    } catch (oneApiError) {
      console.warn('OneAPI embeddings creation failed, falling back to direct API call:', oneApiError);
      
      // Fall back to direct API call
      const apiKey = this._getApiKey();
      
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.organizationId) {
        headers['OpenAI-Organization'] = this.organizationId;
      }
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: params.model || this.preferredModels.embedding,
          input: params.input,
          user: params.user
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API embeddings error: ${response.status} - ${errorData}`);
      }

      return await response.json();
    }
  }
  
  /**
   * Process an image with vision capabilities
   * @param {Object} params - API parameters including image data
   * @returns {Promise<Object>} API response
   */
  async processImageWithVision(params) {
    // Prepare messages with image content
    const messages = params.messages || [
      {
        role: 'user',
        content: [
          { type: 'text', text: params.prompt || 'Describe this image in detail.' },
          { type: 'image_url', image_url: { url: params.imageUrl } }
        ]
      }
    ];
    
    // Try OneAPI first
    try {
      const oneApiParams = {
        provider: 'openai',
        model: params.model || this.preferredModels.vision,
        messages,
        temperature: params.temperature || 0.7,
        maxTokens: params.max_tokens || params.maxTokens,
        user: params.user
      };
      
      return await this.oneAPI.chatCompletion(oneApiParams);
    } catch (oneApiError) {
      console.warn('OneAPI vision processing failed, falling back to direct API call:', oneApiError);
      
      // Fall back to direct API call
      const apiKey = this._getApiKey();
      
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.organizationId) {
        headers['OpenAI-Organization'] = this.organizationId;
      }
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: params.model || this.preferredModels.vision,
          messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || params.maxTokens || 1024,
          user: params.user
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API vision error: ${response.status} - ${errorData}`);
      }

      return await response.json();
    }
  }
}
