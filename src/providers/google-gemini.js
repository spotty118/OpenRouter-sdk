/**
 * Google Gemini Provider Implementation
 * Provides model mapping for routing through OpenRouter
 */

const MODEL_MAPPING = {
  // Gemini models
  'google/gemini-pro': 'gemini-pro',
  'google/gemini-pro-vision': 'gemini-pro-vision',
  'google/gemini-1.5-pro': 'gemini-1.5-pro',
  'google/gemini-1.5-flash': 'gemini-1.5-flash',
  'google/gemini-1.5-pro-vision': 'gemini-1.5-pro-vision',
  'google/gemini-1.0-pro': 'gemini-1.0-pro',
  'google/gemini-2.0-flash': 'gemini-2.0-flash',
  'google/gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
  
  // Reversed mappings
  'gemini-pro': 'google/gemini-pro',
  'gemini-pro-vision': 'google/gemini-pro-vision',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'gemini-1.5-flash': 'google/gemini-1.5-flash',
  'gemini-1.5-pro-vision': 'google/gemini-1.5-pro-vision',
  'gemini-1.0-pro': 'google/gemini-1.0-pro',
  'gemini-2.0-flash': 'google/gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'google/gemini-2.0-flash-lite'
};

export class GeminiProvider {
  constructor() {
    this.name = 'google';
    this.oneAPI = null;
    this.preferredModels = {
      chat: 'gemini-1.5-pro',
      vision: 'gemini-1.5-pro-vision'
    };
  }

  normalizeModel(model) {
    // Remove duplicate google/ prefixes
    const cleaned = model.replace(/^(google\/)+/, '');
    return MODEL_MAPPING[`google/${cleaned}`] || cleaned;
  }

  isConfigured() {
    // Since we're routing through OpenRouter, we just need OneAPI to be initialized
    return !!this.oneAPI;
  }

  createChatCompletion(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletion({
      ...params,
      model: `google/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  createChatCompletionStream(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletionStream({
      ...params,
      model: `google/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  // Gemini doesn't have native embeddings, so we delegate to OpenAI through OpenRouter
  createEmbedding(params) {
    // Forward to OpenRouter through OneAPI with OpenAI embedding model
    return this.oneAPI.createEmbedding({
      ...params,
      model: 'openai/text-embedding-3-small' // Use OpenAI embedding model
    });
  }
}
