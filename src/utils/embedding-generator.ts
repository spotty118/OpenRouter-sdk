/**
 * Utility for generating embeddings from text
 */

import { Logger } from './logger.js';

/**
 * Configuration options for embedding generation
 */
export interface EmbeddingGeneratorConfig {
  /** API key for the embedding service */
  apiKey?: string;
  /** Model to use for embeddings (default: text-embedding-3-small) */
  model?: string;
  /** API endpoint for the embedding service (default: OpenAI) */
  endpoint?: string;
  /** Dimensions of the embedding vectors */
  dimensions: number;
  /** Whether to use OpenRouter API instead of OpenAI directly */
  useOpenRouter?: boolean;
}

/**
 * Utility class for generating embeddings from text
 */
export class EmbeddingGenerator {
  private config: Required<EmbeddingGeneratorConfig>;
  private logger: Logger;

  /**
   * Create a new embedding generator
   * 
   * @param config - Configuration options
   */
  constructor(config: EmbeddingGeneratorConfig) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || 'text-embedding-3-small',
      endpoint: config.endpoint || 'https://api.openai.com/v1/embeddings',
      dimensions: config.dimensions,
      useOpenRouter: config.useOpenRouter || false
    };
    
    this.logger = new Logger('info');
    
    if (this.config.useOpenRouter) {
      this.config.endpoint = 'https://openrouter.ai/api/v1/embeddings';
    }
  }

  /**
   * Generate an embedding for a text string
   * 
   * @param text - The text to generate an embedding for
   * @returns Promise resolving to the embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...(this.config.useOpenRouter ? {
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://api.openrouter.ai',
            'X-Title': 'OpenRouter SDK'
          } : {})
        },
        body: JSON.stringify({
          input: text,
          model: this.config.model
        })
      });
      
      if (!response.ok) {
        throw new Error(`Embedding API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different API response formats
      let embedding: number[];
      
      if (this.config.useOpenRouter) {
        embedding = data.data[0].embedding;
      } else {
        // OpenAI format
        embedding = data.data[0].embedding;
      }
      
      // Validate dimensions
      if (embedding.length !== this.config.dimensions) {
        this.logger.warn(`Embedding dimensions mismatch: expected ${this.config.dimensions}, got ${embedding.length}`);
      }
      
      return embedding;
    } catch (err) {
      this.logger.error('Failed to generate embedding:', err);
      // Return a random embedding as fallback
      return this.createRandomEmbedding();
    }
  }

  /**
   * Generate embeddings for multiple text strings
   * 
   * @param texts - Array of text strings to generate embeddings for
   * @returns Promise resolving to an array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...(this.config.useOpenRouter ? {
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://api.openrouter.ai',
            'X-Title': 'OpenRouter SDK'
          } : {})
        },
        body: JSON.stringify({
          input: texts,
          model: this.config.model
        })
      });
      
      if (!response.ok) {
        throw new Error(`Embedding API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different API response formats
      let embeddings: number[][];
      
      if (this.config.useOpenRouter) {
        embeddings = data.data.map((item: any) => item.embedding);
      } else {
        // OpenAI format
        embeddings = data.data.map((item: any) => item.embedding);
      }
      
      return embeddings;
    } catch (err) {
      this.logger.error('Failed to generate embeddings:', err);
      // Return random embeddings as fallback
      return texts.map(() => this.createRandomEmbedding());
    }
  }

  /**
   * Create a random embedding vector (for fallback)
   * 
   * @returns A random embedding vector
   */
  private createRandomEmbedding(): number[] {
    return Array.from({ length: this.config.dimensions }, () => Math.random() * 2 - 1);
  }
}