/**
 * Database-Backed Function Storage
 * 
 * This module provides a database implementation of the FunctionStorageDriver interface
 * for persistent storage of function definitions and usage statistics.
 */

import { FunctionDefinition, FunctionStorageDriver } from './function-registry.js';
import { Logger } from './logger.js';
import { ChromaVectorDB } from './chroma-vector-db.js';
import { EmbeddingGenerator } from './embedding-generator.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import { VectorDocument } from '../interfaces/vector-db.js';

/**
 * Function usage statistics for tracking and optimization
 */
interface FunctionUsageStats {
  /**
   * Count of successful invocations
   */
  invocationCount: number;
  
  /**
   * Count of failed invocations
   */
  errorCount: number;
  
  /**
   * List of model IDs that have used this function
   */
  usedByModels: Set<string>;
  
  /**
   * Average execution time in milliseconds
   */
  avgExecutionTimeMs: number;
  
  /**
   * Last used timestamp
   */
  lastUsed: Date;
}

/**
 * Database schema for function documents
 */
interface FunctionDocument extends VectorDocument {
  content: string; // JSON stringified function definition
  metadata: {
    type: 'function-definition';
    name: string;
    description: string;
    tags?: string[];
    compatibleWith?: string[];
    created: string;
    updated: string;
  };
}

/**
 * Database schema for function stats documents
 */
interface FunctionStatsDocument extends VectorDocument {
  content: string; // JSON stringified stats
  metadata: {
    type: 'function-stats';
    name: string;
    invocationCount: number;
    errorCount: number;
    usedByModels: string[]; // Array of model IDs
    avgExecutionTimeMs: number;
    lastUsed: string; // ISO date string
  };
}

/**
 * Database-backed function storage using a vector database
 */
export class DbFunctionStorage implements FunctionStorageDriver {
  private db: ChromaVectorDB;
  private embedder: EmbeddingGenerator;
  private logger: Logger;
  private collectionName: string;
  
  /**
   * Create a new database-backed function storage
   * 
   * @param db Vector database instance
   * @param embedder Embedding generator for function discovery
   * @param options Options for the storage
   */
  constructor(
    db: ChromaVectorDB,
    embedder: EmbeddingGenerator,
    options: {
      collectionName?: string;
      logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
    } = {}
  ) {
    this.db = db;
    this.embedder = embedder;
    this.logger = new Logger(options.logLevel || 'info');
    this.collectionName = options.collectionName || 'function-registry';
  }
  
