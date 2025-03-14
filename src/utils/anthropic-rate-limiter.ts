/**
 * Rate limiting utilities for Anthropic API
 */
import { Logger } from './logger.js';
import { RATE_LIMITS, MODEL_MAPPING } from './anthropic-config.js';

interface RateLimitConfig {
  // RPM limits
  requestsPerMinute: number;
  tokensPerMinute: number;
  
  // Concurrent request limits
  maxConcurrentRequests: number;
  
  // Model-specific limits
  modelLimits: {
    [model: string]: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    }
  };

  // Additional thinking mode configuration
  thinkingModeConfig: {
    requestMultiplier: number;  // Longer processing time for thinking mode
    tokenMultiplier: number;    // More token usage for thinking mode
  };
}

interface RateLimitInfo {
  requests: number;
  tokens: number;
  lastReset: Date;
  activeRequests: number;
}

/**
 * Default thinking mode configuration
 */
const DEFAULT_THINKING_CONFIG = {
  requestMultiplier: 1.5,  // Thinking mode takes ~50% longer
  tokenMultiplier: 1.3     // Uses ~30% more tokens for reasoning
};

/**
 * Default rate limits for Anthropic API
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerMinute: RATE_LIMITS.default.requestsPerMinute,
  tokensPerMinute: RATE_LIMITS.default.tokensPerMinute,
  maxConcurrentRequests: RATE_LIMITS.default.maxConcurrentRequests,
  modelLimits: RATE_LIMITS.models,
  thinkingModeConfig: DEFAULT_THINKING_CONFIG
};

/**
 * Rate limiter for Anthropic API requests
 */
export class AnthropicRateLimiter {
  private config: RateLimitConfig;
  private logger: Logger;
  
  // Track rate limits per model
  private modelStats: Map<string, RateLimitInfo> = new Map();
  
