/**
 * OneAPIClient.js
 * Frontend client for interacting with the OneAPI backend services
 */

class OneAPIClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.apiKeys = this.loadSavedApiKeys();
    this.providers = {
      openai: { connected: false, available: false },
      anthropic: { connected: false, available: false },
      google: { connected: false, available: false },
      mistral: { connected: false, available: false },
      together: { connected: false, available: false }
    };
    this.modelsCache = null;
    this.modelsLastFetched = null;
    this.isNode = typeof window === 'undefined';
  }

  /**
   * Load saved API keys from localStorage (browser) or environment variables (Node.js)
   * @returns {Object} Object containing provider API keys
   */
  loadSavedApiKeys() {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Browser environment - use localStorage
      return {
        openaiKey: localStorage.getItem('openai_api_key') || '',
        anthropicKey: localStorage.getItem('anthropic_api_key') || '',
        googleKey: localStorage.getItem('google_api_key') || '',
        mistralKey: localStorage.getItem('mistral_api_key') || '',
        togetherKey: localStorage.getItem('together_api_key') || ''
      };
    } else {
      // Node.js environment - use process.env or empty strings
      const env = typeof process !== 'undefined' && process.env ? process.env : {};
      return {
        openaiKey: env.OPENAI_API_KEY || '',
        anthropicKey: env.ANTHROPIC_API_KEY || '',
        googleKey: env.GOOGLE_API_KEY || '',
        mistralKey: env.MISTRAL_API_KEY || '',
        togetherKey: env.TOGETHER_API_KEY || ''
      };
    }
  }

  /**
   * Save API keys to localStorage (browser) or memory (Node.js)
   * @param {Object} keys Object containing provider API keys
   */
  saveApiKeys(keys) {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Browser environment - use localStorage with consistent naming
      // Save both formats for compatibility
      if (keys.openaiKey) {
        localStorage.setItem('openai_api_key', keys.openaiKey);
        localStorage.setItem('openaiKey', keys.openaiKey);
      }
      if (keys.anthropicKey) {
        localStorage.setItem('anthropic_api_key', keys.anthropicKey);
        localStorage.setItem('anthropicKey', keys.anthropicKey);
      }
      if (keys.googleKey) {
        localStorage.setItem('google_api_key', keys.googleKey);
        localStorage.setItem('googleKey', keys.googleKey);
      }
      if (keys.mistralKey) {
        localStorage.setItem('mistral_api_key', keys.mistralKey);
        localStorage.setItem('mistralKey', keys.mistralKey);
      }
      if (keys.togetherKey) {
        localStorage.setItem('together_api_key', keys.togetherKey);
        localStorage.setItem('togetherKey', keys.togetherKey);
      }
      console.log('API keys saved to localStorage');
    }
    // In both environments, update the in-memory apiKeys
    this.apiKeys = { ...this.apiKeys, ...keys };
  }

  /**
   * Get API status for all providers
   * @returns {Promise<Object>} Promise resolving to API status object
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
      }
      const statusData = await response.json();
      
      // Update internal provider status
      if (statusData && statusData.providers) {
        this.providers = statusData.providers;
      }
      
      return statusData;
    } catch (error) {
      console.error('Error fetching API status:', error);
      throw error;
    }
  }
  
  /**
   * Check the status of configured providers based on API keys
   * @returns {Object} Object containing provider status
   */
  checkStatus() {
    return {
      openai: !!this.apiKeys.openaiKey,
      anthropic: !!this.apiKeys.anthropicKey,
      gemini: !!this.apiKeys.googleKey,
      mistral: !!this.apiKeys.mistralKey,
      together: !!this.apiKeys.togetherKey
    };
  }

  /**
   * Update API keys on the server
   * @param {Object} keys Object containing provider API keys
   * @returns {Promise<Object>} Promise resolving to update result
   */
  async updateApiKeys(keys) {
    try {
      console.log('Updating API keys:', Object.keys(keys));
      
      // Save keys to localStorage first
      this.saveApiKeys(keys);
      
      // Then send to server
      const response = await fetch(`${this.baseUrl}/api/update-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(keys)
      });
      
      if (!response.ok) {
        console.error(`Server returned error status: ${response.status}`);
        throw new Error(`Failed to update API keys: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API key update response:', result);
      
      // Update provider status if returned
      if (result.status && result.status.providers) {
        this.providers = result.status.providers;
        console.log('Updated provider status:', this.providers);
      }
      
      return {
        success: true,
        status: result.status || { 
          providers: this.checkStatus() 
        }
      };
    } catch (error) {
      console.error('Error updating API keys:', error);
      throw error;
    }
  }

  /**
   * List available models across all providers
   * @param {boolean} forceRefresh Force refresh the models cache
   * @returns {Promise<Array>} Promise resolving to array of available models
   */
  async listModels(forceRefresh = false) {
    try {
      // Use cache if available and less than 5 minutes old
      const now = Date.now();
      if (
        !forceRefresh && 
        this.modelsCache && 
        this.modelsLastFetched && 
        (now - this.modelsLastFetched < 5 * 60 * 1000)
      ) {
        return this.modelsCache;
      }
      
      const response = await fetch(`${this.baseUrl}/api/v1/models`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }
      
      const models = await response.json();
      
      // Update cache
      this.modelsCache = models;
      this.modelsLastFetched = now;
      
      return models;
    } catch (error) {
      console.error('Error listing models:', error);
      throw error;
    }
  }

  /**
   * Get SDK functions
   * @returns {Promise<Array>} Promise resolving to array of SDK functions
   */
  async getSdkFunctions() {
    try {
      const response = await fetch(`${this.baseUrl}/api/sdk/functions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch SDK functions: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SDK functions:', error);
      throw error;
    }
  }

  /**
   * Create a chat completion
   * @param {Object} params Chat completion parameters
   * @returns {Promise<Object>} Promise resolving to chat completion result
   */
  async createChatCompletion(params) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Chat completion failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating chat completion:', error);
      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   * @param {Object} params Chat completion parameters
   * @returns {Promise<Response>} Promise resolving to fetch Response object
   */
  async createChatCompletionStream(params) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Stream creation failed: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error creating chat completion stream:', error);
      throw error;
    }
  }

  /**
   * Compare models for the same prompt
   * @param {Object} params Model comparison parameters
   * @returns {Promise<Object>} Promise resolving to comparison results
   */
  async compareModels(params) {
    try {
      const response = await fetch(`${this.baseUrl}/api/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Model comparison failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error comparing models:', error);
      throw error;
    }
  }

  /**
   * Execute an agent
   * @param {string} agentType Type of agent to execute
   * @param {Object} params Agent parameters
   * @returns {Promise<Object>} Promise resolving to agent execution results
   */
  async executeAgent(agentType, params) {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/${agentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Agent execution failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error executing ${agentType} agent:`, error);
      throw error;
    }
  }

  /**
   * Research agent execution
   * @param {Object} params Research parameters
   * @returns {Promise<Object>} Promise resolving to research results
   */
  async executeResearchAgent(params) {
    return this.executeAgent('research', params);
  }

  /**
   * Analysis agent execution
   * @param {Object} params Analysis parameters
   * @returns {Promise<Object>} Promise resolving to analysis results
   */
  async executeAnalysisAgent(params) {
    return this.executeAgent('analysis', params);
  }

  /**
   * Chat agent execution
   * @param {Object} params Chat parameters
   * @returns {Promise<Object>} Promise resolving to chat results
   */
  async executeChatAgent(params) {
    return this.executeAgent('chat', params);
  }

  /**
   * Automation agent execution
   * @param {Object} params Automation parameters
   * @returns {Promise<Object>} Promise resolving to automation results
   */
  async executeAutomationAgent(params) {
    return this.executeAgent('automation', params);
  }

  /**
   * Learning agent execution
   * @param {Object} params Learning parameters
   * @returns {Promise<Object>} Promise resolving to learning results
   */
  async executeLearningAgent(params) {
    return this.executeAgent('learning', params);
  }

  /**
   * Check if a specific provider is connected
   * @param {string} provider Provider name
   * @returns {boolean} True if provider is connected
   */
  isProviderConnected(provider) {
    return this.providers[provider]?.connected || false;
  }

  /**
   * Check if a specific provider is available
   * @param {string} provider Provider name
   * @returns {boolean} True if provider is available
   */
  isProviderAvailable(provider) {
    return this.providers[provider]?.available || false;
  }

  /**
   * Get models from a specific provider
   * @param {string} provider Provider name
   * @returns {Promise<Array>} Promise resolving to array of provider models
   */
  async getProviderModels(provider) {
    const models = await this.listModels();
    return models.filter(model => model.provider === provider);
  }
  
  /**
   * Get metrics data
   * @param {boolean} forceRefresh Force refresh of metrics data
   * @returns {Promise<Object>} Promise resolving to metrics data
   */
  async getMetrics(forceRefresh = false) {
    try {
      // Track when metrics were last fetched to avoid excessive calls
      const now = Date.now();
      if (
        !forceRefresh && 
        this.metricsCache && 
        this.metricsLastFetched && 
        (now - this.metricsLastFetched < 60 * 1000) // Cache for 1 minute
      ) {
        return this.metricsCache;
      }
      
      // Fetch metrics data
      const response = await fetch(`${this.baseUrl}/api/metrics`);
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
      }
      
      const metrics = await response.json();
      
      // Update cache
      this.metricsCache = metrics;
      this.metricsLastFetched = now;
      
      return metrics;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

  /**
   * Get recent operations data
   * @param {number} limit Maximum number of operations to return
   * @returns {Promise<Array>} Promise resolving to recent operations array
   */
  async getRecentOperations(limit = 15) {
    try {
      // Check if our metrics cache has recent operations
      if (this.metricsCache && this.metricsCache.recentOperations) {
        return this.metricsCache.recentOperations.slice(0, limit);
      }
      
      // Otherwise fetch from API
      const response = await fetch(`${this.baseUrl}/api/metrics/operations?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch recent operations: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching recent operations:', error);
      // Return empty array if fetch fails
      return [];
    }
  }

  /**
   * Get error log data
   * @param {number} limit Maximum number of errors to return
   * @returns {Promise<Array>} Promise resolving to errors array
   */
  async getErrors(limit = 10) {
    try {
      // Check if our metrics cache has errors
      if (this.metricsCache && this.metricsCache.errors) {
        return this.metricsCache.errors.slice(0, limit);
      }
      
      // Otherwise fetch from API
      const response = await fetch(`${this.baseUrl}/api/metrics/errors?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch errors: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching error log:', error);
      // Return empty array if fetch fails
      return [];
    }
  }
}

// Export the class
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = OneAPIClient;
} else if (typeof window !== 'undefined') {
  // Make it available in the global scope for browsers
  window.OneAPIClient = OneAPIClient;
}

// ES Module export - needed for dashboard.js
export default OneAPIClient;
