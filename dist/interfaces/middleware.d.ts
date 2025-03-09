/**
 * Middleware interfaces for request/response processing
 */
/**
 * Middleware interface for processing requests, responses, and errors
 */
export interface Middleware {
    /**
     * Process a request before it's sent
     * @param request The request object to process
     * @returns The processed request object
     */
    pre?: (request: any) => Promise<any>;
    /**
     * Process a response after it's received
     * @param response The response object to process
     * @returns The processed response object
     */
    post?: (response: any) => Promise<any>;
    /**
     * Process an error that occurred during a request
     * @param error The error object to process
     * @returns The processed error object
     */
    error?: (error: any) => Promise<any>;
}
//# sourceMappingURL=middleware.d.ts.map