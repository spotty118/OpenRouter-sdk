/**
 * Vector Store for OpenRouter SDK
 * 
 * This tool provides an interface for vector database storage and retrieval.
 * It uses OneAPI for generating embeddings and similarity calculations.
 */

import oneapiModule from '../oneapi.js';

export class VectorStore {
  constructor() {
    this.name = 'Vector Store';
    this.description = 'Interface for vector database storage and retrieval';
    this.collections = new Map(); // Simple in-memory storage
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
    this.defaultEmbeddingModel = 'openai/text-embedding-ada-002';
  }

  /**
   * Execute a vector store operation
   * @param {Object} options - Vector store options
   * @param {string} options.operation - Operation to perform (store/query/delete)
   * @param {string|Object} options.data - Data to store or query parameters
   * @param {string} options.namespace - Collection namespace to use
   * @returns {Promise<Object>} Operation results
   */
  async execute({ 
    operation, 
    data, 
    namespace = 'default',
    embeddingModel = null
  }) {
    console.log(`Executing vector store operation: ${operation} in namespace: ${namespace}`);
    
    try {
      // Parse data if it's a string
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Set the embedding model to use
      const useEmbeddingModel = embeddingModel || this.defaultEmbeddingModel;
      
      // Ensure namespace exists
      if (!this.collections.has(namespace)) {
        this.collections.set(namespace, new Map());
      }
      
      const collection = this.collections.get(namespace);
      
      // Execute the requested operation
      switch (operation.toLowerCase()) {
        case 'store':
          return this._storeOperation(collection, parsedData, useEmbeddingModel);
        case 'query':
          return this._queryOperation(collection, parsedData, useEmbeddingModel);
        case 'delete':
          return this._deleteOperation(collection, parsedData);
        case 'create-embeddings':
          return this._createEmbeddingsOperation(parsedData, useEmbeddingModel);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      console.error('Vector store error:', error);
      throw new Error(`Vector store operation failed: ${error.message}`);
    }
  }

  /**
   * Store vectors in the collection
   * @private
   */
  /**
   * Store vectors in the collection
   * @param {Map} collection - Collection to store in
   * @param {Array|Object} data - Data to store
   * @param {string} embeddingModel - Model to use for embeddings
   * @private
   */
  async _storeOperation(collection, data, embeddingModel) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    const stored = [];
    const needsEmbedding = [];
    const itemsToProcess = [];
    
    // First pass: identify items needing embeddings
    for (const item of data) {
      // Generate ID if not provided
      if (!item.id) {
        item.id = `vector-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // If the item has text but no embedding, add it to the embedding queue
      if (item.text && !item.embedding) {
        needsEmbedding.push({
          id: item.id,
          text: item.text
        });
      }
      
      itemsToProcess.push(item);
    }
    
    // Generate embeddings if needed
    if (needsEmbedding.length > 0) {
      try {
        const embeddings = await this._generateEmbeddings(
          needsEmbedding.map(item => item.text),
          embeddingModel
        );
        
        // Match embeddings with their corresponding items
        for (let i = 0; i < needsEmbedding.length; i++) {
          const itemId = needsEmbedding[i].id;
          const itemIdx = itemsToProcess.findIndex(item => item.id === itemId);
          
          if (itemIdx !== -1 && embeddings[i]) {
            itemsToProcess[itemIdx].embedding = embeddings[i];
          }
        }
      } catch (error) {
        console.warn('Failed to generate embeddings:', error);
        // Continue with storage even if embedding fails
      }
    }
    
    // Store all items
    for (const item of itemsToProcess) {
      collection.set(item.id, item);
      stored.push(item.id);
    }
    
    return {
      operation: 'store',
      status: 'success',
      stored: stored,
      count: stored.length,
      embeddingsGenerated: needsEmbedding.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Query vectors in the collection
   * @private
   */
  /**
   * Query vectors in the collection
   * @param {Map} collection - Collection to query
   * @param {Object} queryParams - Query parameters
   * @param {string} embeddingModel - Model to use for embeddings
   * @private
   */
  async _queryOperation(collection, queryParams, embeddingModel) {
    const { vector, text, filter, limit = 10, ids = [] } = queryParams;
    
    // For the mock implementation, if specific IDs are requested, return those
    if (ids && ids.length > 0) {
      const results = [];
      ids.forEach(id => {
        if (collection.has(id)) {
          results.push({
            id,
            item: collection.get(id),
            score: 1.0
          });
        }
      });
      
      return {
        operation: 'query',
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      };
    }
    
    // If text query is provided, convert to vector first
    let queryVector = vector;
    if (text && !vector) {
      try {
        const embeddings = await this._generateEmbeddings([text], embeddingModel);
        if (embeddings && embeddings.length > 0) {
          queryVector = embeddings[0];
        }
      } catch (error) {
        console.warn('Failed to generate query embedding:', error);
      }
    }
    
    // If we have a query vector, perform similarity search
    if (queryVector) {
      // Get all items with embeddings
      const itemsWithEmbeddings = Array.from(collection.entries())
        .filter(([_, item]) => item.embedding)
        .map(([id, item]) => ({
          id,
          item,
          embedding: item.embedding
        }));
      
      // Calculate cosine similarity for each item
      const results = itemsWithEmbeddings
        .map(({ id, item, embedding }) => ({
          id,
          item,
          score: this._cosineSimilarity(queryVector, embedding)
        }))
        .filter(result => result.score !== null) // Filter out failed comparisons
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, limit); // Limit results
      
      return {
        operation: 'query',
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      };
    }
    
    // If no vector search is possible, return items sorted by recency
    const results = Array.from(collection.entries())
      .slice(0, limit)
      .map(([id, item]) => ({
        id,
        item,
        score: 0 // No meaningful score without a query vector
      }));
    
    return {
      operation: 'query',
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Delete vectors from the collection
   * @private
   */
  /**
   * Delete vectors from the collection
   * @param {Map} collection - Collection to delete from
   * @param {Object} deleteParams - Delete parameters
   * @private
   */
  _deleteOperation(collection, deleteParams) {
    const { ids, filter, text, vector, embeddingModel, threshold = 0.9 } = deleteParams;
    
    let deleted = [];
    
    // Delete by IDs if provided
    if (ids && Array.isArray(ids)) {
      ids.forEach(id => {
        if (collection.has(id)) {
          collection.delete(id);
          deleted.push(id);
        }
      });
    } 
    // Delete by filter if provided
    else if (filter) {
      // Apply basic filtering on metadata
      Array.from(collection.entries()).forEach(([id, item]) => {
        let matches = true;
        
        // Check each filter property against the item
        Object.entries(filter).forEach(([key, value]) => {
          if (item[key] !== value) {
            matches = false;
          }
        });
        
        if (matches) {
          collection.delete(id);
          deleted.push(id);
        }
      });
    }
    // Delete all if neither is provided
    else {
      deleted = Array.from(collection.keys());
      collection.clear();
    }
    
    return {
      operation: 'delete',
      status: 'success',
      deleted,
      count: deleted.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get collection statistics
   * @param {string} namespace - Collection namespace
   * @returns {Object} Collection statistics
   */
  getStats(namespace = 'default') {
    const collection = this.collections.get(namespace);
    
    if (!collection) {
      return {
        namespace,
        exists: false,
        count: 0
      };
    }
    
    return {
      namespace,
      exists: true,
      count: collection.size,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vecA - First vector
   * @param {Array<number>} vecB - Second vector
   * @returns {number|null} - Similarity score between 0 and 1, or null if vectors are invalid
   * @private
   */
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
      return null;
    }
    
    if (vecA.length !== vecB.length) {
      console.warn('Vector dimensions do not match:', vecA.length, vecB.length);
      return null;
    }
    
    try {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      
      normA = Math.sqrt(normA);
      normB = Math.sqrt(normB);
      
      if (normA === 0 || normB === 0) {
        return 0; // Avoid division by zero
      }
      
      return dotProduct / (normA * normB);
    } catch (error) {
      console.error('Error calculating cosine similarity:', error);
      return null;
    }
  }
  
  /**
   * Generate embeddings for text using OneAPI
   * @param {Array<string>} texts - Array of texts to embed
   * @param {string} model - Embedding model to use
   * @returns {Promise<Array<Array<number>>>} - Array of embedding vectors
   * @private
   */
  async _generateEmbeddings(texts, model) {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return [];
    }
    
    try {
      // Call OneAPI embeddings endpoint
      const response = await this.oneAPI.createEmbeddings({
        model: model,
        input: texts
      });
      
      // Extract embeddings from response
      if (response && response.data && Array.isArray(response.data)) {
        return response.data.map(item => item.embedding);
      }
      
      return [];
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }
  
  /**
   * Create embeddings for text without storing them
   * @param {Object} data - Data containing text to embed
   * @param {string} embeddingModel - Model to use
   * @returns {Promise<Object>} - Operation results with embeddings
   * @private
   */
  async _createEmbeddingsOperation(data, embeddingModel) {
    const { texts } = data;
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new Error('No texts provided for embedding generation');
    }
    
    try {
      const embeddings = await this._generateEmbeddings(texts, embeddingModel);
      
      return {
        operation: 'create-embeddings',
        status: 'success',
        count: embeddings.length,
        embeddings: embeddings,
        model: embeddingModel,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }
}
