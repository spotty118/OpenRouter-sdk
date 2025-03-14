/**
 * Utilities for API provider implementations with modern TypeScript patterns
 */

import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * Configuration for API requests
 */
interface RequestConfig {
  baseUrl: string;
  headers: Record<string, string>;
  timeout: number;
  maxRetries: number;
  retryDelay?: number;  // Delay between retries in ms
  shouldRetry?: (error: unknown) => boolean;  // Custom retry condition
}

/**
 * Enhanced error handling with detailed API error information
 */
export class APIError extends OpenRouterError {
  constructor(
    message: string,
    status: number,
    public readonly endpoint: string,
    public readonly requestId?: string,
    public readonly rawError?: unknown
  ) {
    super(message, status, null);
    this.name = 'APIError';
  }
}

/**
 * Utility class for making API requests with retries and error handling
 */
export class APIClient {
  constructor(private config: RequestConfig) {}

  /**
   * Make an API request with automatic retries and error handling
   */
  async request<T>(
    endpoint: string,
    options: RequestInit & { 
      parse?: (data: any) => T;  // Custom response parser
      validateStatus?: (status: number) => boolean;  // Custom status validator
    }
  ): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const parse = options.parse || ((data) => data as T);
    const validateStatus = options.validateStatus || ((status) => status >= 200 && status < 300);
    
    let lastError: Error | undefined;
    const retryDelay = this.config.retryDelay || 1000;
    const shouldRetry = this.config.shouldRetry || 
      ((error) => error instanceof APIError && error.status >= 500);

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const url = new URL(endpoint, this.config.baseUrl).toString();
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.config.headers,
            'x-request-id': requestId,
            ...options.headers,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!validateStatus(response.status)) {
          const errorData = await response.json().catch(() => null);
          throw new APIError(
            `API request failed with status ${response.status}`,
            response.status,
            endpoint,
            requestId,
            errorData
          );
        }

        const data = await response.json();
        return parse(data);

      } catch (error: unknown) {
        lastError = error as Error;
        
        if (attempt === this.config.maxRetries || !shouldRetry(error)) {
          if (error instanceof APIError) {
            throw error;
          }
          throw new APIError(
            `API request failed: ${error instanceof Error ? error.message : String(error)}`,
            500,
            endpoint,
            requestId,
            error
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    // This should never be reached due to the throw in the loop
    throw lastError;
  }

  /**
   * Handle streaming responses with automatic retries
   */
  async *stream<T>(
    endpoint: string, 
    options: RequestInit & {
      parse?: (line: string) => T | null;  // Custom line parser
      onError?: (error: Error) => void;    // Error callback
    }
  ): AsyncGenerator<T, void, unknown> {
    const parse = options.parse || ((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    });

    let attempt = 0;
    while (attempt < this.config.maxRetries) {
      attempt++;
      
      try {
        const url = new URL(endpoint, this.config.baseUrl).toString();
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.config.headers,
            ...options.headers
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new APIError(
            `Streaming request failed with status ${response.status}`,
            response.status,
            endpoint,
            undefined,
            errorData
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            const data = parse(line);
            if (data) {
              yield data;
            }
          }
        }

        // Handle any remaining data in buffer
        if (buffer.trim()) {
          const data = parse(buffer);
          if (data) {
            yield data;
          }
        }

        // Success - exit retry loop
        break;

      } catch (error: unknown) {
        if (options.onError) {
          options.onError(error as Error);
        }
        
        // On last attempt, throw the error
        if (attempt === this.config.maxRetries) {
          if (error instanceof APIError) {
            throw error;
          }
          throw new APIError(
            `Streaming request failed: ${error instanceof Error ? error.message : String(error)}`,
            500,
            endpoint,
            undefined,
            error
          );
        }

        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, (this.config.retryDelay || 1000) * attempt)
        );
      }
    }
  }
}

/**
 * Utility functions for working with streaming responses
 */
export class StreamUtils {
  /**
   * Convert a ReadableStream to an AsyncGenerator
   */
  static async *streamToGenerator<T>(
    stream: ReadableStream,
    parser: (chunk: Uint8Array) => T | null
  ): AsyncGenerator<T, void, unknown> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const result = parser(value);
        if (result !== null) {
          yield result;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Combine multiple async generators into one
   */
  static async *combineGenerators<T>(...generators: AsyncGenerator<T>[]): AsyncGenerator<T, void, unknown> {
    const promises = generators.map(gen => gen.next());
    while (promises.length > 0) {
      const { value, done, index } = await Promise.race(
        promises.map(async (promise, index) => {
          const result = await promise;
          return { ...result, index };
        })
      );

      if (done) {
        promises.splice(index, 1);
        generators.splice(index, 1);
        continue;
      }

      promises[index] = generators[index].next();
      yield value;
    }
  }
}
