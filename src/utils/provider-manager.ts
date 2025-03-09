/**
 * Provider Manager for managing multiple provider integrations
 * 
 * This class provides a centralized way to manage and use various AI providers
 * with OpenRouter compatibility.
 */

import { Provider, ProviderType, ProviderConfig } from '../interfaces/provider.js';
import { OpenRouterConfig } from '../interfaces/config.js';
import { GeminiProvider, GeminiConfig } from '../providers/google-gemini.js';
import { OpenAIProvider, OpenAIConfig } from '../providers/openai.js';
import { VertexAIProvider, VertexAIConfig } from '../providers/google-vertex.js';
import { AnthropicProvider, AnthropicConfig } from '../providers/anthropic.js';
import { MistralProvider, MistralConfig } from '../providers/mistral.js';
import { TogetherProvider, TogetherConfig } from '../providers/together.js';
import { Logger } from './logger.js';

/**
 * Provider Manager configuration
 */
export interface ProviderManagerConfig {
  /**
   * OpenRouter configuration
   */
  openRouter?: OpenRouterConfig;

  /**
   * OpenAI configuration
   */
  openai?: OpenAIConfig;

  /**
   * Google Gemini configuration
   */
  gemini?: GeminiConfig;

  /**
   * Google Vertex AI configuration
   */
  vertex?: VertexAIConfig;

  /**
   * Anthropic configuration
   */
  anthropic?: AnthropicConfig;

  /**
   * Mistral AI configuration
   */
  mistral?: MistralConfig;

  /**
   * Together AI configuration
   */
  together?: TogetherConfig;

  /**
   * Log level
   */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Provider Manager class for managing multiple provider implementations
 */
export class ProviderManager {
  private providers: Map<string, Provider> = new Map();
  private logger: Logger;

  /**
   * Create a new Provider Manager
   * 
   * @param config Provider manager configuration
   */
  constructor(config: ProviderManagerConfig = {}) {
    this.logger = new Logger(config.logLevel || 'info');
    
    // Initialize configured providers
    if (config.openai?.apiKey) {
      this.registerProvider(ProviderType.OPENAI, config.openai);
    }
    
    if (config.gemini?.apiKey) {
      this.registerProvider(ProviderType.GOOGLE_GEMINI, config.gemini);
    }
    
    if (config.vertex?.apiKey && config.vertex?.projectId) {
      this.registerProvider(ProviderType.GOOGLE_VERTEX, config.vertex);
    }
    
    if (config.anthropic?.apiKey) {
      this.registerProvider(ProviderType.ANTHROPIC, config.anthropic);
    }
    
    if (config.mistral?.apiKey) {
      this.registerProvider(ProviderType.MISTRAL, config.mistral);
    }
    
    if (config.together?.apiKey) {
      this.registerProvider(ProviderType.TOGETHER, config.together);
    }
  }

