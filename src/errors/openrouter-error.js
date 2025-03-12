/**
 * OpenRouterError - Standardized error class for the OpenRouter SDK
 * Provides consistent error handling with detailed metadata across all providers
 */

export class OpenRouterError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'OpenRouterError';
    
    // Standard error properties
    this.statusCode = options.statusCode || 500;
    this.type = options.type || 'server_error';
    this.code = options.code || 'internal_error';
    this.param = options.param || null;
    
    // Provider-specific information
    this.provider = options.provider || null;
    this.model = options.model || null;
    
    // Request tracking
    this.requestId = options.requestId || null;
    this.timestamp = options.timestamp || new Date().toISOString();
    
    // Metrics and debugging information
    this.inputTokens = options.inputTokens || 0;
    this.outputTokens = options.outputTokens || 0;
    this.latency = options.latency || 0;
    
    // Original error if available
    this.originalError = options.originalError || null;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterError);
    }
  }
  
  /**
   * Creates an error from a provider-specific error
   * @param {Error} error - The original error from the provider
   * @param {Object} metadata - Additional metadata to include
   * @returns {OpenRouterError} - Standardized error with provider details
   */
  static fromProviderError(error, metadata = {}) {
    let message = error.message || 'Unknown provider error';
    let statusCode = 500;
    let type = 'provider_error';
    let code = 'provider_error';
    
    // Handle specific provider error types if known
    if (error.status || error.statusCode) {
      statusCode = error.status || error.statusCode;
    }
    
    // Extract more details if available
    if (error.response && error.response.data) {
      const data = error.response.data;
      if (data.error) {
        message = data.error.message || message;
        type = data.error.type || type;
        code = data.error.code || code;
      }
    }
    
    return new OpenRouterError(message, {
      statusCode,
      type,
      code,
      originalError: error,
      ...metadata
    });
  }
  
  /**
   * Creates a rate limit error
   * @param {Object} metadata - Additional metadata to include
   * @returns {OpenRouterError} - Rate limit error
   */
  static rateLimitError(metadata = {}) {
    return new OpenRouterError('Rate limit exceeded', {
      statusCode: 429,
      type: 'rate_limit_error',
      code: 'rate_limit_exceeded',
      ...metadata
    });
  }
  
  /**
   * Creates an authentication error
   * @param {Object} metadata - Additional metadata to include
   * @returns {OpenRouterError} - Authentication error
   */
  static authError(metadata = {}) {
    return new OpenRouterError('Authentication failed', {
      statusCode: 401,
      type: 'authentication_error',
      code: 'invalid_api_key',
      ...metadata
    });
  }
  
  /**
   * Creates a model not found error
   * @param {string} model - The model that wasn't found
   * @param {Object} metadata - Additional metadata to include
   * @returns {OpenRouterError} - Model not found error
   */
  static modelNotFoundError(model, metadata = {}) {
    return new OpenRouterError(`Model '${model}' not found`, {
      statusCode: 404,
      type: 'model_error',
      code: 'model_not_found',
      param: 'model',
      model,
      ...metadata
    });
  }
  
  /**
   * Creates a model overloaded error
   * @param {string} model - The overloaded model
   * @param {Object} metadata - Additional metadata to include
   * @returns {OpenRouterError} - Model overloaded error
   */
  static modelOverloadedError(model, metadata = {}) {
    return new OpenRouterError(`Model '${model}' is currently overloaded`, {
      statusCode: 503,
      type: 'server_error',
      code: 'model_overloaded',
      model,
      ...metadata
    });
  }
  
  /**
   * Creates a context length error
   * @param {number} maxTokens - The maximum allowed tokens
   * @param {Object} metadata - Additional metadata to include
   * @returns {OpenRouterError} - Context length error
   */
  static contextLengthError(maxTokens, metadata = {}) {
    return new OpenRouterError(`Input exceeds maximum context length of ${maxTokens} tokens`, {
      statusCode: 400,
      type: 'invalid_request_error',
      code: 'context_length_exceeded',
      param: 'messages',
      ...metadata
    });
  }
}

export default OpenRouterError;
