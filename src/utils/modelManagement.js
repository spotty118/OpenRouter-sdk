/**
 * Model Management Utility for OpenRouter SDK
 * 
 * This utility provides functions for working with AI models through OneAPI.
 * It offers model selection, filtering, and parameter management.
 */

import oneapiModule from '../oneapi.js';

/**
 * Model categories for easy filtering
 */
export const MODEL_CATEGORIES = {
  CHAT: 'chat',
  COMPLETION: 'completion',
  EMBEDDING: 'embedding',
  IMAGE: 'image',
  AUDIO: 'audio',
  VISION: 'vision'
};

/**
 * Default recommended models by category
 */
export const DEFAULT_MODELS = {
  [MODEL_CATEGORIES.CHAT]: 'openai/gpt-4-turbo',
  [MODEL_CATEGORIES.COMPLETION]: 'openai/gpt-3.5-turbo-instruct',
  [MODEL_CATEGORIES.EMBEDDING]: 'openai/text-embedding-ada-002',
  [MODEL_CATEGORIES.IMAGE]: 'stability/stable-diffusion-3',
  [MODEL_CATEGORIES.AUDIO]: 'openai/whisper-1',
  [MODEL_CATEGORIES.VISION]: 'openai/gpt-4-vision'
};

/**
 * Model parameter presets for different use cases
 */
export const PARAMETER_PRESETS = {
  CREATIVE: {
    temperature: 0.9,
    topP: 0.95,
    frequencyPenalty: 0.1,
    presencePenalty: 0.6,
    maxTokens: 2000
  },
  BALANCED: {
    temperature: 0.6,
    topP: 0.85,
    frequencyPenalty: 0.2,
    presencePenalty: 0.2,
    maxTokens: 1500
  },
  PRECISE: {
    temperature: 0.2,
    topP: 0.5,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    maxTokens: 1000
  },
  CODING: {
    temperature: 0.1,
    topP: 0.2,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    maxTokens: 2000
  }
};

/**
 * Class for managing AI models and their configurations
 */
export class ModelManager {
  constructor() {
    this.oneAPI = oneapiModule.getOneAPI();
    this.cachedModels = null;
    this.lastModelFetch = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }
  
  /**
   * Get all available models, optionally filtered by category
   * @param {string} category - Optional category to filter by
   * @param {boolean} forceRefresh - Force a refresh of the cached models
   * @returns {Promise<Array>} Array of model objects
   */
  async getModels(category = null, forceRefresh = false) {
    // Check if we need to refresh the cache
    const now = Date.now();
    if (
      forceRefresh || 
      !this.cachedModels || 
      !this.lastModelFetch ||
      (now - this.lastModelFetch) > this.cacheExpiry
    ) {
      try {
        // Fetch models from OneAPI
        const response = await this.oneAPI.listModels();
        this.cachedModels = response.data || [];
        this.lastModelFetch = now;
      } catch (error) {
        console.error('Error fetching models:', error);
        // Return empty array or cached models if available on error
        return this.cachedModels || [];
      }
    }
    
    // Filter by category if specified
    if (category && this.cachedModels) {
      return this.cachedModels.filter(model => {
        // Check if model has the specified category
        return model.category === category || 
               (model.capabilities && model.capabilities.includes(category));
      });
    }
    
    return this.cachedModels || [];
  }
  
  /**
   * Get a recommended model for a specific task
   * @param {string} category - Model category
   * @param {Object} requirements - Any specific requirements
   * @returns {Promise<Object>} Recommended model
   */
  async getRecommendedModel(category, requirements = {}) {
    // Get default model ID for this category
    const defaultModelId = DEFAULT_MODELS[category] || DEFAULT_MODELS[MODEL_CATEGORIES.CHAT];
    
    // Try to get all models
    const allModels = await this.getModels();
    
    // Look for exact match of default model
    const defaultModel = allModels.find(model => model.id === defaultModelId);
    if (defaultModel) {
      return defaultModel;
    }
    
    // Filter models by category
    const categoryModels = await this.getModels(category);
    
    if (categoryModels.length === 0) {
      // If no models found for category, return a reasonable default
      return {
        id: defaultModelId,
        name: defaultModelId.split('/').pop(),
        provider: defaultModelId.split('/')[0], 
        category: category
      };
    }
    
    // Apply additional filtering based on requirements
    let filteredModels = categoryModels;
    
    if (requirements.contextSize) {
      filteredModels = filteredModels.filter(model => 
        !model.contextSize || model.contextSize >= requirements.contextSize
      );
    }
    
    if (requirements.provider) {
      filteredModels = filteredModels.filter(model => 
        model.provider === requirements.provider ||
        model.id.startsWith(requirements.provider + '/')
      );
    }
    
    // Sort by preference
    filteredModels.sort((a, b) => {
      // Prefer models with higher contextSize if available
      if (a.contextSize && b.contextSize) {
        return b.contextSize - a.contextSize;
      }
      
      // Otherwise sort alphabetically by ID
      return a.id.localeCompare(b.id);
    });
    
    // Return the first model or a default fallback
    return filteredModels[0] || {
      id: defaultModelId,
      name: defaultModelId.split('/').pop(),
      provider: defaultModelId.split('/')[0],
      category: category
    };
  }
  
  /**
   * Apply a parameter preset to a configuration object
   * @param {string} presetName - Name of the preset (e.g., 'CREATIVE')
   * @param {Object} baseConfig - Base configuration to extend
   * @returns {Object} Configuration with preset applied
   */
  applyPreset(presetName, baseConfig = {}) {
    const preset = PARAMETER_PRESETS[presetName];
    if (!preset) {
      console.warn(`Preset '${presetName}' not found, using BALANCED`);
      return { ...baseConfig, ...PARAMETER_PRESETS.BALANCED };
    }
    
    return { ...baseConfig, ...preset };
  }
  
  /**
   * Get model cost estimation based on token count
   * @param {string} modelId - Model ID
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {Object} Cost estimation object
   */
  getModelCostEstimate(modelId, inputTokens = 1000, outputTokens = 500) {
    // This is a simplified implementation
    // In a real implementation, this would fetch current pricing data
    
    // Default rates (per 1000 tokens)
    const defaultRates = {
      'openai/gpt-4': { inputRate: 0.03, outputRate: 0.06 },
      'openai/gpt-4-turbo': { inputRate: 0.01, outputRate: 0.03 },
      'openai/gpt-3.5-turbo': { inputRate: 0.0015, outputRate: 0.002 },
      'anthropic/claude-3': { inputRate: 0.0125, outputRate: 0.0375 },
      'default': { inputRate: 0.005, outputRate: 0.015 }
    };
    
    // Find matching rate or use default
    let rate = defaultRates.default;
    
    // Try to match by prefix
    Object.keys(defaultRates).forEach(key => {
      if (modelId.startsWith(key)) {
        rate = defaultRates[key];
      }
    });
    
    // Calculate costs
    const inputCost = (inputTokens / 1000) * rate.inputRate;
    const outputCost = (outputTokens / 1000) * rate.outputRate;
    const totalCost = inputCost + outputCost;
    
    return {
      modelId,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
      currency: 'USD'
    };
  }
}

// Create and export singleton instance
const modelManager = new ModelManager();
export default modelManager;
