/**
 * OpenAI Provider Implementation
 * Provides model mapping for routing through OpenRouter
 */

const MODEL_MAPPING = {
  // GPT-4 models
  'openai/gpt-4o': 'gpt-4o-2024-05-13',
  'openai/gpt-4o-mini': 'gpt-4o-mini-2024-07-18',
  'openai/gpt-4-turbo': 'gpt-4-turbo-2024-04-09',
  'openai/gpt-4-vision': 'gpt-4-vision-preview',
  'openai/gpt-4': 'gpt-4-0613',
  
  // GPT-3.5 models
  'openai/gpt-3.5-turbo': 'gpt-3.5-turbo-0125',
  'openai/gpt-3.5-turbo-16k': 'gpt-3.5-turbo-16k-0613',
  
  // Embedding models
  'openai/text-embedding-3-small': 'text-embedding-3-small',
  'openai/text-embedding-3-large': 'text-embedding-3-large',
  'openai/text-embedding-ada-002': 'text-embedding-ada-002',
  
  // Image models
  'openai/dall-e-3': 'dall-e-3',
  'openai/dall-e-2': 'dall-e-2',
  
  // Audio models
  'openai/whisper-1': 'whisper-1',
  
  // Reversed mappings
  'gpt-4o-2024-05-13': 'openai/gpt-4o',
  'gpt-4o-mini-2024-07-18': 'openai/gpt-4o-mini',
  'gpt-4-turbo-2024-04-09': 'openai/gpt-4-turbo',
  'gpt-4-vision-preview': 'openai/gpt-4-vision',
  'gpt-4-0613': 'openai/gpt-4',
  'gpt-3.5-turbo-0125': 'openai/gpt-3.5-turbo',
  'gpt-3.5-turbo-16k-0613': 'openai/gpt-3.5-turbo-16k',
  'text-embedding-3-small': 'openai/text-embedding-3-small',
  'text-embedding-3-large': 'openai/text-embedding-3-large',
  'text-embedding-ada-002': 'openai/text-embedding-ada-002',
  'dall-e-3': 'openai/dall-e-3',
  'dall-e-2': 'openai/dall-e-2',
  'whisper-1': 'openai/whisper-1'
};

export class OpenAIProvider {
  constructor() {
    this.name = 'openai';
    this.oneAPI = null;
    this.preferredModels = {
      chat: 'gpt-4o',
      embedding: 'text-embedding-3-small',
      vision: 'gpt-4-vision',
      image: 'dall-e-3',
      audio: 'whisper-1'
    };
  }

  normalizeModel(model) {
    // Remove duplicate openai/ prefixes
    const cleaned = model.replace(/^(openai\/)+/, '');
    return MODEL_MAPPING[`openai/${cleaned}`] || cleaned;
  }

  isConfigured() {
    // Since we're routing through OpenRouter, we just need OneAPI to be initialized
    return !!this.oneAPI;
  }

  createChatCompletion(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletion({
      ...params,
      model: `openai/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  createChatCompletionStream(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletionStream({
      ...params,
      model: `openai/${params.model || this.preferredModels.chat}` // Ensure proper model prefix
    });
  }

  createEmbedding(params) {
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createEmbedding({
      ...params,
      model: `openai/${params.model || this.preferredModels.embedding}` // Ensure proper model prefix
    });
  }

  processImageWithVision(params) {
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
    
    // Forward to OpenRouter through OneAPI
    return this.oneAPI.createChatCompletion({
      ...params,
      model: `openai/${params.model || this.preferredModels.vision}`, // Ensure proper model prefix
      messages
    });
  }
}
