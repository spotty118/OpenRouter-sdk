/**
 * Mistral Provider Implementation
 * Provides model mapping for routing through OpenRouter
 */

const MODEL_MAPPING = {
  // Mistral models
  'mistral/mistral-tiny': 'mistral-tiny',
  'mistral/mistral-small': 'mistral-small',
  'mistral/mistral-medium': 'mistral-medium',
  'mistral/mistral-large': 'mistral-large',
  'mistral/mistral-large-2': 'mistral-large-2',
  'mistral/mistral-nemo': 'mistral-nemo',
  'mistral/codestral': 'codestral',
  'mistral/mixtral-8x7b': 'mixtral-8x7b-instruct',
  'mistral/saba': 'mistral-saba',
  'mistral/skyfall-36b-v2': 'thedrummer-skyfall-36b-v2',
  
  // Reversed mappings
  'mistral-tiny': 'mistral/mistral-tiny',
  'mistral-small': 'mistral/mistral-small',
  'mistral-medium': 'mistral/mistral-medium',
  'mistral-large': 'mistral/mistral-large',
  'mistral-large-2': 'mistral/mistral-large-2',
  'mistral-nemo': 'mistral/mistral-nemo',
  'codestral': 'mistral/codestral',
  'mixtral-8x7b-instruct': 'mistral/mixtral-8x7b',
  'mistral-saba': 'mistral/saba',
  'thedrummer-skyfall-36b-v2': 'mistral/skyfall-36b-v2'
};

export class MistralProvider {
  constructor() {
    this.name = 'mistral';
    this.oneAPI = null;
    this.preferredModels = {
      chat: 'mistral-large-2',
      embedding: 'mistral-embed'
    };
  }

  normalizeModel(model) {
    // Remove duplicate mistral/ prefixes
    const cleaned = model.replace(/^(mistral\/)+/, '');
    return MODEL_MAPPING[`mistral/${cleaned}`] || cleaned;
  }

  isConfigured() {
    // Since we're routing through OpenRouter, we just need OneAPI to be initialized
    return !!this.oneAPI;
  }

  createChatCompletion(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletion({
      ...params,
      model: `mistral/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  createChatCompletionStream(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletionStream({
      ...params,
      model: `mistral/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  createEmbedding(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createEmbedding({
      ...params,
      model: `mistral/${params.model || this.preferredModels.embedding}` // Ensure proper model prefix
    });
  }
}
