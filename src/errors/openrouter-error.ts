/**
 * Custom error class for OpenRouter-specific errors
 */
export class OpenRouterError extends Error {
  /**
   * Create a new OpenRouter error
   * 
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param details - Additional error details
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
    
    // Ensure instanceof works correctly
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }

  /**
   * Status property for compatibility with existing code
   */
  get status(): number {
    return this.statusCode;
  }

  /**
   * Data property for compatibility with existing code
   */
  get data(): unknown {
    return this.details;
  }

  /**
   * Convert error to JSON representation
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.statusCode,
        details: this.details,
        type: this.name
      }
    };
  }

  /**
   * Static factory methods for common errors
   */
  static notFound(message: string, details?: unknown): OpenRouterError {
    return new OpenRouterError(message, 404, details);
  }

  static badRequest(message: string, details?: unknown): OpenRouterError {
    return new OpenRouterError(message, 400, details);
  }

  static unauthorized(message: string, details?: unknown): OpenRouterError {
    return new OpenRouterError(message, 401, details);
  }

  static forbidden(message: string, details?: unknown): OpenRouterError {
    return new OpenRouterError(message, 403, details);
  }

  static tooManyRequests(message: string, details?: unknown): OpenRouterError {
    return new OpenRouterError(message, 429, details);
  }

  static internalError(message: string, details?: unknown): OpenRouterError {
    return new OpenRouterError(message, 500, details);
  }
}
