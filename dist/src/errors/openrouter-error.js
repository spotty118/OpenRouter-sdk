"use strict";
/**
 * Custom error class for OpenRouter API errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterError = void 0;
/**
 * Represents an error returned by the OpenRouter API
 */
class OpenRouterError extends Error {
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
exports.OpenRouterError = OpenRouterError;
//# sourceMappingURL=openrouter-error.js.map