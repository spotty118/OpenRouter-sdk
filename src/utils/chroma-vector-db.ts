/**
 * ChromaDB Vector Database Implementation
 * 
 * This module provides a ChromaDB-based implementation of vector database functionality
 * for semantic search and document storage.
 */

import { ChromaClient, Collection } from 'chromadb';
import { 
  VectorDocument, 
  VectorSearchResult,
  VectorDocumentOptions,
  VectorSearchOptions,
  VectorDeleteOptions,
  VectorCollectionOptions,
  VectorDB
} from '../interfaces/vector-db.js';
import { Logger } from './logger.js';

/**
 * ChromaDB Vector Database implementation
 */
export class ChromaVectorDB implements VectorDB {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();
  private logger: Logger;
  
  /**
   * Create a new ChromaDB vector database instance
   * 
   * @param config Configuration options
   */
  constructor(config: {
    host?: string;
    port?: number;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  } = {}) {
    this.client = new ChromaClient({
      path: `http://${config.host || 'localhost'}:${config.port || 8000}`
    });
    this.logger = new Logger(config.logLevel || 'info');
  }
  
  /**
   * Get or create a collection
   * 
   * @param name Collection name
   * @param options Collection options
   * @returns Collection instance
   */
  private async getOrCreateCollection(
    name: string,
    options: VectorCollectionOptions = {}
  ): Promise<Collection> {
    // Check cache first
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }
    
    try {
      // Try to get existing collection
      const collection = await this.client.getCollection({
        name,
        embeddingFunction: options.dimension ? { dimension: options.dimension } : undefined,
        metadata: options.metadata
      });
      
      this.collections.set(name, collection);
      return collection;
    } catch {
      // Create new collection if it doesn't exist
      const collection = await this.client.createCollection({
        name,
        embeddingFunction: options.dimension ? { dimension: options.dimension } : undefined,
        metadata: options.metadata
      });
      
      this.collections.set(name, collection);
      return collection;
    }
  }
  
  /**
   * Add a document to the database
   * 
   * @param options Document options
   */
  async addDocument(options: VectorDocumentOptions): Promise<string> {
    try {
      const collection = await this.getOrCreateCollection(options.collectionName);
      
      await collection.add({
        ids: [options.document.id],
        embeddings: [options.embedding],
        metadatas: [options.document.metadata],
        documents: [options.document.content]
      });
      
      this.logger.info(`Added document ${options.document.id} to collection ${options.collectionName}`);
      
      return options.document.id;
    } catch (error) {
      this.logger.error('Failed to add document:', error);
      throw error;
    }
  }
  
  /**
   * Update a document in the database
   * 
   * @param options Document options
   */
  async updateDocument(options: VectorDocumentOptions): Promise<void> {
    try {
      const collection = await this.getOrCreateCollection(options.collectionName);
      
      await collection.update({
        ids: [options.document.id],
        embeddings: [options.embedding],
        metadatas: [options.document.metadata],
        documents: [options.document.content]
      });
      
      this.logger.info(`Updated document ${options.document.id} in collection ${options.collectionName}`);
    } catch (error) {
      this.logger.error('Failed to update document:', error);
      throw error;
    }
  }
  
  /**
   * Delete a document from the database
   * 
   * @param options Delete options
   */
  async deleteDocument(id: string, namespace: string = 'default'): Promise<boolean> {
    try {
      const collection = await this.getOrCreateCollection(namespace);
      await collection.delete({ ids: [id] });
      
      this.logger.info(`Deleted document ${id} from collection ${namespace}`);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to delete document:', error);
      throw error;
    }
  }
  
  /**
   * Search for documents by text query or vector embedding
   * 
   * @param options Search options
   * @returns Matching documents with similarity scores
   */
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    try {
      const collectionName = options.collectionName || options.namespace || 'default';
      const collection = await this.getOrCreateCollection(collectionName);
      
      // Prepare search parameters
      const searchParams: any = {
        nResults: options.limit || 10
      };
      
      // Add where filter if provided
      if (options.filter) {
        searchParams.where = options.filter;
      }
      
      // Define type for Chroma query results
      interface ChromaQueryResult {
        ids: string[][];
        documents: (string | null)[][];
        metadatas: (Record<string, any> | null)[][];
        distances?: number[][];
      }
      
      // Perform search
      let results: ChromaQueryResult;
      if (options.vector) {
        // Vector similarity search
        results = await collection.query({
          queryEmbeddings: [options.vector],
          ...searchParams
        });
      } else if (options.query) {
        // Text search (requires collection to have an embedding function)
        results = await collection.query({
          queryTexts: [options.query],
          ...searchParams
        });
      } else {
        throw new Error('Either query text or vector must be provided');
      }
      
      // Convert results to standard format
      return results.ids[0].map((id: string, i: number) => ({
        document: {
          id,
          // Handle null content by providing empty string as fallback
          content: results.documents[0][i] || '',
          // Handle null metadata by providing empty object as fallback
          metadata: results.metadatas[0][i] || {}
        },
        score: results.distances ? 1 - (results.distances[0][i] || 0) : 1
      }));
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }
  
  /**
   * Search for documents by vector embedding
   * 
   * @param options Search options (must include vector)
   * @returns Matching documents with similarity scores
   */
  async searchByVector(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    if (!options.vector) {
      throw new Error('Vector embedding must be provided for vector search');
    }
    return this.search(options);
  }
  
  /**
   * Get total count of documents in a collection
   * 
   * @param collectionName Collection name
   * @returns Document count
   */
  async count(collectionName: string): Promise<number> {
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      return collection.count();
    } catch (error) {
      this.logger.error('Failed to get document count:', error);
      throw error;
    }
  }
  
  /**
   * Delete an entire collection
   * 
   * @param collectionName Collection name
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection(collectionName);
      this.collections.delete(collectionName);
      this.logger.info(`Deleted collection ${collectionName}`);
    } catch (error) {
      this.logger.error('Failed to delete collection:', error);
      throw error;
    }
  }
  
  /**
   * Reset the database (delete all collections)
   */
  async reset(): Promise<void> {
    try {
      await this.client.reset();
      this.collections.clear();
      this.logger.info('Reset database');
    } catch (error) {
      this.logger.error('Failed to reset database:', error);
      throw error;
    }
  }
  
  /**
   * Add multiple documents to the database
   * 
   * @param documents Array of documents to add
   * @param namespace Optional namespace/collection
   * @returns Array of document IDs
   */
  async addDocuments(documents: VectorDocument[], namespace: string = 'default'): Promise<string[]> {
    const ids: string[] = [];
    
    for (const document of documents) {
      // Create document options
      const options: VectorDocumentOptions = {
        collectionName: namespace,
        document,
        embedding: document.embedding || []
      };
      
      const id = await this.addDocument(options);
      ids.push(id);
    }
    
    return ids;
  }
  
  /**
   * Search by text query
   * 
   * @param query Text query
   * @param options Search options
   * @returns Search results
   */
  async searchByText(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    return this.search({ ...options, query });
  }
  
  /**
   * Get a document by ID
   * 
   * @param id Document ID
   * @param namespace Optional namespace
   * @returns Document or null if not found
   */
  async getDocument(id: string, namespace: string = 'default'): Promise<VectorDocument | null> {
    // Implementation would require fetching the document from ChromaDB
    // For now, return null as a placeholder
    return null;
  }
  
  /**
   * List all available namespaces
   * 
   * @returns Array of namespace names
   */
  async listNamespaces(): Promise<string[]> {
    // Implementation would require listing all collections from ChromaDB
    return ['default'];
  }
}
