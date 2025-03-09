/**
 * Provider Integration Helper
 * 
 * Provides utility functions for working with multiple provider implementations
 * with OpenRouter compatibility.
 */

import { Provider, ProviderType } from '../interfaces/provider.js';
import { ProviderManager } from './provider-manager.js';
import { 
  CompletionRequest, 
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  AudioTranscriptionRequest,
  AudioTranscriptionResponse
} from '../interfaces/index.js';
import { Logger } from './logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * Provider integration helper class
 * 
 * This class helps integrate multiple provider implementations with OpenRouter
 */
export class ProviderIntegration {
  private providerManager: ProviderManager;
  private logger: Logger;
  private useDirectIntegration: boolean;

  /**
   * Create a new Provider Integration helper
   * 
   * @param providerManager Provider manager instance
   * @param logLevel Log level
   * @param useDirectIntegration Whether to use direct provider integration
   */
  constructor(
    providerManager: ProviderManager, 
    logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' = 'info',
    useDirectIntegration: boolean = true
  ) {
    this.providerManager = providerManager;
    this.logger = new Logger(logLevel);
    this.useDirectIntegration = useDirectIntegration;
  }

  /**
   * Find the appropriate provider for a model
   * 
   * @param modelId Model ID
   * @returns Provider that can handle the model, or undefined if not found
   */
  findProviderForModel(modelId: string): Provider | undefined {
    if (!this.useDirectIntegration) {
      return undefined;
    }
    
    return this.providerManager.findProviderForModel(modelId);
  }

  /**
   * Try to send a chat completion request to the appropriate provider
   * 
   * @param request Chat completion request
   * @returns Promise resolving to the chat completion response, or undefined if no provider found
   */
  async tryChatCompletion(
    request: CompletionRequest
  ): Promise<CompletionResponse | undefined> {
    if (!this.useDirectIntegration) {
      return undefined;
    }
    
    const provider = this.findProviderForModel(request.model);
    if (!provider) {
      return undefined;
    }
    
    this.logger.info(`Using direct provider ${provider.name} for model ${request.model}`);
    
    try {
      return await provider.createChatCompletion(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Provider ${provider.name} failed: ${errorMessage}. Falling back to OpenRouter API.`);
      return undefined;
    }
  }

  /**
   * Try to stream chat completions from the appropriate provider
   * 
   * @param request Chat completion request
   * @returns Async generator yielding completion response chunks, or undefined if no provider found
   */
  async tryStreamChatCompletions(
    request: CompletionRequest
  ): Promise<AsyncGenerator<Partial<CompletionResponse>, void, unknown> | undefined> {
    if (!this.useDirectIntegration) {
      return undefined;
    }
    
    const provider = this.findProviderForModel(request.model);
    if (!provider) {
      return undefined;
    }
    
    this.logger.info(`Using direct provider ${provider.name} for streaming model ${request.model}`);
    
    try {
      return provider.streamChatCompletions(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Provider ${provider.name} streaming failed: ${errorMessage}. Falling back to OpenRouter API.`);
      return undefined;
    }
  }

  /**
   * Try to generate embeddings with the appropriate provider
   * 
   * @param request Embedding request
   * @returns Promise resolving to the embedding response, or undefined if no provider found
   */
  async tryCreateEmbedding(
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse | undefined> {
    if (!this.useDirectIntegration) {
      return undefined;
    }
    
    const provider = this.findProviderForModel(request.model);
    if (!provider || !provider.createEmbedding) {
      return undefined;
    }
    
    this.logger.info(`Using direct provider ${provider.name} for embeddings with model ${request.model}`);
    
    try {
      return await provider.createEmbedding(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Provider ${provider.name} embeddings failed: ${errorMessage}. Falling back to OpenRouter API.`);
      return undefined;
    }
  }

  /**
   * Try to generate images with the appropriate provider
   * 
   * @param request Image generation request
   * @returns Promise resolving to the image generation response, or undefined if no provider found
   */
  async tryCreateImage(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse | undefined> {
    if (!this.useDirectIntegration) {
      return undefined;
    }
    
    const provider = this.findProviderForModel(request.model);
    if (!provider || !provider.createImage) {
      return undefined;
    }
    
    this.logger.info(`Using direct provider ${provider.name} for image generation with model ${request.model}`);
    
    try {
      return await provider.createImage(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Provider ${provider.name} image generation failed: ${errorMessage}. Falling back to OpenRouter API.`);
      return undefined;
    }
  }

  /**
   * Try to transcribe audio with the appropriate provider
   * 
   * @param request Audio transcription request
   * @returns Promise resolving to the audio transcription response, or undefined if no provider found
   */
  async tryCreateTranscription(
    request: AudioTranscriptionRequest
  ): Promise<AudioTranscriptionResponse | undefined> {
    if (!this.useDirectIntegration) {
      return undefined;
    }
    
    const provider = this.findProviderForModel(request.model);
    if (!provider || !provider.createTranscription) {
      return undefined;
    }
    
    this.logger.info(`Using direct provider ${provider.name} for audio transcription with model ${request.model}`);
    
    try {
      return await provider.createTranscription(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Provider ${provider.name} audio transcription failed: ${errorMessage}. Falling back to OpenRouter API.`);
      return undefined;
    }
  }

  /**
   * Get provider manager
   * 
   * @returns Provider manager instance
   */
  getProviderManager(): ProviderManager {
    return this.providerManager;
  }

  /**
   * Check if a provider is registered
   * 
   * @param type Provider type
   * @returns True if the provider is registered
   */
  hasProvider(type: ProviderType): boolean {
    return this.providerManager.hasProvider(type);
  }

  /**
   * Get a provider by type
   * 
   * @param type Provider type
   * @returns Provider instance or undefined if not found
   */
  getProvider(type: ProviderType): Provider | undefined {
    return this.providerManager.getProvider(type);
  }

  /**
   * Set direct integration flag
   * 
   * @param useDirectIntegration Whether to use direct provider integration
   */
  setUseDirectIntegration(useDirectIntegration: boolean): void {
    this.useDirectIntegration = useDirectIntegration;
  }

  /**
   * Check if direct integration is enabled
   * 
   * @returns True if direct integration is enabled
   */
  isDirectIntegrationEnabled(): boolean {
    return this.useDirectIntegration;
  }
}
