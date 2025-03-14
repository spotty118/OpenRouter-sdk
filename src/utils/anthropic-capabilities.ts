/**
 * Capability checking utilities for Anthropic provider
 */
import { CapabilityChecker, ModelCapabilities, ProviderCapabilities } from '../interfaces/provider-capabilities.js';
import { MODEL_CAPABILITIES, RATE_LIMITS, TOKEN_LIMITS } from './anthropic-config.js';

/**
 * Default thinking mode configuration
 */
const DEFAULT_THINKING_CONFIG = {
  minTemperature: 0.5,
  options: {
    stepByStep: true,
    showSteps: true,
    maxSteps: 5
  }
};

/**
 * Capability checker implementation for Anthropic provider
 */
export class AnthropicCapabilityChecker implements CapabilityChecker {
  private readonly supportedModels: Set<string>;

  constructor() {
    this.supportedModels = new Set(Object.keys(MODEL_CAPABILITIES));
  }

  /**
   * Check if a capability is supported by a model
   */
  hasCapability(modelId: string, capability: keyof ModelCapabilities): boolean {
    const baseModelId = modelId.split(':')[0];
    const capabilities = MODEL_CAPABILITIES[baseModelId as keyof typeof MODEL_CAPABILITIES];
    
    if (!capabilities) {
      return false;
    }

    // Special handling for thinking mode
    if (capability === 'thinking') {
      return modelId.includes(':thinking') && Boolean(capabilities.thinking);
    }

    // Handle numeric capabilities like maxTokens
    if (capability === 'maxTokens') {
      return typeof capabilities[capability] === 'number' && capabilities[capability] > 0;
    }

    // Handle boolean capabilities
    return Boolean(capabilities[capability]);
  }

  /**
   * Get all capabilities for a model
   */
  getModelCapabilities(modelId: string): ModelCapabilities | null {
    const baseModelId = modelId.split(':')[0];
    const baseCapabilities = MODEL_CAPABILITIES[baseModelId as keyof typeof MODEL_CAPABILITIES];

    if (!baseCapabilities) {
      return null;
    }

    // For thinking mode variants, modify capabilities
    if (modelId.includes(':thinking')) {
      const thinkingCapabilities: ModelCapabilities = {
        vision: baseCapabilities.vision,
        embeddings: baseCapabilities.embeddings,
        imageGeneration: baseCapabilities.imageGeneration,
        toolUse: baseCapabilities.toolUse,
        thinking: true,
        audioTranscription: false,
        maxTokens: baseCapabilities.maxTokens || TOKEN_LIMITS[baseModelId] || 0,
        structuredOutput: true
      };
      return thinkingCapabilities;
    }

    return {
      vision: baseCapabilities.vision,
      embeddings: baseCapabilities.embeddings,
      imageGeneration: baseCapabilities.imageGeneration,
      toolUse: baseCapabilities.toolUse,
      thinking: Boolean(baseCapabilities.thinking),
      audioTranscription: false,
      maxTokens: baseCapabilities.maxTokens || TOKEN_LIMITS[baseModelId] || 0,
      structuredOutput: Boolean(baseCapabilities.structuredOutput)
    };
  }

  /**
   * Get provider-wide capabilities
   */
  getProviderCapabilities(): ProviderCapabilities {
    return {
      models: MODEL_CAPABILITIES,
      rateLimits: {
        requestsPerMinute: RATE_LIMITS.default.requestsPerMinute,
        tokensPerMinute: RATE_LIMITS.default.tokensPerMinute,
        maxConcurrentRequests: RATE_LIMITS.default.maxConcurrentRequests
      },
      supportedContent: {
        text: true,
        images: true,
        audio: false,
        video: false
      },
      thinkingMode: {
        supportedModels: [
          'anthropic/claude-3.7-sonnet:thinking'
        ],
        minTemperature: DEFAULT_THINKING_CONFIG.minTemperature,
        options: DEFAULT_THINKING_CONFIG.options
      }
    };
  }

  /**
   * Check if thinking mode is supported for a model
   */
  supportsThinkingMode(modelId: string): boolean {
    // Explicit thinking mode variants
    if (modelId.includes(':thinking')) {
      const baseModelId = modelId.split(':')[0];
      const capabilities = MODEL_CAPABILITIES[baseModelId as keyof typeof MODEL_CAPABILITIES];
      return capabilities?.thinking === true;
    }
    return false;
  }

  /**
   * Get thinking mode configuration if supported
   */
  getThinkingModeConfig(modelId: string): {
    minTemperature: number;
    options?: {
      stepByStep?: boolean;
      showSteps?: boolean;
      maxSteps?: number;
    };
  } | null {
    if (!this.supportsThinkingMode(modelId)) {
      return null;
    }

    return {
      minTemperature: DEFAULT_THINKING_CONFIG.minTemperature,
      options: {
        ...DEFAULT_THINKING_CONFIG.options,
        // Model-specific overrides could be added here
        maxSteps: modelId.includes('claude-3.7-sonnet') ? 7 : 5
      }
    };
  }

  /**
   * Helper method to validate model ID
   */
  private validateModelId(modelId: string): string | null {
    const baseModelId = modelId.split(':')[0];
    if (!this.supportedModels.has(baseModelId)) {
      return null;
    }
    return baseModelId;
  }

  /**
   * Helper method to get base capabilities
   */
  private getBaseCapabilities(modelId: string): ModelCapabilities | null {
    const baseModelId = this.validateModelId(modelId);
    if (!baseModelId) {
      return null;
    }
    return MODEL_CAPABILITIES[baseModelId as keyof typeof MODEL_CAPABILITIES] || null;
  }
}

// Export singleton instance
export const anthropicCapabilities = new AnthropicCapabilityChecker();
