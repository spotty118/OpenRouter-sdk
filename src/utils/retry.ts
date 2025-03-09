/**
 * Retry utility with exponential backoff
 */
import { Logger } from './logger';
import { OpenRouterError } from '../errors/openrouter-error';

/**
 * Execute a function with automatic retries and exponential backoff
 * 
 * @template T - The return type of the function
 * @param fn - The function to execute
 * @param maxRetries - Maximum number of retry attempts
 * @param logger - Logger instance for diagnostic messages
 * @param baseDelayMs - Base delay for exponential backoff (default: 1000ms)
 * @returns Promise resolving to the function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  logger: Logger,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Don't retry for certain types of errors
      if (error instanceof OpenRouterError) {
        // Don't retry on 4xx errors except for 429 (too many requests)
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5),
        30 * 1000 // Max 30 seconds
      );
      
      logger.debug(`Request failed, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`, lastError);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}