  // Track overall API usage
  private globalStats: RateLimitInfo = {
    requests: 0,
    tokens: 0,
    lastReset: new Date(),
    activeRequests: 0
  };

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      modelLimits: {
        ...DEFAULT_CONFIG.modelLimits,
        ...config?.modelLimits
      },
      thinkingModeConfig: {
        ...DEFAULT_THINKING_CONFIG,
        ...config?.thinkingModeConfig
      }
    };
    
    this.logger = new Logger('info');
    
    // Reset counters every minute
    setInterval(() => this.resetCounters(), 60000);
  }

  /**
   * Check if a request would exceed rate limits
   */
  private checkLimits(modelId: string, tokens: number): { allowed: boolean; retryAfter?: number } {
    const now = new Date();
    const model = MODEL_MAPPING[modelId] || modelId;
    let modelStats = this.modelStats.get(model);

    const isThinkingMode = model.includes(':thinking');
    const thinkingConfig = this.config.thinkingModeConfig;
    
    if (!modelStats) {
      modelStats = {
        requests: 0,
        tokens: 0,
        lastReset: now,
        activeRequests: 0
      };
      this.modelStats.set(model, modelStats);
    }

    // Check concurrent request limit
    if (this.globalStats.activeRequests >= this.config.maxConcurrentRequests) {
      return { allowed: false, retryAfter: 1000 }; // Retry after 1 second
    }

    // Adjust tokens based on thinking mode
    const adjustedTokens = isThinkingMode ? 
      Math.ceil(tokens * thinkingConfig.tokenMultiplier) : 
      tokens;

    // Check global rate limits with defaults
    const requestLimit = this.config.requestsPerMinute;
    const tokenLimit = this.config.tokensPerMinute;

    if (this.globalStats.requests >= requestLimit ||
        this.globalStats.tokens + adjustedTokens >= tokenLimit) {
      const timeUntilReset = 60000 - (now.getTime() - this.globalStats.lastReset.getTime());
      return { allowed: false, retryAfter: Math.max(0, timeUntilReset) };
    }

    // Check model-specific limits
    const baseModelId = model.split(':')[0];
    const modelLimits = this.config.modelLimits;
    const defaultLimits = {
      requestsPerMinute: RATE_LIMITS.default.requestsPerMinute,
      tokensPerMinute: RATE_LIMITS.default.tokensPerMinute
    };
    
    // Safely access model limits with fallback to defaults
    const baseModelLimit = (modelLimits[baseModelId as keyof typeof modelLimits]) || defaultLimits;

    // Apply thinking mode adjustments to limits
    const modelRequestLimit = isThinkingMode ?
      Math.floor(baseModelLimit.requestsPerMinute / thinkingConfig.requestMultiplier) :
      baseModelLimit.requestsPerMinute;

    const modelTokenLimit = isThinkingMode ?
      Math.floor(baseModelLimit.tokensPerMinute / thinkingConfig.tokenMultiplier) :
      baseModelLimit.tokensPerMinute;

    if (modelStats.requests >= modelRequestLimit ||
        modelStats.tokens + adjustedTokens >= modelTokenLimit) {
      const timeUntilReset = 60000 - (now.getTime() - modelStats.lastReset.getTime());
      return { allowed: false, retryAfter: Math.max(0, timeUntilReset) };
    }

    return { allowed: true };
  }
  /**
   * Reset rate limit counters
   */
  private resetCounters(): void {
    const now = new Date();
    
    // Reset global stats
    this.globalStats = {
      ...this.globalStats,
      requests: 0,
      tokens: 0,
      lastReset: now
    };
    
    // Reset model stats
    for (const [model, stats] of this.modelStats.entries()) {
      this.modelStats.set(model, {
        ...stats,
        requests: 0,
        tokens: 0,
        lastReset: now
      });
    }
  }

  /**
   * Acquire rate limit token for a request
   * 
   * @throws Error if rate limit would be exceeded
   */
  async acquire(model: string, tokens: number): Promise<void> {
    const { allowed, retryAfter } = this.checkLimits(model, tokens);
    
    if (!allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter}ms`);
    }

    // Update global stats
    this.globalStats.requests++;
    this.globalStats.tokens += tokens;
    this.globalStats.activeRequests++;

    // Update model stats
    let modelStats = this.modelStats.get(model);
    if (!modelStats) {
      modelStats = {
        requests: 0,
        tokens: 0,
        lastReset: new Date(),
        activeRequests: 0
      };
      this.modelStats.set(model, modelStats);
    }
    
    modelStats.requests++;
    modelStats.tokens += tokens;
    modelStats.activeRequests++;
  }

  /**
   * Release rate limit token after request completion
   */
  release(model: string): void {
    this.globalStats.activeRequests = Math.max(0, this.globalStats.activeRequests - 1);
    
    const modelStats = this.modelStats.get(model);
    if (modelStats) {
      modelStats.activeRequests = Math.max(0, modelStats.activeRequests - 1);
    }
  }

  /**
   * Wait until rate limit allows a request
   * Returns immediately if request would not exceed limits
   */
  async waitForCapacity(model: string, tokens: number): Promise<void> {
    while (true) {
      const { allowed, retryAfter } = this.checkLimits(model, tokens);
      
      if (allowed) {
        return;
      }

      this.logger.debug(
        `Rate limit would be exceeded. Waiting ${retryAfter}ms before retry...`
      );
      
      await new Promise(resolve => setTimeout(resolve, retryAfter));
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(model?: string): {
    requests: number;
    tokens: number;
    activeRequests: number;
    resetIn: number;
  } {
    const now = new Date();
    const globalTimeUntilReset = 60000 - (now.getTime() - this.globalStats.lastReset.getTime());

    if (!model) {
      return {
        requests: this.globalStats.requests,
        tokens: this.globalStats.tokens,
        activeRequests: this.globalStats.activeRequests,
        resetIn: globalTimeUntilReset
      };
    }

    const modelStats = this.modelStats.get(model);
    if (!modelStats) {
      return {
        requests: 0,
        tokens: 0,
        activeRequests: 0,
        resetIn: globalTimeUntilReset
      };
    }

    const modelTimeUntilReset = 60000 - (now.getTime() - modelStats.lastReset.getTime());
    return {
      requests: modelStats.requests,
      tokens: modelStats.tokens,
      activeRequests: modelStats.activeRequests,
      resetIn: modelTimeUntilReset
    };
  }
}
