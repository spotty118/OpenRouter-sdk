/**
 * Custom error class for OpenRouter API errors
 */

/**
 * Represents an error returned by the OpenRouter API
 */
export class OpenRouterError extends Error {
  /** HTTP status code */
  status: number;
  
  /** Additional error data from API */
  data: any;
  
  /**
   * Create a new OpenRouter error
   * @param message - Error message
   * @param status - HTTP status code (default: 0)
   * @param data - Additional error data (default: null)
   */
  constructor(message: string, status: number = 0, data: any = null) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.data = data;
  }
}