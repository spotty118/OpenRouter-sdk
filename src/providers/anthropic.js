/**
 * Anthropic Provider Implementation with OneAPI Integration
 * Provides model mapping for routing through OpenRouter
 */

const MODEL_MAPPING = {
  // Claude 3.7 models (latest)
  'anthropic/claude-3-7-opus': 'claude-3-7-opus-20250215',
  'anthropic/claude-3-7-sonnet': 'claude-3-7-sonnet-20250219',
  'anthropic/claude-3-7-haiku': 'claude-3-7-haiku-20250513',
  
  // Claude 3.5 models
  'anthropic/claude-3-5-opus': 'claude-3-5-opus-20240620',
  'anthropic/claude-3-5-sonnet': 'claude-3-5-sonnet-20240620',
  'anthropic/claude-3-5-haiku': 'claude-3-5-haiku-20240620',
  
  // Claude 3.0 models
  'anthropic/claude-3-opus': 'claude-3-opus-20240229',
  'anthropic/claude-3-sonnet': 'claude-3-sonnet-20240229',
  'anthropic/claude-3-haiku': 'claude-3-haiku-20240307',
  'anthropic/claude-3-opus-beta': 'claude-3-opus-20240229',
  'anthropic/claude-3-sonnet-beta': 'claude-3-sonnet-20240229',
  'anthropic/claude-3-haiku-beta': 'claude-3-haiku-20240307',

  // Claude 2 models
  'anthropic/claude-2': 'claude-2.1',
  'anthropic/claude-2.1': 'claude-2.1',
  'anthropic/claude-2.0': 'claude-2.0',
  'anthropic/claude-instant-1.2': 'claude-instant-1.2',

  // Reversed mappings
  'claude-3-7-opus-20250215': 'anthropic/claude-3-7-opus',
  'claude-3-7-sonnet-20250219': 'anthropic/claude-3-7-sonnet',
  'claude-3-7-haiku-20250513': 'anthropic/claude-3-7-haiku',
  'claude-3-5-opus-20240620': 'anthropic/claude-3-5-opus',
  'claude-3-5-sonnet-20240620': 'anthropic/claude-3-5-sonnet',
  'claude-3-5-haiku-20240620': 'anthropic/claude-3-5-haiku',
  'claude-3-opus-20240229': 'anthropic/claude-3-opus',
  'claude-3-sonnet-20240229': 'anthropic/claude-3-sonnet',
  'claude-3-haiku-20240307': 'anthropic/claude-3-haiku',
  'claude-2.1': 'anthropic/claude-2',
  'claude-2.0': 'anthropic/claude-2.0',
  'claude-instant-1.2': 'anthropic/claude-instant-1.2'
};

export class AnthropicProvider {
  constructor(config = {}) {
    this.name = 'anthropic';
    this.oneAPI = config.oneAPI || null;
    
    if (!this.oneAPI && config.apiKey) {
      // If no oneAPI but we have an apiKey, we're being initialized directly
      this.apiKey = config.apiKey;
    }
  }

  normalizeModel(model) {
    // Remove duplicate anthropic/ prefixes
    const cleaned = model.replace(/^(anthropic\/)+/, '');
    return MODEL_MAPPING[`anthropic/${cleaned}`] || cleaned;
  }

  isConfigured() {
    // Provider is configured if either oneAPI is initialized or we have a direct apiKey
    return !!this.oneAPI || !!this.apiKey;
  }

  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Provider not configured - OneAPI instance required'
        };
      }

      // Get list of available models from our MODEL_MAPPING
      const availableModels = Object.entries(MODEL_MAPPING)
        .filter(([key]) => key.startsWith('anthropic/'))
        .map(([key]) => ({
          id: key,
          name: key.replace('anthropic/', '')
        }));

      return {
        success: true,
        models: availableModels
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to test connection'
      };
    }
  }

  createChatCompletion(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletion({
      ...params,
      model: `anthropic/${this.normalizeModel(params.model)}` // Ensure proper model prefix
    });
  }

  createChatCompletionStream(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletionStream({
      ...params,
      model: `anthropic/${this.normalizeModel(params.model)}` // Ensure proper model prefix
    });
  }
}
