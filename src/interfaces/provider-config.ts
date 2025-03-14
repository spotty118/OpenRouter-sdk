/**
 * Extended configuration interfaces for providers
 */

import { ProviderConfig } from './provider.js';

/**
 * Anthropic specific rate limiting configuration
 */
export interface AnthropicRateLimitConfig {
  maxRequestsPerMinute?: number;
  maxTokensPerMinute?: number;
  maxConcurrentRequests?: number;
  modelLimits?: {
    [model: string]: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    }
  };
}

/**
 * Extended Anthropic configuration
 */
export interface AnthropicConfig extends ProviderConfig {
  /**
   * Optional version of Claude to use
   */
  claudeVersion?: string;
  
  /**
   * Rate limiting configuration
   */
  rateLimits?: AnthropicRateLimitConfig;
}
