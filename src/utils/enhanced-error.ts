/**
 * Enhanced Error Handling Module
 * 
 * Provides standardized error handling with status codes, error types,
 * and additional metadata for better error reporting.
 */

import { Logger } from './logger.js';

const logger = new Logger('info');

/**
 * Error types for better categorization
 */
export enum ErrorType {
  VALIDATION = 'validation_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  RATE_LIMIT = 'rate_limit_error',
  NOT_FOUND = 'not_found_error',
  BAD_REQUEST = 'bad_request_error',
  SERVER_ERROR = 'server_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  EXTERNAL_API = 'external_api_error',
  TIMEOUT = 'timeout_error',
  CONFLICT = 'conflict_error',
  DATABASE = 'database_error',
  INVALID_INPUT = 'invalid_input_error'
}

/**
 * HTTP status codes mapped to error types
 */
export const ErrorStatusMap: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.SERVER_ERROR]: 500,
  [ErrorType.SERVICE_UNAVAILABLE]: 503,
  [ErrorType.EXTERNAL_API]: 502,
  [ErrorType.TIMEOUT]: 408,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.DATABASE]: 500,
  [ErrorType.INVALID_INPUT]: 400
};

/**
 * Enhanced error class for better error reporting
 */
export class EnhancedError extends Error {
  type: ErrorType;
  status: number;
  data: any;
  timestamp: string;
  requestId?: string;

  /**
   * Create a new enhanced error
   * 
   * @param message - Error message
   * @param type - Error type from ErrorType enum
   * @param data - Additional error data (optional)
   * @param requestId - Request ID for correlation (optional)
   */
  constructor(
    message: string,
    type: ErrorType = ErrorType.SERVER_ERROR,
    data: any = null,
    requestId?: string
  ) {
    super(message);
    this.name = 'EnhancedError';
    this.type = type;
    this.status = ErrorStatusMap[type] || 500;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Log the error
    this.logError();
  }

  /**
   * Log the error with appropriate level based on type
   */
  private logError(): void {
    const logData = {
      errorType: this.type,
      statusCode: this.status,
      timestamp: this.timestamp,
      requestId: this.requestId,
      data: this.data
    };
    
    if (this.status >= 500) {
      logger.error(`${this.message}`, logData);
    } else if (this.type === ErrorType.RATE_LIMIT) {
      logger.warn(`${this.message}`, logData);
    } else {
      logger.info(`${this.message}`, logData);
    }
  }

  /**
   * Format error response for API responses
   * 
   * @returns Formatted error object
   */
  toResponse(): object {
    return {
      error: {
        message: this.message,
        type: this.type,
        code: this.status,
        requestId: this.requestId,
        timestamp: this.timestamp,
        data: this.data
      }
    };
  }
}

/**
 * Error factory methods for common error types
 */
export const Errors = {
  /**
   * Create a validation error
   * 
   * @param message - Error message
   * @param data - Validation details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  validation: (message: string, data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.VALIDATION, data, requestId),
  
  /**
   * Create an authentication error
   * 
   * @param message - Error message
   * @param data - Authentication details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  authentication: (message = 'Authentication failed', data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.AUTHENTICATION, data, requestId),
  
  /**
   * Create an authorization error
   * 
   * @param message - Error message
   * @param data - Authorization details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  authorization: (message = 'Not authorized', data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.AUTHORIZATION, data, requestId),
  
  /**
   * Create a rate limit error
   * 
   * @param message - Error message
   * @param data - Rate limit details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  rateLimit: (message = 'Rate limit exceeded', data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.RATE_LIMIT, data, requestId),
  
  /**
   * Create a not found error
   * 
   * @param message - Error message
   * @param data - Not found details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  notFound: (message = 'Resource not found', data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.NOT_FOUND, data, requestId),
  
  /**
   * Create a bad request error
   * 
   * @param message - Error message
   * @param data - Bad request details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  badRequest: (message: string, data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.BAD_REQUEST, data, requestId),
  
  /**
   * Create a server error
   * 
   * @param message - Error message
   * @param data - Server error details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  server: (message = 'Internal server error', data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.SERVER_ERROR, data, requestId),
  
  /**
   * Create an external API error
   * 
   * @param message - Error message
   * @param data - External API error details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  externalApi: (message: string, data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.EXTERNAL_API, data, requestId),
  
  /**
   * Create a timeout error
   * 
   * @param message - Error message
   * @param data - Timeout details
   * @param requestId - Request ID for correlation
   * @returns EnhancedError instance
   */
  timeout: (message = 'Request timed out', data?: any, requestId?: string): EnhancedError => 
    new EnhancedError(message, ErrorType.TIMEOUT, data, requestId)
};