  /**
   * Register a provider with the manager
   * 
   * @param type Provider type
   * @param config Provider configuration
   * @returns Provider instance
   * 
   * @example
   * ```typescript
   * // Register OpenAI provider
   * providerManager.registerProvider(ProviderType.OPENAI, {
   *   apiKey: 'your-openai-api-key'
   * });
   * 
   * // Register Gemini provider
   * providerManager.registerProvider(ProviderType.GOOGLE_GEMINI, {
   *   apiKey: 'your-gemini-api-key'
   * });
   * 
   * // Register Vertex AI provider
   * providerManager.registerProvider(ProviderType.GOOGLE_VERTEX, {
   *   apiKey: 'your-vertex-api-key',
   *   projectId: 'your-gcp-project-id'
   * });
   * ```
   */
  registerProvider(type: ProviderType, config: ProviderConfig): Provider {
    let provider: Provider;
    
    switch (type) {
      case ProviderType.OPENAI:
        provider = new OpenAIProvider(config as OpenAIConfig);
        break;
      case ProviderType.GOOGLE_GEMINI:
        provider = new GeminiProvider(config as GeminiConfig);
        break;
      case ProviderType.GOOGLE_VERTEX:
        provider = new VertexAIProvider(config as VertexAIConfig);
        break;
      case ProviderType.ANTHROPIC:
        provider = new AnthropicProvider(config as AnthropicConfig);
        break;
      case ProviderType.MISTRAL:
        provider = new MistralProvider(config as MistralConfig);
        break;
      case ProviderType.TOGETHER:
        provider = new TogetherProvider(config as TogetherConfig);
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
    
    this.providers.set(type, provider);
    this.logger.info(`Registered provider: ${type}`);
    
    return provider;
  }

  /**
   * Get a provider by type
   * 
   * @param type Provider type
   * @returns Provider instance or undefined if not registered
   * 
   * @example
   * ```typescript
   * const openaiProvider = providerManager.getProvider(ProviderType.OPENAI);
   * if (openaiProvider) {
   *   const response = await openaiProvider.createChatCompletion({
   *     model: 'openai/gpt-4',
   *     messages: [{ role: 'user', content: 'Hello' }]
   *   });
   * }
   * ```
   */
  getProvider(type: ProviderType): Provider | undefined {
    return this.providers.get(type);
  }

  /**
   * Check if a provider is registered
   * 
   * @param type Provider type
   * @returns True if the provider is registered
   * 
   * @example
   * ```typescript
   * if (providerManager.hasProvider(ProviderType.GOOGLE_GEMINI)) {
   *   console.log('Gemini provider is available');
   * }
   * ```
   */
  hasProvider(type: ProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * Get all registered providers
   * 
   * @returns Map of provider types to provider instances
   * 
   * @example
   * ```typescript
   * const providers = providerManager.getAllProviders();
   * for (const [type, provider] of providers.entries()) {
   *   console.log(`Provider ${type} is ready`);
   * }
   * ```
   */
  getAllProviders(): Map<string, Provider> {
    return this.providers;
  }

  /**
   * Find provider for model
   * 
   * @param modelId Model ID to find provider for
   * @returns Provider that can handle the model, or undefined if not found
   * 
   * @example
   * ```typescript
   * // Find the appropriate provider for a model
   * const provider = providerManager.findProviderForModel('openai/gpt-4');
   * if (provider) {
   *   const response = await provider.createChatCompletion({
   *     model: 'openai/gpt-4',
   *     messages: [{ role: 'user', content: 'Hello' }]
   *   });
   * }
   * ```
   */
  findProviderForModel(modelId: string): Provider | undefined {
    // First check for exact provider match
    if (modelId.startsWith('openai/') && this.hasProvider(ProviderType.OPENAI)) {
      return this.getProvider(ProviderType.OPENAI);
    }
    
    if (modelId.startsWith('google/gemini') && this.hasProvider(ProviderType.GOOGLE_GEMINI)) {
      return this.getProvider(ProviderType.GOOGLE_GEMINI);
    }
    
    if (modelId.startsWith('google-vertex/') && this.hasProvider(ProviderType.GOOGLE_VERTEX)) {
      return this.getProvider(ProviderType.GOOGLE_VERTEX);
    }
    
    if (modelId.startsWith('anthropic/') && this.hasProvider(ProviderType.ANTHROPIC)) {
      return this.getProvider(ProviderType.ANTHROPIC);
    }
    
    if (modelId.startsWith('mistralai/') && this.hasProvider(ProviderType.MISTRAL)) {
      return this.getProvider(ProviderType.MISTRAL);
    }
    
    if ((modelId.startsWith('meta-llama/') || modelId.startsWith('together/')) && 
        this.hasProvider(ProviderType.TOGETHER)) {
      return this.getProvider(ProviderType.TOGETHER);
    }
    
    // Then check if any provider can map this model
    for (const provider of this.providers.values()) {
      const providerModel = provider.mapToProviderModel(modelId);
      if (providerModel && providerModel !== modelId) {
        return provider;
      }
    }
    
    return undefined;
  }
}
