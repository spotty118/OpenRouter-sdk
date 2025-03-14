/**
 * Together Provider Implementation
 * Provides model mapping for routing through OpenRouter
 */

const MODEL_MAPPING = {
  // Together models
  'together/llama-3-70b-instruct': 'togethercomputer/llama-3-70b-instruct',
  'together/llama-3-8b-instruct': 'togethercomputer/llama-3-8b-instruct',
  'together/qwen-72b-chat': 'togethercomputer/qwen-72b-chat',
  'together/codellama-70b-instruct': 'togethercomputer/codellama-70b-instruct',
  'together/falcon-180b-chat': 'togethercomputer/falcon-180b-chat',
  'together/yi-34b-chat': 'togethercomputer/yi-34b-chat',
  'together/llama-2-70b-chat': 'togethercomputer/llama-2-70b-chat',
  'together/llama-3.1-tulu-3-405b': 'allenai/tulu-3-405b',
  'together/qwen2.5-32b-instruct': 'qwen/qwen2.5-32b-instruct',
  'together/qwq-32b': 'qwen/qwq-32b',
  
  // Reversed mappings
  'togethercomputer/llama-3-70b-instruct': 'together/llama-3-70b-instruct',
  'togethercomputer/llama-3-8b-instruct': 'together/llama-3-8b-instruct',
  'togethercomputer/qwen-72b-chat': 'together/qwen-72b-chat',
  'togethercomputer/codellama-70b-instruct': 'together/codellama-70b-instruct',
  'togethercomputer/falcon-180b-chat': 'together/falcon-180b-chat',
  'togethercomputer/yi-34b-chat': 'together/yi-34b-chat',
  'togethercomputer/llama-2-70b-chat': 'together/llama-2-70b-chat',
  'allenai/tulu-3-405b': 'together/llama-3.1-tulu-3-405b',
  'qwen/qwen2.5-32b-instruct': 'together/qwen2.5-32b-instruct',
  'qwen/qwq-32b': 'together/qwq-32b'
};

export class TogetherProvider {
  constructor() {
    this.name = 'together';
    this.oneAPI = null;
    this.preferredModels = {
      chat: 'llama-3-70b-instruct',
      embedding: 'm2-embed-large'
    };
  }

  normalizeModel(model) {
    // Remove duplicate together/ prefixes
    const cleaned = model.replace(/^(together\/)+/, '');
    return MODEL_MAPPING[`together/${cleaned}`] || cleaned;
  }

  isConfigured() {
    // Since we're routing through OpenRouter, we just need OneAPI to be initialized
    return !!this.oneAPI;
  }

  createChatCompletion(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletion({
      ...params,
      model: `together/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  createChatCompletionStream(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletionStream({
      ...params,
      model: `together/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  createEmbedding(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createEmbedding({
      ...params,
      model: `together/${params.model || this.preferredModels.embedding}` // Ensure proper model prefix
    });
  }
}
