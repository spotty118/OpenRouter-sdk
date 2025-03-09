"use strict";
/**
 * Rate limiting utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * Controls the rate of API requests
 */
class RateLimiter {
    /**
     * Create a new rate limiter
     * @param maxRequestsPerMinute - Maximum requests per minute (0 = no limit)
     */
    constructor(maxRequestsPerMinute = 0) {
        this.requestTimestamps = [];
        this.maxRequestsPerMinute = maxRequestsPerMinute;
    }
    /**
     * Throttle requests to respect rate limits
     *
     * This method will pause execution (using await) if the
     * current request would exceed the configured rate limit.
     *
     * @returns Promise that resolves when it's safe to proceed
     */
    async throttle() {
        if (this.maxRequestsPerMinute <= 0)
            return;
        // Clean up old timestamps (older than 1 minute)
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
        // Check if we've hit the rate limit
        if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
            // Calculate time to wait until we can make another request
            const oldestTimestamp = this.requestTimestamps[0];
            const timeToWait = oldestTimestamp + 60 * 1000 - now;
            if (timeToWait > 0) {
                // Wait until we can make another request
                await new Promise(resolve => setTimeout(resolve, timeToWait));
            }
        }
        // Add current timestamp to list
        this.requestTimestamps.push(Date.now());
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rate-limiter.js.map