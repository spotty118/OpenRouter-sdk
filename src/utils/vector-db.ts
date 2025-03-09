/**
 * Vector database implementation for knowledge storage and retrieval
 */

import { 
  IVectorDB, 
  VectorDBConfig, 
  VectorDocument, 
  VectorSearchOptions, 
  VectorSearchResult 
} from '../interfaces';
import { Logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * In-memory vector database with optional persistence
 * 
 * This implementation provides a simple vector database that stores documents
 * and their embeddings in memory, with optional persistence to disk.
 */
export class VectorDB implements IVectorDB {
  private documents: Map<string, Map<string, VectorDocument>> = new Map();
  private vectors: Map<string, Map<string, number[]>> = new Map();
  private config: Required<VectorDBConfig>;
  private logger: Logger;
  private defaultNamespace = 'default';

  /**
   * Create a new vector database
   * 
   * @param config - Configuration options
   */
  constructor(config: VectorDBConfig) {
    this.config = {
      dimensions: config.dimensions,
      maxVectors: config.maxVectors || 10000,
      similarityMetric: config.similarityMetric || 'cosine',
      persistToDisk: config.persistToDisk || false,
      storagePath: config.storagePath || './.vectordb'
    };
    
    this.logger = new Logger('info');
    
    // Initialize default namespace
    this.documents.set(this.defaultNamespace, new Map());
    this.vectors.set(this.defaultNamespace, new Map());
    
    // Load from disk if persistence is enabled
    if (this.config.persistToDisk) {
      this.load().catch(err => {
        this.logger.warn(`Failed to load vector database: ${err.message}`);
      });
    }
  }

  /**
   * Add a document to the vector database
   * 
   * @param document - The document to add
   * @param namespace - Optional namespace/collection to add the document to
   * @returns Promise resolving to the document ID
   */
  async addDocument(document: VectorDocument, namespace: string = this.defaultNamespace): Promise<string> {
    // Create namespace if it doesn't exist
    if (!this.documents.has(namespace)) {
      this.documents.set(namespace, new Map());
      this.vectors.set(namespace, new Map());
    }
    
    // Generate ID if not provided
    if (!document.id) {
      document.id = this.generateId();
    }
    
    // Store document
    const documentsMap = this.documents.get(namespace);
    if (documentsMap) {
      documentsMap.set(document.id, { ...document });
    }
    
    // Store vector if provided
    const vectorsMap = this.vectors.get(namespace);
    if (vectorsMap) {
      if (document.embedding) {
        if (document.embedding.length !== this.config.dimensions) {
          throw new Error(`Vector dimensions mismatch: expected ${this.config.dimensions}, got ${document.embedding.length}`);
        }
        vectorsMap.set(document.id, [...document.embedding]);
      } else {
        // In a real implementation, we would generate embeddings here
        // using an embedding model like OpenAI's text-embedding-ada-002
        // For now, we'll just create a random vector
        vectorsMap.set(document.id, this.createRandomVector());
      }
    }
    
    // Check if we need to enforce max vectors limit
    if (vectorsMap && vectorsMap.size > this.config.maxVectors) {
      // Remove oldest entry (first key in the map)
      const oldestId = vectorsMap.keys().next().value;
      if (oldestId !== undefined) {
        vectorsMap.delete(oldestId);
        documentsMap?.delete(oldestId);
      }
    }
    
    // Save to disk if persistence is enabled
    if (this.config.persistToDisk) {
      await this.save();
    }
    
    return document.id;
  }

  /**
   * Add multiple documents to the vector database
   * 
   * @param documents - Array of documents to add
   * @param namespace - Optional namespace/collection to add the documents to
   * @returns Promise resolving to an array of document IDs
   */
  async addDocuments(documents: VectorDocument[], namespace: string = this.defaultNamespace): Promise<string[]> {
    const ids: string[] = [];
    
    for (const document of documents) {
      const id = await this.addDocument(document, namespace);
      ids.push(id);
    }
    
    return ids;
  }

  /**
   * Search for similar documents using text query
   * 
   * @param text - The text to search for
   * @param options - Search options
   * @returns Promise resolving to an array of search results
   */
  async searchByText(text: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    // In a real implementation, we would generate an embedding for the text
    // and then search by vector. For now, we'll just create a random vector.
    const vector = this.createRandomVector();
    return this.searchByVector(vector, options);
  }

  /**
   * Search for similar documents using a vector
   * 
   * @param vector - The embedding vector to search with
   * @param options - Search options
   * @returns Promise resolving to an array of search results
   */
  async searchByVector(vector: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const namespace = options.namespace || this.defaultNamespace;
    const limit = options.limit || 10;
    const minScore = options.minScore || 0;
    
    if (!this.vectors.has(namespace)) {
      return [];
    }
    
    if (vector.length !== this.config.dimensions) {
      throw new Error(`Vector dimensions mismatch: expected ${this.config.dimensions}, got ${vector.length}`);
    }
    
    const results: VectorSearchResult[] = [];
    const vectorsMap = this.vectors.get(namespace);
    const documentsMap = this.documents.get(namespace);
    
    if (!vectorsMap || !documentsMap) {
      return [];
    }
    
    // Calculate similarity scores for all vectors in the namespace
    for (const [id, docVector] of vectorsMap.entries()) {
      const score = this.calculateSimilarity(vector, docVector);
      
      if (score >= minScore) {
        const document = documentsMap.get(id);
        
        if (!document) {
          continue;
        }
        
        // Apply filter if provided
        if (options.filter && !options.filter(document.metadata || {})) {
          continue;
        }
        
        // Create a copy of the document without the embedding unless requested
        const resultDoc: VectorDocument = {
          ...document,
          embedding: options.includeVectors ? document.embedding : undefined
        };
        
        results.push({
          document: resultDoc,
          score
        });
      }
    }
    
    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get a document by its ID
   * 
   * @param id - The document ID
   * @param namespace - Optional namespace/collection to search in
   * @returns Promise resolving to the document or null if not found
   */
  async getDocument(id: string, namespace: string = this.defaultNamespace): Promise<VectorDocument | null> {
    if (!this.documents.has(namespace)) {
      return null;
    }
    
    const documentsMap = this.documents.get(namespace);
    if (!documentsMap) {
      return null;
    }
    
    const document = documentsMap.get(id);
    
    if (!document) {
      return null;
    }
    
    return { ...document };
  }

  /**
   * Update an existing document
   * 
   * @param id - The document ID
   * @param document - The updated document data
   * @param namespace - Optional namespace/collection
   * @returns Promise resolving to a boolean indicating success
   */
  async updateDocument(id: string, document: Partial<VectorDocument>, namespace: string = this.defaultNamespace): Promise<boolean> {
    if (!this.documents.has(namespace)) {
      return false;
    }
    
    const documentsMap = this.documents.get(namespace);
    const vectorsMap = this.vectors.get(namespace);
    
    if (!documentsMap || !vectorsMap) {
      return false;
    }
    
    if (!documentsMap.has(id)) {
      return false;
    }
    
    const existingDoc = documentsMap.get(id);
    if (!existingDoc) {
      return false;
    }
    
    const updatedDoc = { ...existingDoc, ...document };
    
    // Update document
    documentsMap.set(id, updatedDoc);
    
    // Update vector if provided
    if (document.embedding) {
      if (document.embedding.length !== this.config.dimensions) {
        throw new Error(`Vector dimensions mismatch: expected ${this.config.dimensions}, got ${document.embedding.length}`);
      }
      vectorsMap.set(id, [...document.embedding]);
    }
    
    // Save to disk if persistence is enabled
    if (this.config.persistToDisk) {
      await this.save();
    }
    
    return true;
  }

  /**
   * Delete a document by its ID
   * 
   * @param id - The document ID
   * @param namespace - Optional namespace/collection
   * @returns Promise resolving to a boolean indicating success
   */
  async deleteDocument(id: string, namespace: string = this.defaultNamespace): Promise<boolean> {
    if (!this.documents.has(namespace)) {
      return false;
    }
    
    const documentsMap = this.documents.get(namespace);
    const vectorsMap = this.vectors.get(namespace);
    
    if (!documentsMap || !vectorsMap) {
      return false;
    }
    
    if (!documentsMap.has(id)) {
      return false;
    }
    
    // Delete document and vector
    documentsMap.delete(id);
    vectorsMap.delete(id);
    
    // Save to disk if persistence is enabled
    if (this.config.persistToDisk) {
      await this.save();
    }
    
    return true;
  }

  /**
   * Delete all documents in a namespace
   * 
   * @param namespace - The namespace to clear
   * @returns Promise resolving to the number of documents deleted
   */
  async deleteNamespace(namespace: string): Promise<number> {
    if (!this.documents.has(namespace)) {
      return 0;
    }
    
    const documentsMap = this.documents.get(namespace);
    if (!documentsMap) {
      return 0;
    }
    
    const count = documentsMap.size;
    
    // Delete namespace
    this.documents.delete(namespace);
    this.vectors.delete(namespace);
    
    // Save to disk if persistence is enabled
    if (this.config.persistToDisk) {
      await this.save();
    }
    
    return count;
  }

  /**
   * Get all available namespaces
   * 
   * @returns Promise resolving to an array of namespace names
   */
  async listNamespaces(): Promise<string[]> {
    return Array.from(this.documents.keys());
  }

  /**
   * Save the current state to disk (if persistence is enabled)
   * 
   * @returns Promise resolving when save is complete
   */
  async save(): Promise<void> {
    if (!this.config.persistToDisk) {
      return;
    }
    
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(this.config.storagePath)) {
        fs.mkdirSync(this.config.storagePath, { recursive: true });
      }
      
      // Prepare data to save
      const data = {
        config: this.config,
        namespaces: Array.from(this.documents.keys()),
        documents: {} as Record<string, Record<string, VectorDocument>>,
        vectors: {} as Record<string, Record<string, number[]>>
      };
      
      // Convert maps to objects for serialization
      for (const namespace of data.namespaces) {
        const documentsMap = this.documents.get(namespace);
        const vectorsMap = this.vectors.get(namespace);
        
        if (documentsMap && vectorsMap) {
          data.documents[namespace] = Object.fromEntries(documentsMap as Map<string, VectorDocument>);
          data.vectors[namespace] = Object.fromEntries(vectorsMap as Map<string, number[]>);
        }
      }
      
      // Write to file
      const filePath = path.join(this.config.storagePath, 'vectordb.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      this.logger.debug(`Vector database saved to ${filePath}`);
    } catch (err) {
      this.logger.error('Failed to save vector database:', err);
      throw err;
    }
  }

  /**
   * Load state from disk (if persistence is enabled)
   * 
   * @returns Promise resolving when load is complete
   */
  async load(): Promise<void> {
    if (!this.config.persistToDisk) {
      return;
    }
    
    try {
      const filePath = path.join(this.config.storagePath, 'vectordb.json');
      
      if (!fs.existsSync(filePath)) {
        this.logger.debug('No saved vector database found');
        return;
      }
      
      // Read from file
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Update config
      this.config = data.config;
      
      // Clear existing data
      this.documents.clear();
      this.vectors.clear();
      
      // Load namespaces, documents, and vectors
      for (const namespace of data.namespaces) {
        this.documents.set(namespace, new Map(Object.entries(data.documents[namespace])));
        this.vectors.set(namespace, new Map(Object.entries(data.vectors[namespace])));
      }
      
      this.logger.debug(`Vector database loaded from ${filePath}`);
    } catch (err) {
      this.logger.error('Failed to load vector database:', err);
      throw err;
    }
  }

  /**
   * Generate a unique ID for a document
   * 
   * @returns A unique ID string
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a random vector for testing purposes
   * 
   * @returns A random vector with the configured dimensions
   */
  private createRandomVector(): number[] {
    return Array.from({ length: this.config.dimensions }, () => Math.random() * 2 - 1);
  }

  /**
   * Calculate similarity between two vectors
   * 
   * @param a - First vector
   * @param b - Second vector
   * @returns Similarity score (0-1, higher is more similar)
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions mismatch: ${a.length} vs ${b.length}`);
    }
    
    switch (this.config.similarityMetric) {
      case 'cosine':
        return this.cosineSimilarity(a, b);
      case 'euclidean':
        return this.euclideanSimilarity(a, b);
      case 'dot':
        return this.dotProduct(a, b);
      default:
        return this.cosineSimilarity(a, b);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * 
   * @param a - First vector
   * @param b - Second vector
   * @returns Cosine similarity (0-1, higher is more similar)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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
   * Calculate Euclidean similarity between two vectors
   * 
   * @param a - First vector
   * @param b - Second vector
   * @returns Euclidean similarity (0-1, higher is more similar)
   */
  private euclideanSimilarity(a: number[], b: number[]): number {
    let sum = 0;
    
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    const distance = Math.sqrt(sum);
    // Convert distance to similarity (0-1)
    return 1 / (1 + distance);
  }

  /**
   * Calculate dot product between two vectors
   * 
   * @param a - First vector
   * @param b - Second vector
   * @returns Dot product
   */
  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    
    // Normalize to 0-1 range (approximately)
    return (sum + a.length) / (2 * a.length);
  }
}