  /**
   * Generate embeddings for a function definition to enable semantic search
   * 
   * @param func Function definition
   * @returns Promise resolving to embeddings vector
   */
  private async generateFunctionEmbedding(func: FunctionDefinition): Promise<number[]> {
    try {
      // Create a rich text representation of the function for embedding
      const functionText = [
        `Function: ${func.name}`,
        `Description: ${func.description}`,
        `Tags: ${func.tags?.join(', ') || ''}`,
        `Parameters: ${JSON.stringify(func.parameters)}`
      ].join('\n');
      
      // Generate embeddings
      const embedding = await this.embedder.generateEmbedding(functionText);
      return embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embeddings for function ${func.name}:`, error);
      // Return empty embedding as fallback (won't be semantically searchable)
      return [];
    }
  }
  
  /**
   * Save a function definition to storage
   * 
   * @param func Function definition to save
   * @returns Promise resolving to success status
   */
  async saveFunction(func: FunctionDefinition): Promise<boolean> {
    try {
      // Generate embeddings for the function
      const embedding = await this.generateFunctionEmbedding(func);
      
      // Create document for database (excluding implementation)
      const functionToStore = {
        ...func,
        implementation: undefined // Don't store the implementation
      };
      
      // Create the document
      const document: FunctionDocument = {
        id: `func:${func.name}`,
        content: JSON.stringify(functionToStore),
        metadata: {
          type: 'function-definition',
          name: func.name,
          description: func.description,
          tags: func.tags,
          compatibleWith: func.compatibleWith,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      };
      
      // Add to database
      await this.db.addDocument({
        collectionName: this.collectionName,
        document,
        embedding
      });
      
      this.logger.info(`Saved function ${func.name} to database`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save function ${func.name}:`, error);
      return false;
    }
  }
  
  /**
   * Retrieve a function definition by name
   * 
   * @param name Function name
   * @returns Promise resolving to function definition or null if not found
   */
  async getFunction(name: string): Promise<FunctionDefinition | null> {
    try {
      // Retrieve from database
      const results = await this.db.search({
        collectionName: this.collectionName,
        query: `metadata.name:${name} AND metadata.type:function-definition`,
        limit: 1
      });
      
      if (!results.length) {
        return null;
      }
      
      // Convert to function definition
      const document = results[0].document as FunctionDocument;
      const parsed = JSON.parse(document.content);
      
      return {
        name: parsed.name,
        description: parsed.description,
        parameters: parsed.parameters,
        tags: parsed.tags,
        compatibleWith: parsed.compatibleWith
        // Note: implementation is not stored in the database
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve function ${name}:`, error);
      return null;
    }
  }
  
  /**
   * List all function definitions
   * 
   * @param tag Optional tag to filter by
   * @returns Promise resolving to array of function definitions
   */
  async listFunctions(tag?: string): Promise<FunctionDefinition[]> {
    try {
      // Build query
      let query = 'metadata.type:function-definition';
      if (tag) {
        query += ` AND metadata.tags:${tag}`;
      }
      
      // Search the database
      const results = await this.db.search({
        collectionName: this.collectionName,
        query,
        limit: 100 // Reasonable upper limit
      });
      
      // Convert to function definitions
      return results.map(result => {
        const document = result.document as FunctionDocument;
        const parsed = JSON.parse(document.content);
        
        return {
          name: parsed.name,
          description: parsed.description,
          parameters: parsed.parameters,
          tags: parsed.tags,
          compatibleWith: parsed.compatibleWith
        };
      });
    } catch (error) {
      this.logger.error('Failed to list functions:', error);
      return [];
    }
  }
  
  /**
   * Delete a function definition
   * 
   * @param name Function name
   * @returns Promise resolving to success status
   */
  async deleteFunction(name: string): Promise<boolean> {
    try {
      // Find the document first
      const results = await this.db.search({
        collectionName: this.collectionName,
        query: `metadata.name:${name} AND metadata.type:function-definition`,
        limit: 1
      });
      
      if (!results.length) {
        return false;
      }
      
      // Delete from database
      await this.db.deleteDocument({
        collectionName: this.collectionName,
        id: results[0].document.id
      });
      
      // Also delete stats
      await this.db.search({
        collectionName: this.collectionName,
        query: `metadata.name:${name} AND metadata.type:function-stats`,
        limit: 1
      }).then(async results => {
        if (results.length) {
          await this.db.deleteDocument({
            collectionName: this.collectionName,
            id: results[0].document.id
          });
        }
      }).catch(() => {});
      
      this.logger.info(`Deleted function ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete function ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Update function usage statistics
   * 
   * @param name Function name
   * @param stats Updated usage statistics
   * @returns Promise resolving to success status
   */
  async updateUsageStats(name: string, stats: Partial<FunctionUsageStats>): Promise<boolean> {
    try {
      // Find current stats
      const results = await this.db.search({
        collectionName: this.collectionName,
        query: `metadata.name:${name} AND metadata.type:function-stats`,
        limit: 1
      });
      
      // Current stats from database or default
      let currentStats: FunctionUsageStats;
      let documentId: string;
      
      if (results.length) {
        const statsDoc = results[0].document as FunctionStatsDocument;
        documentId = statsDoc.id;
        const parsedStats = JSON.parse(statsDoc.content);
        
        currentStats = {
          invocationCount: statsDoc.metadata.invocationCount,
          errorCount: statsDoc.metadata.errorCount,
          usedByModels: new Set(statsDoc.metadata.usedByModels),
          avgExecutionTimeMs: statsDoc.metadata.avgExecutionTimeMs,
          lastUsed: new Date(statsDoc.metadata.lastUsed)
        };
      } else {
        // Create new stats doc
        documentId = `stats:${name}`;
        currentStats = {
          invocationCount: 0,
          errorCount: 0,
          usedByModels: new Set<string>(),
          avgExecutionTimeMs: 0,
          lastUsed: new Date()
        };
      }
      
      // Update stats
      const newInvocationCount = stats.invocationCount !== undefined ? 
        stats.invocationCount : currentStats.invocationCount;
      
      const newErrorCount = stats.errorCount !== undefined ?
        stats.errorCount : currentStats.errorCount;
      
      // Update models used
      const usedByModels = new Set(currentStats.usedByModels);
      if (stats.usedByModels) {
        for (const model of stats.usedByModels) {
          usedByModels.add(model);
        }
      }
      
      // Calculate new average execution time
      const newAvgTime = stats.avgExecutionTimeMs !== undefined ?
        stats.avgExecutionTimeMs : currentStats.avgExecutionTimeMs;
      
      // Update last used timestamp
      const lastUsed = stats.lastUsed || new Date();
      
      // Build document
      const updatedStats: FunctionStatsDocument = {
        id: documentId,
        content: JSON.stringify({
          invocationCount: newInvocationCount,
          errorCount: newErrorCount,
          usedByModels: Array.from(usedByModels),
          avgExecutionTimeMs: newAvgTime,
          lastUsed: lastUsed.toISOString()
        }),
        metadata: {
          type: 'function-stats',
          name,
          invocationCount: newInvocationCount,
          errorCount: newErrorCount,
          usedByModels: Array.from(usedByModels),
          avgExecutionTimeMs: newAvgTime,
          lastUsed: lastUsed.toISOString()
        }
      };
      
      // Save to database
      if (results.length) {
        // Update existing with empty embedding since we don't need semantic search for stats
        await this.db.updateDocument({
          collectionName: this.collectionName,
          document: updatedStats,
          embedding: new Array(1536).fill(0) // Standard size embedding with zeros
        });
      } else {
        // Create new with empty embedding since we don't need semantic search for stats
        await this.db.addDocument({
          collectionName: this.collectionName,
          document: updatedStats,
          embedding: new Array(1536).fill(0) // Standard size embedding with zeros
        });
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update stats for function ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Get function usage statistics
   * 
   * @param name Function name
   * @returns Promise resolving to usage statistics or null if not found
   */
  async getUsageStats(name: string): Promise<FunctionUsageStats | null> {
    try {
      // Find stats
      const results = await this.db.search({
        collectionName: this.collectionName,
        query: `metadata.name:${name} AND metadata.type:function-stats`,
        limit: 1
      });
      
      if (!results.length) {
        return null;
      }
      
      // Convert to usage stats
      const statsDoc = results[0].document as FunctionStatsDocument;
      
      return {
        invocationCount: statsDoc.metadata.invocationCount,
        errorCount: statsDoc.metadata.errorCount,
        usedByModels: new Set(statsDoc.metadata.usedByModels),
        avgExecutionTimeMs: statsDoc.metadata.avgExecutionTimeMs,
        lastUsed: new Date(statsDoc.metadata.lastUsed)
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve stats for function ${name}:`, error);
      return null;
    }
  }
  
  /**
   * Find functions by semantic similarity to a description
   * 
   * @param description Text description of desired functionality
   * @param limit Maximum number of results to return
   * @returns Promise resolving to matching function definitions
   */
  async findSimilarFunctions(description: string, limit: number = 5): Promise<FunctionDefinition[]> {
    try {
      // Generate embedding for the description
      const embedding = await this.embedder.generateEmbedding(description);
      
      // Search the database
      const results = await this.db.searchByVector({
        collectionName: this.collectionName,
        vector: embedding,
        filter: "metadata.type = 'function-definition'",
        limit
      });
      
      // Convert to function definitions
      return results.map(result => {
        const document = result.document as FunctionDocument;
        const parsed = JSON.parse(document.content);
        
        return {
          name: parsed.name,
          description: parsed.description,
          parameters: parsed.parameters,
          tags: parsed.tags,
          compatibleWith: parsed.compatibleWith
        };
      });
    } catch (error) {
      this.logger.error('Failed to find similar functions:', error);
      return [];
    }
  }
}
