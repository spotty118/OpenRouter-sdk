/**
 * Vector database utilities
 */

/**
 * VectorDB provides a simple in-memory vector database
 */
export class VectorDB {
  /**
   * Create a new vector database
   * 
   * @param {Object} config - Vector database configuration
   */
  constructor(config = {}) {
    this.dimensions = config.dimensions || 1536;
    this.maxVectors = config.maxVectors || 10000;
    this.similarityMetric = config.similarityMetric || 'cosine';
    this.persistToDisk = config.persistToDisk || false;
    this.storagePath = config.storagePath || './data/vectordb';
    
    this.vectors = new Map();
    this.metadata = new Map();
    this.collections = new Map();
    
    // Create default collection
    this.collections.set('default', {
      vectors: new Map(),
      metadata: new Map()
    });
  }

  /**
   * Add a vector to the database
   * 
   * @param {string} id - The vector ID
   * @param {Array<number>} vector - The vector data
   * @param {Object} metadata - Optional metadata
   * @param {string} collection - Optional collection name
   * @returns {Promise<string>} Promise resolving to the vector ID
   */
  async addVector(id, vector, metadata = {}, collection = 'default') {
    // Validate vector dimensions
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimensions mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }
    
    // Get or create collection
    if (!this.collections.has(collection)) {
      this.collections.set(collection, {
        vectors: new Map(),
        metadata: new Map()
      });
    }
    
    const coll = this.collections.get(collection);
    
    // Add vector and metadata
    coll.vectors.set(id, vector);
    coll.metadata.set(id, {
      ...metadata,
      id,
      timestamp: new Date().toISOString()
    });
    
    // Persist to disk if enabled
    if (this.persistToDisk) {
      await this.persist();
    }
    
    return id;
  }

  /**
   * Add multiple vectors to the database
   * 
   * @param {Array<Object>} items - Array of items with id, vector, and metadata
   * @param {string} collection - Optional collection name
   * @returns {Promise<Array<string>>} Promise resolving to an array of vector IDs
   */
  async addVectors(items, collection = 'default') {
    const ids = [];
    
    for (const item of items) {
      const id = await this.addVector(item.id, item.vector, item.metadata, collection);
      ids.push(id);
    }
    
    return ids;
  }

  /**
   * Get a vector by ID
   * 
   * @param {string} id - The vector ID
   * @param {string} collection - Optional collection name
   * @returns {Promise<Object|null>} Promise resolving to the vector and metadata or null if not found
   */
  async getVector(id, collection = 'default') {
    if (!this.collections.has(collection)) {
      return null;
    }
    
    const coll = this.collections.get(collection);
    
    if (!coll.vectors.has(id)) {
      return null;
    }
    
    return {
      id,
      vector: coll.vectors.get(id),
      metadata: coll.metadata.get(id) || {}
    };
  }

  /**
   * Delete a vector by ID
   * 
   * @param {string} id - The vector ID
   * @param {string} collection - Optional collection name
   * @returns {Promise<boolean>} Promise resolving to a boolean indicating success
   */
  async deleteVector(id, collection = 'default') {
    if (!this.collections.has(collection)) {
      return false;
    }
    
    const coll = this.collections.get(collection);
    
    const vectorDeleted = coll.vectors.delete(id);
    const metadataDeleted = coll.metadata.delete(id);
    
    // Persist to disk if enabled
    if (this.persistToDisk && (vectorDeleted || metadataDeleted)) {
      await this.persist();
    }
    
    return vectorDeleted || metadataDeleted;
  }

  /**
   * Search for similar vectors
   * 
   * @param {Array<number>} queryVector - The query vector
   * @param {Object} options - Search options
   * @param {string} options.collection - Collection name (default: 'default')
   * @param {number} options.limit - Maximum number of results (default: 10)
   * @param {number} options.minScore - Minimum similarity score (default: 0)
   * @returns {Promise<Array<Object>>} Promise resolving to an array of search results
   */
  async search(queryVector, options = {}) {
    const collection = options.collection || 'default';
    const limit = options.limit || 10;
    const minScore = options.minScore || 0;
    
    if (!this.collections.has(collection)) {
      return [];
    }
    
    // Validate query vector dimensions
    if (queryVector.length !== this.dimensions) {
      throw new Error(`Query vector dimensions mismatch: expected ${this.dimensions}, got ${queryVector.length}`);
    }
    
    const coll = this.collections.get(collection);
    const results = [];
    
    // Calculate similarity for each vector
    for (const [id, vector] of coll.vectors.entries()) {
      const score = this.calculateSimilarity(queryVector, vector);
      
      if (score >= minScore) {
        results.push({
          id,
          score,
          metadata: coll.metadata.get(id) || {}
        });
      }
    }
    
    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two vectors
   * 
   * @param {Array<number>} a - First vector
   * @param {Array<number>} b - Second vector
   * @returns {number} Similarity score
   */
  calculateSimilarity(a, b) {
    if (this.similarityMetric === 'cosine') {
      return this.cosineSimilarity(a, b);
    } else if (this.similarityMetric === 'dot') {
      return this.dotProduct(a, b);
    } else if (this.similarityMetric === 'euclidean') {
      return this.euclideanSimilarity(a, b);
    } else {
      // Default to cosine similarity
      return this.cosineSimilarity(a, b);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * 
   * @param {Array<number>} a - First vector
   * @param {Array<number>} b - Second vector
   * @returns {number} Cosine similarity score
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate dot product between two vectors
   * 
   * @param {Array<number>} a - First vector
   * @param {Array<number>} b - Second vector
   * @returns {number} Dot product
   */
  dotProduct(a, b) {
    let result = 0;
    
    for (let i = 0; i < a.length; i++) {
      result += a[i] * b[i];
    }
    
    return result;
  }

  /**
   * Calculate Euclidean similarity between two vectors
   * 
   * @param {Array<number>} a - First vector
   * @param {Array<number>} b - Second vector
   * @returns {number} Euclidean similarity score
   */
  euclideanSimilarity(a, b) {
    let sum = 0;
    
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    const distance = Math.sqrt(sum);
    
    // Convert distance to similarity (1 / (1 + distance))
    return 1 / (1 + distance);
  }

  /**
   * Persist the database to disk
   * 
   * @returns {Promise<void>} Promise resolving when the database is persisted
   */
  async persist() {
    // This is a placeholder implementation
    // In a real implementation, this would write to disk
    console.log(`[VectorDB] Would persist to ${this.storagePath}`);
    return Promise.resolve();
  }

  /**
   * Load the database from disk
   * 
   * @returns {Promise<void>} Promise resolving when the database is loaded
   */
  async load() {
    // This is a placeholder implementation
    // In a real implementation, this would read from disk
    console.log(`[VectorDB] Would load from ${this.storagePath}`);
    return Promise.resolve();
  }
}

/**
 * Extended vector database configuration
 * @typedef {Object} ExtendedVectorDBConfig
 * @property {number} dimensions - Vector dimensions
 * @property {string} [type] - Vector database type
 * @property {Object} [chroma] - Chroma-specific configuration
 */

/**
 * Create a vector database
 * 
 * @param {ExtendedVectorDBConfig} config - Vector database configuration
 * @returns {VectorDB} The created vector database
 */
export function createVectorDB(config) {
  // This is a placeholder implementation
  // In a real implementation, this would create different types of vector databases
  return new VectorDB(config);
}

export default {
  VectorDB,
  createVectorDB
};
