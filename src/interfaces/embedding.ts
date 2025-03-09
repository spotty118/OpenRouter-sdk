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
    [key: string]: any;
  };

  /**
   * Function to generate embeddings for text
   */
  generateEmbedding(text: string): Promise<number[]>;
  
  /**
   * Function to generate embeddings for multiple texts
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  
  /**
   * Function to create a random embedding (for testing)
   */
  createRandomEmbedding(dimension?: number): number[];
}

/**
 * Base configuration for embedding generators
 */
export interface BaseEmbeddingConfig {
  /**
   * Log level for operations
   */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}
