/**
 * Simple rate limiter utility
 */
export class RateLimiter {
  private requestQueue: Array<Promise<void>> = [];
  private interval: number;
  private maxRequestsPerInterval: number;
  private lastRequestTime: number = 0;

  /**
   * Create a new rate limiter
   * 
   * @param requestsPerMinute - Maximum requests per minute (default: 0 - no limit)
   */
  constructor(requestsPerMinute: number = 0) {
    // Convert requests per minute to interval in milliseconds
    this.maxRequestsPerInterval = requestsPerMinute;
    
    if (requestsPerMinute > 0) {
      // Calculate minimum interval between requests to respect the limit
      this.interval = (60 * 1000) / requestsPerMinute;
    } else {
      // No limit
      this.interval = 0;
    }
  }

  /**
   * Throttle requests to respect the rate limit
   * 
   * @returns Promise that resolves when the request is allowed to proceed
   */
  async throttle(): Promise<void> {
    // If no rate limiting is configured, return immediately
    if (this.interval <= 0) {
      return Promise.resolve();
    }

    // Calculate time since last request
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Calculate delay needed to respect the rate limit
    let delay = 0;
    
    if (timeSinceLastRequest < this.interval) {
      delay = this.interval - timeSinceLastRequest;
    }
    
    // Update last request time
    this.lastRequestTime = now + delay;
    
    // Create a promise that resolves after the delay
    const currentRequest = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
        
        // Remove this request from the queue
        const index = this.requestQueue.indexOf(currentRequest);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
        }
      }, delay);
    });
    
    // Add this request to the queue
    this.requestQueue.push(currentRequest);
    
    // Wait for this request to be allowed
    return currentRequest;
  }

  /**
   * Get the number of requests currently in the queue
   */
  get queueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Get the configured requests per minute limit
   */
  get requestsPerMinute(): number {
    return this.maxRequestsPerInterval;
  }

  /**
   * Set a new rate limit
   * 
   * @param requestsPerMinute - New maximum requests per minute
   */
  setRateLimit(requestsPerMinute: number): void {
    this.maxRequestsPerInterval = requestsPerMinute;
    
    if (requestsPerMinute > 0) {
      this.interval = (60 * 1000) / requestsPerMinute;
    } else {
      this.interval = 0;
    }
  }
}
