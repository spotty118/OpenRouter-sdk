/**
 * Provider Factory for OpenRouter SDK
 * 
 * This factory creates and manages provider instances through OneAPI.
 * It provides a unified interface to different AI service providers.
 */

import oneapiModule from '../oneapi.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { MistralProvider } from './mistral.js';
import { GeminiProvider } from './google-gemini.js';
import { TogetherProvider } from './together.js';

// Provider type enumeration
export const PROVIDER_TYPES = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  MISTRAL: 'mistral',
  GOOGLE: 'google',
  TOGETHER: 'together',
  AUTO: 'auto' // Automatically selects the best provider
};

/**
 * Provider Factory class
 */
export class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.oneAPI = oneapiModule.getOneAPI();
    this.defaultProvider = PROVIDER_TYPES.AUTO;
  }
  
  /**
   * Get a provider instance
   * @param {string} providerType - Type of provider to get
   * @param {Object} config - Provider configuration
   * @returns {Object} Provider instance
   */
  getProvider(providerType = this.defaultProvider, config = {}) {
    // If requesting AUTO, determine the best provider based on OneAPI
    if (providerType === PROVIDER_TYPES.AUTO) {
      // Get the default provider from OneAPI
      providerType = this._determineDefaultProvider();
    }
    
    // Check if we already have an instance for this provider
    const existingProvider = this.providers.get(providerType);
    if (existingProvider) {
      return existingProvider;
    }
    
    // Create a new provider instance
    const provider = this._createProvider(providerType, config);
    if (provider) {
      this.providers.set(providerType, provider);
    }
    
    return provider;
  }
  
  /**
   * Create a new provider instance
   * @private
   */
  _createProvider(providerType, config) {
    // Get config from OneAPI if not provided
    const finalConfig = config || this.oneAPI.getProviderConfig(providerType);
    
    switch (providerType.toLowerCase()) {
      case PROVIDER_TYPES.OPENAI:
        return new OpenAIProvider(finalConfig);
        
      case PROVIDER_TYPES.ANTHROPIC:
        return new AnthropicProvider(finalConfig);
        
      case PROVIDER_TYPES.MISTRAL:
        return new MistralProvider(finalConfig);
        
      case PROVIDER_TYPES.GOOGLE:
        return new GeminiProvider(finalConfig);
        
      case PROVIDER_TYPES.TOGETHER:
        return new TogetherProvider(finalConfig);
        
      default:
        console.warn(`Unknown provider type: ${providerType}, using OpenAI as fallback`);
        return new OpenAIProvider(finalConfig);
    }
  }
  
  /**
   * Determine the best default provider based on OneAPI and available credentials
   * @private
   */
  _determineDefaultProvider() {
    try {
      // Get provider preference from OneAPI
      const preferredProvider = this.oneAPI.getPreferredProvider();
      if (preferredProvider) {
        return preferredProvider;
      }
      
      // If no preference, check available providers in priority order
      const providers = [
        PROVIDER_TYPES.OPENAI,
        PROVIDER_TYPES.ANTHROPIC,
        PROVIDER_TYPES.MISTRAL,
        PROVIDER_TYPES.GOOGLE,
        PROVIDER_TYPES.TOGETHER
      ];
      
      for (const provider of providers) {
        const config = this.oneAPI.getProviderConfig(provider);
        if (config && this._isProviderConfigured(provider, config)) {
          return provider;
        }
      }
      
      // Default to OpenAI if nothing else is configured
      return PROVIDER_TYPES.OPENAI;
    } catch (error) {
      console.error('Error determining default provider:', error);
      return PROVIDER_TYPES.OPENAI;
    }
  }
  
  /**
   * Check if a provider is properly configured
   * @private
   */
  _isProviderConfigured(providerType, config) {
    // Create a temporary provider instance to check if it's configured
    const tempProvider = this._createProvider(providerType, config);
    return tempProvider && tempProvider.isConfigured && tempProvider.isConfigured();
  }
  
  /**
   * Get all available configured providers
   * @returns {Array} Array of available provider types
   */
  getAvailableProviders() {
    const availableProviders = [];
    
    for (const provider of Object.values(PROVIDER_TYPES)) {
      if (provider === PROVIDER_TYPES.AUTO) continue;
      
      const config = this.oneAPI.getProviderConfig(provider);
      if (config && this._isProviderConfigured(provider, config)) {
        availableProviders.push(provider);
      }
    }
    
    return availableProviders;
  }
  
  /**
   * Execute a function across all available providers and collect results
   * @param {Function} callback - Function to execute for each provider
   * @returns {Object} Results mapped by provider
   */
  async executeAcrossProviders(callback) {
    const availableProviders = this.getAvailableProviders();
    const results = {};
    
    for (const providerType of availableProviders) {
      try {
        const provider = this.getProvider(providerType);
        results[providerType] = await callback(provider);
      } catch (error) {
        console.error(`Error executing callback for provider ${providerType}:`, error);
        results[providerType] = { error: error.message };
      }
    }
    
    return results;
  }
}

// Export a singleton instance
const providerFactory = new ProviderFactory();
export default providerFactory;
