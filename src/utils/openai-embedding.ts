/**
 * OpenAI Embedding Generator
 * 
 * This module provides text embedding generation using OpenAI's embedding models.
 */

import { EmbeddingGenerator, BaseEmbeddingConfig } from '../interfaces/embedding.js';
import { Logger } from './logger.js';

interface OpenAIEmbeddingConfig extends BaseEmbeddingConfig {
  apiKey: string;
  model?: string;
  organizationId?: string;
  baseUrl?: string;
}

/**
 * Generator for text embeddings using OpenAI's models
 */
export class OpenAIEmbeddingGenerator implements EmbeddingGenerator {
  private apiKey: string;
  private model: string;
  private organizationId?: string;
  private baseUrl: string;
  private logger: Logger;
  public readonly config: OpenAIEmbeddingConfig;

  constructor(config: OpenAIEmbeddingConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-3-small';
    this.organizationId = config.organizationId;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.logger = new Logger(config.logLevel || 'info');
    
    // Create public readonly config view
    this.config = Object.freeze({
      apiKey: this.apiKey,
      model: this.model,
      organizationId: this.organizationId,
      baseUrl: this.baseUrl,
      logLevel: config.logLevel
    });
  }

  /**
   * Create a random embedding vector (for testing)
   * 
   * @param dimension Size of embedding vector (default: 1536 for OpenAI)
   * @returns Random embedding vector
   */
  createRandomEmbedding(dimension: number = 1536): number[] {
    const embedding = new Array(dimension);
    for (let i = 0; i < dimension; i++) {
      embedding[i] = Math.random() * 2 - 1; // Values between -1 and 1
    }
    return this.normalizeVector(embedding);
  }

  /**
   * Generate embeddings for a piece of text
   * 
   * @param text Text to generate embeddings for
   * @returns Promise resolving to embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.organizationId ? { 'OpenAI-Organization': this.organizationId } : {})
        },
        body: JSON.stringify({
          model: this.model,
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * 
   * @param texts Array of texts to generate embeddings for
   * @returns Promise resolving to array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.organizationId ? { 'OpenAI-Organization': this.organizationId } : {})
        },
        body: JSON.stringify({
          model: this.model,
          input: texts
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data.map((item: any) => item.embedding);
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  /**
   * Normalize a vector to unit length
   * 
   * @param vector Vector to normalize
   * @returns Normalized vector
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   * 
   * @param a First vector
   * @param b Second vector
   * @returns Similarity score between 0 and 1
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must be of equal length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}
