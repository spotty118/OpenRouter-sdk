/**
 * Provider capability interfaces
 */

/**
 * Base model capabilities interface
 */
export interface ModelCapabilities {
  /**
   * Vision/image input support
   */
  vision: boolean;

  /**
   * Text embedding support
   */
  embeddings: boolean;

  /**
   * Image generation support
   */
  imageGeneration: boolean;

  /**
   * Function/tool calling support
   */
  toolUse: boolean;

  /**
   * Support for thinking mode (step-by-step reasoning)
   */
  thinking?: boolean;

  /**
   * Supports audio transcription
   */
  audioTranscription?: boolean;

  /**
   * Maximum context length in tokens
   */
  maxTokens?: number;

  /**
   * Supports structured outputs (e.g. JSON)
   */
  structuredOutput?: boolean;
}

/**
 * Provider capabilities configuration
 */
export interface ProviderCapabilities {
  /**
   * Model-specific capabilities
   */
  models: {
    [modelId: string]: ModelCapabilities;
  };

  /**
   * Global rate limits
   */
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    maxConcurrentRequests: number;
  };

  /**
   * Supported content types
   */
  supportedContent: {
    text: boolean;
    images: boolean;
    audio: boolean;
    video: boolean;
  };

  /**
   * Thinking mode configuration if supported
   */
  thinkingMode?: {
    /**
     * Models that support thinking mode
     */
    supportedModels: string[];

    /**
     * Minimum temperature recommended for thinking mode
     */
    minTemperature: number;

    /**
     * Additional thinking mode options
     */
    options?: {
      /**
       * Enable step-by-step reasoning
       */
      stepByStep?: boolean;

      /**
       * Show intermediate thought steps
       */
      showSteps?: boolean;

      /**
       * Maximum steps allowed
       */
      maxSteps?: number;
    };
  };
}

/**
 * Interface for checking provider/model capabilities
 */
export interface CapabilityChecker {
  /**
   * Check if a capability is supported by a model
   */
  hasCapability(modelId: string, capability: keyof ModelCapabilities): boolean;

  /**
   * Get all capabilities for a model
   */
  getModelCapabilities(modelId: string): ModelCapabilities | null;

  /**
   * Get provider-wide capabilities
   */
  getProviderCapabilities(): ProviderCapabilities;

  /**
   * Check if thinking mode is supported for a model
   */
  supportsThinkingMode(modelId: string): boolean;

  /**
   * Get thinking mode configuration if supported
   */
  getThinkingModeConfig?(modelId: string): {
    minTemperature: number;
    options?: {
      stepByStep?: boolean;
      showSteps?: boolean;
      maxSteps?: number;
    };
  } | null;
}
