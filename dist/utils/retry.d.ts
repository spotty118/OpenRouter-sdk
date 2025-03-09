/**
 * Retry utility with exponential backoff
 */
import { Logger } from './logger';
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
export declare function retry<T>(fn: () => Promise<T>, maxRetries: number, logger: Logger, baseDelayMs?: number): Promise<T>;
//# sourceMappingURL=retry.d.ts.map