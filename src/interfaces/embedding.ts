/**
 * Embedding Generation Interface
 * 
 * This module defines interfaces for text embedding generation.
 */

export interface EmbeddingGenerator {
  /**
   * Configuration object
   */
  readonly config: {
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
    oneApiEnabled?: boolean;
    oneApiModelId?: string;
    trackMetrics?: boolean;
    [key: string]: any;
  };

  /**
   * OneAPI client reference if available
   */
  readonly oneApiClient?: any;

  /**
   * Function to generate embeddings for text
   * @param text - The text to generate embeddings for
   * @param options - Optional parameters for tracking and metrics
   */
  generateEmbedding(text: string, options?: {
    trackingId?: string;
    metadata?: Record<string, any>;
    modelOverride?: string;
  }): Promise<number[]>;
  
  /**
   * Function to generate embeddings for multiple texts
   * @param texts - Array of texts to generate embeddings for
   * @param options - Optional parameters for tracking and metrics
   */
  generateEmbeddings(texts: string[], options?: {
    trackingId?: string;
    metadata?: Record<string, any>;
    modelOverride?: string;
    batchSize?: number;
  }): Promise<number[][]>;
  
  /**
   * Function to create a random embedding (for testing)
   */
  createRandomEmbedding(dimension?: number): number[];
  
  /**
   * Get metrics for embedding operations
   */
  getMetrics?(options?: {
    startDate?: Date;
    endDate?: Date;
    model?: string;
  }): Promise<{
    requestCount: number;
    tokenCount: number;
    averageLatency: number;
    totalCost?: number;
    errors: number;
  }>;
}

/**
 * Base configuration for embedding generators
 */
export interface BaseEmbeddingConfig {
  /**
   * Log level for operations
   */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  
  /**
   * OneAPI integration options
   */
  oneApi?: {
    /**
     * Whether to use OneAPI for embeddings
     */
    enabled: boolean;
    
    /**
     * Default model ID to use with OneAPI
     */
    modelId?: string;
    
    /**
     * Whether to track metrics with OneAPI
     */
    trackMetrics?: boolean;
    
    /**
     * Fallback embedding models if primary fails
     */
    fallbackModels?: string[];
    
    /**
     * Custom dimension mapping for different models
     */
    dimensionMapping?: Record<string, number>;
  };
  
  /**
   * Caching configuration
   */
  cache?: {
    /**
     * Whether to enable caching of embeddings
     */
    enabled: boolean;
    
    /**
     * Time-to-live for cached embeddings in seconds
     */
    ttlSeconds?: number;
  };
}
