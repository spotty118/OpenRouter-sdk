/**
 * Rate limiting utility
 */
/**
 * Controls the rate of API requests
 */
export declare class RateLimiter {
    private maxRequestsPerMinute;
    private requestTimestamps;
    /**
     * Create a new rate limiter
     * @param maxRequestsPerMinute - Maximum requests per minute (0 = no limit)
     */
    constructor(maxRequestsPerMinute?: number);
    /**
     * Throttle requests to respect rate limits
     *
     * This method will pause execution (using await) if the
     * current request would exceed the configured rate limit.
     *
     * @returns Promise that resolves when it's safe to proceed
     */
    throttle(): Promise<void>;
}
