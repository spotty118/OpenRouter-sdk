/**
 * Reasoning utilities
 */

/**
 * Reasoning provides utilities for configuring reasoning capabilities
 */
export class Reasoning {
  /**
   * Configure reasoning tokens with specific effort level
   * 
   * @param {string} level - Effort level ('high', 'medium', or 'low')
   * @param {boolean} exclude - Whether to exclude reasoning from the response
   * @returns {Object} Reasoning configuration object
   */
  static setEffort(level, exclude = false) {
    const validLevels = ['high', 'medium', 'low'];
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid effort level: ${level}. Must be one of: ${validLevels.join(', ')}`);
    }
    
    return {
      effort: level,
      exclude
    };
  }

  /**
   * Configure reasoning with specific token limits
   * 
   * @param {number} maxTokens - Maximum tokens to use for reasoning
   * @param {boolean} exclude - Whether to exclude reasoning from the response
   * @returns {Object} Reasoning configuration object
   */
  static withTokenLimit(maxTokens, exclude = false) {
    if (typeof maxTokens !== 'number' || maxTokens <= 0) {
      throw new Error('Max tokens must be a positive number');
    }
    
    return {
      max_tokens: maxTokens,
      exclude
    };
  }

  /**
   * Configure reasoning with specific steps
   * 
   * @param {Array<string>} steps - Array of reasoning step prompts
   * @param {boolean} exclude - Whether to exclude reasoning from the response
   * @returns {Object} Reasoning configuration object
   */
  static withSteps(steps, exclude = false) {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Steps must be a non-empty array');
    }
    
    return {
      steps,
      exclude
    };
  }

  /**
   * Configure reasoning with a specific template
   * 
   * @param {string} template - The reasoning template
   * @param {boolean} exclude - Whether to exclude reasoning from the response
   * @returns {Object} Reasoning configuration object
   */
  static withTemplate(template, exclude = false) {
    if (!template || typeof template !== 'string') {
      throw new Error('Template must be a non-empty string');
    }
    
    return {
      template,
      exclude
    };
  }

  /**
   * Disable reasoning
   * 
   * @returns {Object} Reasoning configuration object
   */
  static disable() {
    return {
      enabled: false
    };
  }

  /**
   * Enable reasoning with default settings
   * 
   * @returns {Object} Reasoning configuration object
   */
  static enable() {
    return {
      enabled: true
    };
  }
}

export default Reasoning;
