/**
 * OneAPI - Unified API Interface for OpenRouter SDK
 * 
 * This module provides a single unified interface to access all provider APIs
 * and SDK functions through a consistent, easy-to-use API.
 */

import { OpenRouter } from './core/open-router.js';
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
    
    // Initialize OpenRouter with API key
    this.openRouter = new OpenRouter({
      apiKey: config.openRouterApiKey || env.OPENROUTER_API_KEY || '',
      defaultModel: config.defaultModel || 'openai/gpt-3.5-turbo',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      logLevel: config.logLevel || 'info',
      enableCaching: config.enableCaching !== false,
      cacheTTL: config.cacheTTL || 60 * 60 * 1000, // Default 1 hour
      rateLimitRPM: config.rateLimitRPM || 0,
      headers: config.headers || {}
    });
    
    // Initialize provider mapping layers with oneAPI reference
    this.providers = {
      openai: new OpenAIProvider({ oneAPI: this }),
      anthropic: new AnthropicProvider({ oneAPI: this }),
      gemini: new GeminiProvider({ oneAPI: this }),
      mistral: new MistralProvider({ oneAPI: this }),
      together: new TogetherProvider({ oneAPI: this })
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
    
    // Initialize metrics
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

  /**
   * Check if all API keys are configured
   * @returns {Object} Status of all providers
   */
  checkStatus() {
    // Check each provider's configuration status individually
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
    // All providers are configured if OpenRouter is configured
    return !!this.openRouter.apiKey;
  }
  
  /**
   * Track a metric for an operation
   * @param {Object} metric - Metric data for the operation
   */
  trackMetric(metric) {
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
    if (!this.metrics || this.metrics.totalRequests === 0) {
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
    try {
      // Get models directly from OpenRouter
      const models = await this.openRouter.listModels();
      return models;
    } catch (error) {
      console.error('Error fetching models from OpenRouter:', error);
      return { data: [] };
    }
  }

  /**
   * Create a chat completion
   * @param {Object} options - Chat completion options
   * @returns {Promise<Object>} Chat completion response
   */
  async createChatCompletion(options) {
    const startTime = Date.now();
    
    try {
      // Forward request to OpenRouter
      const response = await this.openRouter.createChatCompletion({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || options.max_tokens || 1000,
        top_p: options.top_p,
        top_k: options.top_k,
        stream: false,
        transforms: options.transforms,
        additional_stop_sequences: options.additional_stop_sequences,
        response_format: options.response_format,
        seed: options.seed,
        tools: options.tools,
        tool_choice: options.tool_choice,
        frequency_penalty: options.frequency_penalty,
        presence_penalty: options.presence_penalty,
        logit_bias: options.logit_bias,
        repetition_penalty: options.repetition_penalty,
        top_logprobs: options.top_logprobs,
        min_p: options.min_p,
        models: options.models,
        provider: options.provider,
        plugins: options.plugins,
        reasoning: options.reasoning,
        include_reasoning: options.include_reasoning,
        user: options.user
      });
      
      // Track metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'chat_completion',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        tokenUsage: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0
        },
        status: 'success'
      });
      
      return response;
    } catch (error) {
      // Track error metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'chat_completion',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        status: 'error',
        error: {
          message: error.message,
          code: error.code || 'unknown'
        }
      });
      
      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   * @param {Object} options - Chat completion options
   * @returns {AsyncGenerator} Stream of chat completion chunks
   */
  async createChatCompletionStream(options) {
    const startTime = Date.now();
    let totalOutputTokens = 0;
    
    try {
      // Forward request to OpenRouter
      const stream = this.openRouter.createChatCompletionStream({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || options.max_tokens || 1000,
        top_p: options.top_p,
        top_k: options.top_k,
        transforms: options.transforms,
        additional_stop_sequences: options.additional_stop_sequences,
        response_format: options.response_format,
        seed: options.seed,
        tools: options.tools,
        tool_choice: options.tool_choice,
        frequency_penalty: options.frequency_penalty,
        presence_penalty: options.presence_penalty,
        logit_bias: options.logit_bias,
        repetition_penalty: options.repetition_penalty,
        top_logprobs: options.top_logprobs,
        min_p: options.min_p,
        models: options.models,
        provider: options.provider,
        plugins: options.plugins,
        reasoning: options.reasoning,
        include_reasoning: options.include_reasoning,
        user: options.user
      });
      
      // Create a wrapper that tracks metrics
      return {
        async next() {
          try {
            const { value, done } = await stream.next();
            
            if (done) {
              // Track final metrics when stream is done
              const endTime = Date.now();
              const processingTime = endTime - startTime;
              
              this.trackMetric({
                type: 'chat_completion_stream',
                provider: options.model.split('/')[0],
                model: options.model,
                processingTime,
                tokenUsage: {
                  input: 0, // We don't know prompt tokens from stream
                  output: totalOutputTokens
                },
                status: 'success'
              });
              
              return { done: true, value: undefined };
            }
            
            // Estimate tokens from content
            if (value.choices?.[0]?.delta?.content) {
              totalOutputTokens += value.choices[0].delta.content.length / 4;
            }
            
            return { done: false, value };
          } catch (error) {
            // Track error metrics
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            this.trackMetric({
              type: 'chat_completion_stream',
              provider: options.model.split('/')[0],
              model: options.model,
              processingTime,
              status: 'error',
              error: {
                message: error.message,
                code: error.code || 'unknown'
              }
            });
            
            throw error;
          }
        },
        
        [Symbol.asyncIterator]() {
          return this;
        }
      };
    } catch (error) {
      // Track error metrics for initial setup
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'chat_completion_stream',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        status: 'error',
        error: {
          message: error.message,
          code: error.code || 'unknown'
        }
      });
      
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   * @param {Object} options - Embedding options
   * @returns {Promise<Object>} Embedding response
   */
  async createEmbedding(options) {
    const startTime = Date.now();
    
    try {
      // Forward request to OpenRouter
      const response = await this.openRouter.createEmbedding({
        model: options.model,
        input: options.input
      });
      
      // Track metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'embedding',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        tokenUsage: {
          input: response.usage?.prompt_tokens || 0,
          output: 0
        },
        status: 'success'
      });
      
      return response;
    } catch (error) {
      // Track error metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'embedding',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        status: 'error',
        error: {
          message: error.message,
          code: error.code || 'unknown'
        }
      });
      
      throw error;
    }
  }

  /**
   * Generate images using AI
   * @param {Object} options - Image generation options
   * @returns {Promise<Object>} Image generation response
   */
  async createImage(options) {
    const startTime = Date.now();
    
    try {
      // Forward request to OpenRouter
      const response = await this.openRouter.createImage({
        model: options.model,
        prompt: options.prompt,
        n: options.n || 1,
        size: options.size || '1024x1024',
        quality: options.quality,
        style: options.style,
        response_format: options.response_format
      });
      
      // Track metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'image_generation',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        status: 'success'
      });
      
      return response;
    } catch (error) {
      // Track error metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'image_generation',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        status: 'error',
        error: {
          message: error.message,
          code: error.code || 'unknown'
        }
      });
      
      throw error;
    }
  }

  /**
   * Transcribe audio to text
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription response
   */
  async createTranscription(options) {
    const startTime = Date.now();
    
    try {
      // Forward request to OpenRouter
      const response = await this.openRouter.createTranscription({
        model: options.model,
        file: options.file,
        language: options.language,
        prompt: options.prompt,
        response_format: options.response_format,
        temperature: options.temperature,
        timestamp_granularities: options.timestamp_granularities
      });
      
      // Track metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'transcription',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        status: 'success'
      });
      
      return response;
    } catch (error) {
      // Track error metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.trackMetric({
        type: 'transcription',
        provider: options.model.split('/')[0],
        model: options.model,
        processingTime,
        status: 'error',
        error: {
          message: error.message,
          code: error.code || 'unknown'
        }
      });
      
      throw error;
    }
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
    
    // Create a new OpenRouter instance with updated config
    const env = typeof process !== 'undefined' && process.env ? process.env : {};
    
    instance.openRouter = new OpenRouter({
      apiKey: config.openRouterApiKey || env.OPENROUTER_API_KEY || '',
      defaultModel: config.defaultModel || 'openai/gpt-3.5-turbo',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      logLevel: config.logLevel || 'info',
      enableCaching: config.enableCaching !== false,
      cacheTTL: config.cacheTTL || 60 * 60 * 1000, // Default 1 hour
      rateLimitRPM: config.rateLimitRPM || 0,
      headers: config.headers || {}
    });
    
    // Reinitialize providers with their specific configs
    instance.providers = {
      openai: new OpenAIProvider({ oneAPI: instance }),
      anthropic: new AnthropicProvider({ oneAPI: instance }),
      gemini: new GeminiProvider({ oneAPI: instance }),
      mistral: new MistralProvider({ oneAPI: instance }),
      together: new TogetherProvider({ oneAPI: instance })
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
