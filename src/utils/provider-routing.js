/**
 * Provider routing utilities
 */

/**
 * ProviderRouting provides utilities for routing requests to different providers
 */
export class ProviderRouting {
  /**
   * Apply a suffix to a model ID for special capabilities
   * 
   * @param {string} modelId - The model ID
   * @param {string} suffix - The suffix to apply ('nitro', 'floor', or 'online')
   * @returns {string} Model ID with the suffix
   */
  static applyModelSuffix(modelId, suffix) {
    if (!modelId) {
      throw new Error('Model ID is required');
    }
    
    const validSuffixes = ['nitro', 'floor', 'online'];
    if (!validSuffixes.includes(suffix)) {
      throw new Error(`Invalid suffix: ${suffix}. Must be one of: ${validSuffixes.join(', ')}`);
    }
    
    return `${modelId}-${suffix}`;
  }

  /**
   * Create provider routing preferences for specific ordering
   * 
   * @param {Array<string>} providerNames - Array of provider names in order of preference
   * @param {boolean} allowFallbacks - Whether to allow fallbacks to other providers
   * @returns {Object} Provider routing preferences
   */
  static orderProviders(providerNames, allowFallbacks = true) {
    if (!Array.isArray(providerNames) || providerNames.length === 0) {
      throw new Error('Provider names must be a non-empty array');
    }
    
    return {
      type: 'order',
      providers: providerNames,
      allowFallbacks
    };
  }

  /**
   * Create provider routing preferences sorted by price, throughput, or latency
   * 
   * @param {string} sortBy - The attribute to sort providers by
   * @returns {Object} Provider routing preferences
   */
  static sortProviders(sortBy) {
    const validSortAttributes = ['price', 'throughput', 'latency'];
    if (!validSortAttributes.includes(sortBy)) {
      throw new Error(`Invalid sort attribute: ${sortBy}. Must be one of: ${validSortAttributes.join(', ')}`);
    }
    
    return {
      type: 'sort',
      attribute: sortBy
    };
  }

  /**
   * Create provider routing preferences with specific weights
   * 
   * @param {Object} weights - Map of provider names to weights
   * @returns {Object} Provider routing preferences
   */
  static weightProviders(weights) {
    if (!weights || typeof weights !== 'object' || Object.keys(weights).length === 0) {
      throw new Error('Weights must be a non-empty object mapping provider names to weights');
    }
    
    return {
      type: 'weight',
      weights
    };
  }

  /**
   * Create provider routing preferences with specific filters
   * 
   * @param {Function} filterFn - Function that returns true for providers to include
   * @returns {Object} Provider routing preferences
   */
  static filterProviders(filterFn) {
    if (typeof filterFn !== 'function') {
      throw new Error('Filter must be a function');
    }
    
    return {
      type: 'filter',
      filter: filterFn.toString()
    };
  }

  /**
   * Create provider routing preferences with a specific provider
   * 
   * @param {string} providerName - The provider name
   * @returns {Object} Provider routing preferences
   */
  static specificProvider(providerName) {
    if (!providerName || typeof providerName !== 'string') {
      throw new Error('Provider name is required');
    }
    
    return {
      type: 'specific',
      provider: providerName
    };
  }
}

export default ProviderRouting;
