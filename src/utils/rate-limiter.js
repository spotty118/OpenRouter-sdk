/**
 * Simple rate limiter implementation
 */

/**
 * RateLimiter provides a simple mechanism to limit the rate of operations
 */
export class RateLimiter {
  /**
   * Create a new rate limiter
   * 
   * @param {number} requestsPerMinute - Maximum requests per minute (0 for no limit)
   */
  constructor(requestsPerMinute = 0) {
    this.requestsPerMinute = requestsPerMinute;
    this.requestTimes = [];
  }

  /**
   * Set the rate limit
   * 
   * @param {number} requestsPerMinute - Maximum requests per minute (0 for no limit)
   */
  setLimit(requestsPerMinute) {
    this.requestsPerMinute = requestsPerMinute;
  }

  /**
   * Get the current rate limit
   * 
   * @returns {number} The current rate limit in requests per minute
   */
  getLimit() {
    return this.requestsPerMinute;
  }

  /**
   * Check if the rate limit is active
   * 
   * @returns {boolean} True if rate limiting is active
   */
  isActive() {
    return this.requestsPerMinute > 0;
  }

  /**
   * Throttle requests to stay within the rate limit
   * 
   * @returns {Promise<void>} A promise that resolves when the request can proceed
   */
  async throttle() {
    // If rate limiting is disabled, return immediately
    if (!this.isActive()) {
      return;
    }

    // Clean up old request times
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);

    // If we're under the limit, add the current time and return
    if (this.requestTimes.length < this.requestsPerMinute) {
      this.requestTimes.push(now);
      return;
    }

    // Calculate how long to wait
    const oldestRequest = this.requestTimes[0];
    const timeToWait = Math.max(0, oldestRequest + 60 * 1000 - now);

    // Wait for the required time
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }

    // Remove the oldest request and add the current one
    this.requestTimes.shift();
    this.requestTimes.push(Date.now());
  }

  /**
   * Get the number of requests in the current window
   * 
   * @returns {number} The number of requests in the current window
   */
  getCurrentRequestCount() {
    // Clean up old request times
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);

    return this.requestTimes.length;
  }

  /**
   * Get the remaining capacity in the current window
   * 
   * @returns {number} The number of requests remaining in the current window
   */
  getRemainingRequests() {
    if (!this.isActive()) {
      return Infinity;
    }

    return Math.max(0, this.requestsPerMinute - this.getCurrentRequestCount());
  }

  /**
   * Reset the rate limiter
   */
  reset() {
    this.requestTimes = [];
  }
}

export default RateLimiter;
