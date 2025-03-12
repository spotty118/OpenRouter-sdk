/**
 * OneAPI - Unified API Interface for OpenRouter SDK
 * 
 * This module provides a single unified interface to access all provider APIs
 * and SDK functions through a consistent, easy-to-use API.
 */

import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/google-gemini.js';
import { MistralProvider } from './providers/mistral.js';
import { TogetherProvider } from './providers/together.js';

// Import agents and special functions
import { ResearchAgent } from './agents/research.js';
import { AnalysisAgent } from './agents/analysis.js';
import { ChatAgent } from './agents/chat.js';
import { AutomationAgent } from './agents/automation.js';
import { LearningAgent } from './agents/learning.js';
import { VectorStore } from './tools/vectorstore.js';
import { LLMRouter } from './tools/llmrouter.js';

/**
 * OneAPI class that provides unified access to all OpenRouter functionality
 */
class OneAPI {
  /**
   * Create a new OneAPI instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Safely access environment variables in Node.js or use empty string in browser
    const env = typeof process !== 'undefined' && process.env ? process.env : {};
    
    // Configure providers with API keys if provided
    this.providers = {
      openai: new OpenAIProvider({
        apiKey: config.openaiApiKey || env.OPENAI_API_KEY || ''
      }),
      anthropic: new AnthropicProvider({
        apiKey: config.anthropicApiKey || env.ANTHROPIC_API_KEY || ''
      }),
      gemini: new GeminiProvider({
        apiKey: config.googleApiKey || env.GOOGLE_API_KEY || ''
      }),
      mistral: new MistralProvider({
        apiKey: config.mistralApiKey || env.MISTRAL_API_KEY || ''
      }),
      together: new TogetherProvider({
        apiKey: config.togetherApiKey || env.TOGETHER_API_KEY || ''
      })
    };

    // Assign this OneAPI instance to each provider to break circular dependency
    Object.values(this.providers).forEach(provider => {
      if (provider) {
        provider.oneAPI = this;
      }
    });

    // Initialize agents
    this.agents = {
      research: new ResearchAgent(),
      analysis: new AnalysisAgent(),
      chat: new ChatAgent(),
      automation: new AutomationAgent(),
      learning: new LearningAgent()
    };
    
    // Assign this OneAPI instance to each agent to break circular dependency
    Object.values(this.agents).forEach(agent => {
      if (agent) {
        agent.oneAPI = this;
      }
    });

    // Initialize tools
    this.tools = {
      vectorStore: new VectorStore(),
      llmRouter: new LLMRouter()
    };
    
    // Assign this OneAPI instance to each tool to break circular dependency
    Object.values(this.tools).forEach(tool => {
      if (tool && tool.oneAPI === null) {
        tool.oneAPI = this;
      }
    });

    // Keep track of the current provider being used
    this.currentProvider = null;
  }

  /**
   * Check if all API keys are configured
   * @returns {Object} Status of all providers
   */
  checkStatus() {
    return {
      openai: this.providers.openai.isConfigured(),
      anthropic: this.providers.anthropic.isConfigured(),
      gemini: this.providers.gemini.isConfigured(),
      mistral: this.providers.mistral.isConfigured(),
      together: this.providers.together.isConfigured()
    };
  }
  
  /**
   * Alias for checkStatus to support the test-metrics.js script
   * @returns {Object} Status of all providers
   */
  checkProviderConfiguration() {
    return this.checkStatus();
  }
  
  /**
   * Check if a specific provider has a valid configuration
   * @param {string} provider - The provider to check
   * @param {string} key - Optional specific key to check
   * @returns {boolean} Whether the provider is configured
   */
  hasProviderConfig(provider, key = null) {
    // If provider isn't valid, return false
    if (!this.providers[provider]) {
      return false;
    }
    
    // Directly check if the provider has an apiKey to avoid circular reference
    if (this.providers[provider].apiKey) {
      return true;
    }
    
    // Safely access environment variables in Node.js, return false in browser
    if (typeof process !== 'undefined' && process.env) {
      // Check environment variables as fallback
      if (provider === 'openai' && process.env.OPENAI_API_KEY) return true;
      if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) return true;
      if (provider === 'gemini' && process.env.GOOGLE_API_KEY) return true;
      if (provider === 'mistral' && process.env.MISTRAL_API_KEY) return true;
      if (provider === 'together' && process.env.TOGETHER_API_KEY) return true;
    }
    
