/**
 * Reasoning tokens utility
 * 
 * This module provides utility functions for configuring reasoning tokens (thinking tokens)
 * in OpenRouter's API. Reasoning tokens provide a transparent look into the step-by-step
 * reasoning process used by the model.
 */

import { ReasoningConfig } from '../interfaces/reasoning';

/**
 * Utility class for working with reasoning tokens
 */
export class Reasoning {
  /**
   * Create a reasoning configuration with specific settings
   * 
   * @param options Reasoning configuration options
   * @returns A reasoning configuration object
   * 
   * @example
   * ```typescript
   * // Create a custom reasoning configuration
   * const reasoning = Reasoning.createConfig({
   *   effort: 'high',
   *   exclude: false
   * });
   * ```
   */
  static createConfig(options: Partial<ReasoningConfig>): ReasoningConfig {
    return {
      ...options
    };
  }

  /**
   * Set the effort level for reasoning
   * 
   * @param level Effort level ('high', 'medium', or 'low')
   * @param exclude Whether to exclude reasoning from the response
   * @returns A reasoning configuration object
   * 
   * @example
   * ```typescript
   * // High reasoning effort
   * const reasoning = Reasoning.setEffort('high');
   * 
   * // Medium reasoning effort, excluded from response
   * const reasoning = Reasoning.setEffort('medium', true);
   * ```
   */
  static setEffort(level: 'high' | 'medium' | 'low', exclude: boolean = false): ReasoningConfig {
    return {
      effort: level,
      exclude
    };
  }

  /**
   * Set the maximum tokens for reasoning
   * 
   * @param maxTokens Maximum number of tokens to use for reasoning
   * @param exclude Whether to exclude reasoning from the response
   * @returns A reasoning configuration object
   * 
   * @example
   * ```typescript
   * // Allocate 2000 tokens for reasoning
   * const reasoning = Reasoning.setMaxTokens(2000);
   * 
   * // Allocate 1000 tokens but exclude from response
   * const reasoning = Reasoning.setMaxTokens(1000, true);
   * ```
   */
  static setMaxTokens(maxTokens: number, exclude: boolean = false): ReasoningConfig {
    return {
      max_tokens: maxTokens,
      exclude
    };
  }

  /**
   * Configure reasoning to be excluded from the response
   * The model will still use reasoning internally, but it won't be returned
   * 
   * @returns A reasoning configuration object with exclude set to true
   * 
   * @example
   * ```typescript
   * // Use reasoning internally but don't return it
   * const reasoning = Reasoning.exclude();
   * ```
   */
  static exclude(): ReasoningConfig {
    return {
      exclude: true
    };
  }
  
  /**
   * Configure high-effort reasoning
   * This will allocate approximately 80% of max_tokens for reasoning
   * 
   * @param exclude Whether to exclude reasoning from the response
   * @returns A reasoning configuration object for high-effort reasoning
   * 
   * @example
   * ```typescript
   * // High effort reasoning
   * const reasoning = Reasoning.highEffort();
   * ```
   */
  static highEffort(exclude: boolean = false): ReasoningConfig {
    return Reasoning.setEffort('high', exclude);
  }
  
  /**
   * Configure medium-effort reasoning
   * This will allocate approximately 50% of max_tokens for reasoning
   * 
   * @param exclude Whether to exclude reasoning from the response
   * @returns A reasoning configuration object for medium-effort reasoning
   * 
   * @example
   * ```typescript
   * // Medium effort reasoning
   * const reasoning = Reasoning.mediumEffort();
   * ```
   */
  static mediumEffort(exclude: boolean = false): ReasoningConfig {
    return Reasoning.setEffort('medium', exclude);
  }
  
  /**
   * Configure low-effort reasoning
   * This will allocate approximately 20% of max_tokens for reasoning
   * 
   * @param exclude Whether to exclude reasoning from the response
   * @returns A reasoning configuration object for low-effort reasoning
   * 
   * @example
   * ```typescript
   * // Low effort reasoning
   * const reasoning = Reasoning.lowEffort();
   * ```
   */
  static lowEffort(exclude: boolean = false): ReasoningConfig {
    return Reasoning.setEffort('low', exclude);
  }

  /**
   * Converts legacy include_reasoning parameter to a reasoning config
   * 
   * @param includeReasoning The legacy include_reasoning boolean
   * @returns A reasoning configuration object
   * 
   * @example
   * ```typescript
   * // Convert legacy parameter
   * const reasoning = Reasoning.fromLegacyParam(true);
   * ```
   */
  static fromLegacyParam(includeReasoning: boolean): ReasoningConfig | undefined {
    if (includeReasoning === undefined) return undefined;
    
    return {
      exclude: !includeReasoning
    };
  }
}