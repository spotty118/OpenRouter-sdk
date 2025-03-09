/**
 * Enhanced Error Handling Module
 *
 * Provides standardized error handling with status codes, error types,
 * and additional metadata for better error reporting.
 */
/**
 * Error types for better categorization
 */
export declare enum ErrorType {
    VALIDATION = "validation_error",
    AUTHENTICATION = "authentication_error",
    AUTHORIZATION = "authorization_error",
    RATE_LIMIT = "rate_limit_error",
    NOT_FOUND = "not_found_error",
    BAD_REQUEST = "bad_request_error",
    SERVER_ERROR = "server_error",
    SERVICE_UNAVAILABLE = "service_unavailable",
    EXTERNAL_API = "external_api_error",
    TIMEOUT = "timeout_error",
    CONFLICT = "conflict_error",
    DATABASE = "database_error",
    INVALID_INPUT = "invalid_input_error"
}
/**
 * HTTP status codes mapped to error types
 */
export declare const ErrorStatusMap: Record<ErrorType, number>;
/**
 * Enhanced error class for better error reporting
 */
export declare class EnhancedError extends Error {
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
    constructor(message: string, type?: ErrorType, data?: any, requestId?: string);
    /**
     * Log the error with appropriate level based on type
     */
    private logError;
    /**
     * Format error response for API responses
     *
     * @returns Formatted error object
     */
    toResponse(): object;
}
/**
 * Error factory methods for common error types
 */
export declare const Errors: {
    /**
     * Create a validation error
     *
     * @param message - Error message
     * @param data - Validation details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    validation: (message: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create an authentication error
     *
     * @param message - Error message
     * @param data - Authentication details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    authentication: (message?: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create an authorization error
     *
     * @param message - Error message
     * @param data - Authorization details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    authorization: (message?: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create a rate limit error
     *
     * @param message - Error message
     * @param data - Rate limit details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    rateLimit: (message?: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create a not found error
     *
     * @param message - Error message
     * @param data - Not found details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    notFound: (message?: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create a bad request error
     *
     * @param message - Error message
     * @param data - Bad request details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    badRequest: (message: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create a server error
     *
     * @param message - Error message
     * @param data - Server error details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    server: (message?: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create an external API error
     *
     * @param message - Error message
     * @param data - External API error details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    externalApi: (message: string, data?: any, requestId?: string) => EnhancedError;
    /**
     * Create a timeout error
     *
     * @param message - Error message
     * @param data - Timeout details
     * @param requestId - Request ID for correlation
     * @returns EnhancedError instance
     */
    timeout: (message?: string, data?: any, requestId?: string) => EnhancedError;
};
//# sourceMappingURL=enhanced-error.d.ts.map