    return false;
  }
  
  /**
   * Track a metric for an operation
   * @param {Object} metric - Metric data for the operation
   */
  trackMetric(metric) {
    // Initialize metrics collection if it doesn't exist
    if (!this.metrics) {
      this.metrics = {
        totalRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTime: 0,
        operations: [],
        errors: [],
        providers: {}
      };
    }
    
    // Increment total metrics
    this.metrics.totalRequests++;
    const inputTokens = metric.tokenUsage?.input || 0;
    const outputTokens = metric.tokenUsage?.output || 0;
    this.metrics.inputTokens += inputTokens;
    this.metrics.outputTokens += outputTokens;
    this.metrics.totalTime += metric.processingTime || 0;
    
    // Track provider-specific metrics
    const provider = metric.provider;
    if (provider) {
      if (!this.metrics.providers[provider]) {
        this.metrics.providers[provider] = {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTime: 0,
          errors: 0
        };
      }
      
      this.metrics.providers[provider].requests++;
      this.metrics.providers[provider].inputTokens += inputTokens;
      this.metrics.providers[provider].outputTokens += outputTokens;
      this.metrics.providers[provider].totalTime += metric.processingTime || 0;
      
      if (metric.status === 'error') {
        this.metrics.providers[provider].errors++;
      }
    }
    
    // Record the operation
    const operation = {
      id: `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: metric.type || 'unknown',
      provider: provider,
      model: metric.model,
      status: metric.status || 'success',
      timestamp: new Date().toISOString(),
      details: {
        inputTokens,
        outputTokens,
        processingTime: metric.processingTime || 0,
        prompt: metric.prompt || null
      }
    };
    
    // Add to operations list (limit to 100 most recent)
    this.metrics.operations.unshift(operation);
    if (this.metrics.operations.length > 100) {
      this.metrics.operations.pop();
    }
    
    // Record error if present
    if (metric.status === 'error' && metric.error) {
      const error = {
        id: `err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        provider: provider,
        type: metric.error.code || 'unknown_error',
        message: metric.error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        resolved: false
      };
      
      // Add to errors list (limit to 50 most recent)
      this.metrics.errors.unshift(error);
      if (this.metrics.errors.length > 50) {
        this.metrics.errors.pop();
      }
    }
    
    // Log the metric for debugging
    console.debug(`Tracked metric for ${provider}/${metric.model}: ${inputTokens} in, ${outputTokens} out`);
  }
  
  /**
   * Get metrics data for the dashboard
   * @returns {Object} Metrics data
   */
  getMetrics() {
    // If no metrics collected yet, return empty metrics
    if (!this.metrics) {
      const defaultProviders = [
        { id: 'openai', requests: 0, inputTokens: 0, outputTokens: 0, avgResponseTime: 0, successRate: 100 },
        { id: 'anthropic', requests: 0, inputTokens: 0, outputTokens: 0, avgResponseTime: 0, successRate: 100 },
        { id: 'google', requests: 0, inputTokens: 0, outputTokens: 0, avgResponseTime: 0, successRate: 100 },
        { id: 'mistral', requests: 0, inputTokens: 0, outputTokens: 0, avgResponseTime: 0, successRate: 100 },
        { id: 'together', requests: 0, inputTokens: 0, outputTokens: 0, avgResponseTime: 0, successRate: 100 }
      ];
      
      return {
        totalRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        avgResponseTime: 0,
        providers: defaultProviders,
        recentOperations: [],
        errors: []
      };
    }
    
    // Calculate average response time
    const avgResponseTime = this.metrics.totalRequests > 0 ? 
      Math.round(this.metrics.totalTime / this.metrics.totalRequests) : 0;
    
    // Format provider-specific metrics
    const providersData = [];
    for (const [id, data] of Object.entries(this.metrics.providers)) {
      const avgProviderResponseTime = data.requests > 0 ? 
        Math.round(data.totalTime / data.requests) : 0;
      const successRate = data.requests > 0 ? 
        ((data.requests - data.errors) / data.requests) * 100 : 100;
        
      providersData.push({
        id,
        requests: data.requests,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        avgResponseTime: avgProviderResponseTime,
        successRate: parseFloat(successRate.toFixed(1))
      });
    }
    
    // Ensure all providers are represented, even if no metrics
    const providerIds = providersData.map(p => p.id);
    ['openai', 'anthropic', 'google', 'mistral', 'together'].forEach(id => {
      if (!providerIds.includes(id)) {
        providersData.push({
          id,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          avgResponseTime: 0,
          successRate: 100
        });
      }
    });
    
    return {
      totalRequests: this.metrics.totalRequests,
      inputTokens: this.metrics.inputTokens,
      outputTokens: this.metrics.outputTokens,
      avgResponseTime,
      providers: providersData,
      recentOperations: this.metrics.operations,
      errors: this.metrics.errors
    };
  }

  /**
   * Get a list of all available models across all providers
   * @returns {Array} List of available models
   */
  async listModels() {
    const models = [];

    // Collect models from all configured providers
    for (const [provider, instance] of Object.entries(this.providers)) {
      if (instance.isConfigured()) {
        try {
          const providerModels = await instance.listModels();
          if (providerModels && Array.isArray(providerModels.data)) {
            // Add provider prefix to model IDs
            const prefixedModels = providerModels.data.map(model => ({
              ...model,
              id: `${provider}/${model.id}`
            }));
            models.push(...prefixedModels);
          }
        } catch (error) {
          console.error(`Error fetching models from ${provider}:`, error);
        }
      }
    }

    return { data: models };
  }

  /**
   * Get provider instance for a given model
   * @param {string} model - Model ID (with provider prefix)
   * @returns {Object} Provider instance and cleaned model ID
   */
  _getProviderForModel(model) {
    const [providerName, modelId] = model.split('/');
    const provider = this.providers[providerName];
    
    if (!provider) {
      throw new Error(`Unknown provider for model: ${model}`);
    }
    
    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerName} is not configured with a valid API key`);
    }
    
    this.currentProvider = provider;
    return { provider, modelId };
  }

  /**
   * Create a chat completion
   * @param {Object} options - Chat completion options
   * @returns {Promise<Object>} Chat completion response
   */
  async createChatCompletion(options) {
    const { model, messages, temperature = 0.7, maxTokens = 1000, ...rest } = options;
    const { provider, modelId } = this._getProviderForModel(model);
    
    return provider.createChatCompletion({
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...rest
    });
  }

  /**
   * Create a streaming chat completion
   * @param {Object} options - Chat completion options
   * @returns {ReadableStream} Stream of chat completion chunks
   */
  async createChatCompletionStream(options) {
    const { model, messages, temperature = 0.7, maxTokens = 1000, ...rest } = options;
    const { provider, modelId } = this._getProviderForModel(model);
    
    return provider.createChatCompletionStream({
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...rest
    });
  }

  /**
   * Generate embeddings for text
   * @param {Object} options - Embedding options
   * @returns {Promise<Object>} Embedding response
   */
  async createEmbedding(options) {
    const { model, input } = options;
    const { provider, modelId } = this._getProviderForModel(model);
    
    return provider.createEmbedding({
      model: modelId,
      input
    });
  }

  /**
   * Generate images using AI
   * @param {Object} options - Image generation options
   * @returns {Promise<Object>} Image generation response
   */
  async createImage(options) {
    const { model, prompt, n = 1, size = '1024x1024', ...rest } = options;
    const { provider, modelId } = this._getProviderForModel(model);
    
    return provider.createImage({
      model: modelId,
      prompt,
      n,
      size,
      ...rest
    });
  }

  /**
   * Transcribe audio to text
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription response
   */
  async createTranscription(options) {
    const { model, file, language, ...rest } = options;
    const { provider, modelId } = this._getProviderForModel(model);
    
    return provider.createTranscription({
      model: modelId,
      file,
      language,
      ...rest
    });
  }

  /**
   * Compare responses from multiple models for the same prompt
   * @param {string} prompt - The prompt to send to all models
   * @param {Array<string>} models - List of model IDs to compare
   * @returns {Promise<Object>} Comparison results
   */
  async compareModels(prompt, models) {
    const results = [];
    
    // Process each model in parallel
    await Promise.all(models.map(async (model) => {
      try {
        const response = await this.createChatCompletion({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          maxTokens: 1000
        });
        
        results.push({
          model,
          content: response.choices[0].message.content,
          error: null
        });
      } catch (error) {
        results.push({
          model,
          content: null,
          error: error.message
        });
      }
    }));
    
    return { results };
  }

  /**
   * Access to agent functionality
   */
  
  /**
   * Perform research on a topic using the research agent
   * @param {Object} options - Research options
   * @returns {Promise<Object>} Research results
   */
  async researchAgent(options) {
    const { topic, depth = 3, format = 'summary' } = options;
    return this.agents.research.execute({ topic, depth, format });
  }
  
  /**
   * Analyze data using the analysis agent
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analysisAgent(options) {
    const { data, metrics, visualize = false } = options;
    return this.agents.analysis.execute({ data, metrics, visualize });
  }
  
  /**
   * Chat with a context-aware agent
   * @param {Object} options - Chat options
   * @returns {Promise<Object>} Chat response
   */
  async chatAgent(options) {
    const { message, context = '', personality = 'helpful' } = options;
    return this.agents.chat.execute({ message, context, personality });
  }
  
  /**
   * Automate a sequence of tasks
   * @param {Object} options - Automation options
   * @returns {Promise<Object>} Automation results
   */
  async automationAgent(options) {
    const { tasks, dependencies = {}, parallel = false } = options;
    return this.agents.automation.execute({ tasks, dependencies, parallel });
  }
  
  /**
   * Use a learning agent that improves over time
   * @param {Object} options - Learning agent options
   * @returns {Promise<Object>} Learning agent results
   */
  async learningAgent(options) {
    const { input, feedback = '', modelPath = '' } = options;
    return this.agents.learning.execute({ input, feedback, modelPath });
  }
  
  /**
   * Access to vector store functionality
   * @param {Object} options - Vector store options
   * @returns {Promise<Object>} Vector store operation results
   */
  async vectorStore(options) {
    const { operation, data, namespace = 'default' } = options;
    return this.tools.vectorStore.execute({ operation, data, namespace });
  }
  
  /**
   * Route LLM requests to appropriate models
   * @param {Object} options - LLM routing options
   * @returns {Promise<Object>} LLM response
   */
  async llmRouter(options) {
    const { prompt, model = 'auto', options: routerOptions = {} } = options;
    return this.tools.llmRouter.execute({ prompt, model, options: routerOptions });
  }
}

// Singleton instance
let instance = null;

/**
 * Get the OneAPI singleton instance
 * @param {Object} config - Configuration options
 * @returns {OneAPI} OneAPI instance
 */
export function getOneAPI(config = {}) {
  if (!instance) {
    instance = new OneAPI(config);
  } else if (Object.keys(config).length > 0) {
    // If configuration provided, update the existing instance
    console.log('Updating OneAPI instance with new configuration');
    
    // Reinitialize providers with new keys
    instance.providers = {
      openai: new OpenAIProvider({
        apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
      }),
      anthropic: new AnthropicProvider({
        apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY
      }),
      gemini: new GeminiProvider({
        apiKey: config.googleApiKey || process.env.GOOGLE_API_KEY
      }),
      mistral: new MistralProvider({
        apiKey: config.mistralApiKey || process.env.MISTRAL_API_KEY
      }),
      together: new TogetherProvider({
        apiKey: config.togetherApiKey || process.env.TOGETHER_API_KEY
      })
    };

    // Reassign this OneAPI instance to each provider
    Object.values(instance.providers).forEach(provider => {
      if (provider) {
        provider.oneAPI = instance;
      }
    });
  }
  
  return instance;
}

/**
 * Reset the OneAPI singleton instance
 * This allows reconfiguration with new API keys
 */
export function resetOneAPI() {
  instance = null;
  console.log('OneAPI instance reset');
}

export default {
  getOneAPI,
  resetOneAPI
};
