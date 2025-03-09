/**
 * Custom error class for OpenRouter API errors
 */
/**
 * Represents an error returned by the OpenRouter API
 */
export class OpenRouterError extends Error {
    /**
     * Create a new OpenRouter error
     * @param message - Error message
     * @param status - HTTP status code (default: 0)
     * @param data - Additional error data (default: null)
     */
    constructor(message, status = 0, data = null) {
        super(message);
        this.name = 'OpenRouterError';
        this.status = status;
        this.data = data;
    }
}
//# sourceMappingURL=openrouter-error.js.map