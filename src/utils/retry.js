/**
 * Retry utility for handling transient errors
 */

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - The function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {Object} logger - Optional logger instance
 * @param {number} initialDelay - Initial delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {Promise<any>} The result of the function
 */
export async function retry(
  fn,
  maxRetries = 3,
  logger = console,
  initialDelay = 1000,
  maxDelay = 30000
) {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      
      // If we've reached the maximum number of retries, throw the error
      if (retries > maxRetries) {
        logger.error(`Failed after ${maxRetries} retries:`, error);
        throw error;
      }
      
      // Calculate the next delay with exponential backoff and jitter
      delay = Math.min(delay * 2, maxDelay);
      const jitter = delay * 0.2 * Math.random();
      const actualDelay = delay + jitter;
      
      logger.warn(`Retry ${retries}/${maxRetries} after ${Math.round(actualDelay)}ms:`, error.message);
      
      // Wait for the delay
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }
}

/**
 * Retry a function with a custom retry strategy
 * 
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {Function} options.retryCondition - Function that returns true if the error should be retried
 * @param {Function} options.delayFn - Function that returns the delay for the next retry
 * @param {Object} options.logger - Optional logger instance
 * @returns {Promise<any>} The result of the function
 */
export async function retryWithStrategy(
  fn,
  {
    maxRetries = 3,
    retryCondition = () => true,
    delayFn = (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 30000),
    logger = console
  } = {}
) {
  let retries = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      // If we've reached the maximum number of retries or the condition is not met, throw the error
      if (retries >= maxRetries || !retryCondition(error, retries)) {
        if (retries > 0) {
          logger.error(`Failed after ${retries} retries:`, error);
        }
        throw error;
      }
      
      retries++;
      
      // Calculate the delay
      const delay = delayFn(retries);
      
      logger.warn(`Retry ${retries}/${maxRetries} after ${Math.round(delay)}ms:`, error.message);
      
      // Wait for the delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export default {
  retry,
  retryWithStrategy
};
