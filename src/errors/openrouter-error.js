/**
 * Custom error class for OpenRouter SDK
 */

/**
 * OpenRouterError represents an error that occurred in the OpenRouter SDK
 */
export class OpenRouterError extends Error {
  /**
   * Create a new OpenRouterError
   * 
   * @param {string} message - Error message
   * @param {number} status - HTTP status code (if applicable)
   * @param {Object} data - Additional error data
   */
  constructor(message, status = 0, data = null) {
    super(message);
    
    this.name = 'OpenRouterError';
    this.status = status;
    this.data = data;
    this.code = data?.error?.code || data?.code || 'unknown_error';
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterError);
    }
  }

  /**
   * Get a string representation of the error
   * 
   * @returns {string} String representation
   */
  toString() {
    let result = `${this.name}: ${this.message}`;
    
    if (this.status) {
      result += ` (Status: ${this.status})`;
    }
    
    if (this.code && this.code !== 'unknown_error') {
      result += ` [${this.code}]`;
    }
    
    return result;
  }

  /**
   * Convert the error to a plain object
   * 
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      data: this.data
    };
  }

  /**
   * Create an error from an API response
   * 
   * @param {Object} response - API response
   * @returns {OpenRouterError} New error instance
   */
  static fromResponse(response) {
    const status = response.status || 0;
    const data = response.data || null;
    const message = data?.error?.message || data?.message || response.statusText || 'Unknown error';
    
    return new OpenRouterError(message, status, data);
  }

  /**
   * Create a rate limit error
   * 
   * @param {string} message - Error message
   * @param {number} retryAfter - Seconds to wait before retrying
   * @returns {OpenRouterError} New error instance
   */
  static rateLimitError(message = 'Rate limit exceeded', retryAfter = 60) {
    return new OpenRouterError(message, 429, {
      error: {
        code: 'rate_limit_exceeded',
        message,
        param: null,
        type: 'rate_limit_error'
      },
      retryAfter
    });
  }

  /**
   * Create an authentication error
   * 
   * @param {string} message - Error message
   * @returns {OpenRouterError} New error instance
   */
  static authError(message = 'Authentication failed') {
    return new OpenRouterError(message, 401, {
      error: {
        code: 'authentication_error',
        message,
        param: null,
        type: 'authentication_error'
      }
    });
  }

  /**
   * Create a validation error
   * 
   * @param {string} message - Error message
   * @param {string} param - Parameter that failed validation
   * @returns {OpenRouterError} New error instance
   */
  static validationError(message = 'Validation failed', param = null) {
    return new OpenRouterError(message, 400, {
      error: {
        code: 'validation_error',
        message,
        param,
        type: 'validation_error'
      }
    });
  }

  /**
   * Create a timeout error
   * 
   * @param {string} message - Error message
   * @returns {OpenRouterError} New error instance
   */
  static timeoutError(message = 'Request timed out') {
    return new OpenRouterError(message, 408, {
      error: {
        code: 'timeout_error',
        message,
        param: null,
        type: 'timeout_error'
      }
    });
  }
}

export default OpenRouterError;
