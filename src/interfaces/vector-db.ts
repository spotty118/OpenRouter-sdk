/**
 * Vector Database Interfaces
 */

/**
 * Vector database configuration
 */
export interface VectorDBConfig {
  /**
   * Vector dimension size
   */
  dimensions: number;
  
  /**
   * Database type
   */
  type: VectorDBType;
  
  /**
   * Vector similarity metric
   */
  similarityMetric?: string;
  
  /**
   * Additional configuration options
   */
  [key: string]: any | number | string | undefined | VectorDBType;
}

/**
 * Extended vector database configuration
 */
export interface ExtendedVectorDBConfig extends VectorDBConfig {
  /**
   * Database-specific configuration
   */
  [key: string]: any | number | string | undefined;
}

/**
 * Vector database types
 */
export enum VectorDBType {
  /** Chroma vector database */
  CHROMA = 'chroma', 
  /** In-memory vector database with optional persistence */
  IN_MEMORY = 'in-memory'
}

/**
 * Base document interface for vector database storage
 */
export interface VectorDocument {
  /**
   * Unique identifier for the document
   */
  id: string;
  
  /**
   * Document content (can be text, JSON string, etc.)
   */
  content: string;
  
  /**
   * Metadata associated with the document
   */
  metadata: Record<string, any>;

  /**
   * Vector embedding for semantic search
   */
  embedding?: number[];
}

/**
 * Search result interface for vector queries
 */
export interface VectorSearchResult {
  /**
   * Document matching the query
   */
  document: VectorDocument;
  
  /**
   * Similarity score (0-1, higher is better)
   */
  score: number;
}

/**
 * Document options for adding/updating documents
 */
export interface VectorDocumentOptions {
  /**
   * Collection name
   */
  collectionName: string;
  
  /**
   * Document to store
   */
  document: VectorDocument;
  
  /**
   * Vector embedding for semantic search
   */
  embedding: number[];
}

/**
 * Search options for vector database queries
 */
export interface VectorSearchOptions {
  /**
   * Collection name to search in (optional if namespace is provided)
   */
  collectionName?: string;
  
  /**
   * Query string or vector depending on search type
   */
  query?: string;
  vector?: number[];
  
  /**
   * Optional filter function
   */
  filter?: (metadata: Record<string, any>) => boolean;
  
  /**
   * Maximum results to return
   */
  limit?: number;

  /**
   * Minimum similarity score threshold (0-1)
   */
  minScore?: number;

  /**
   * Whether to include vector embeddings in results
   */
  includeVectors?: boolean;

  /**
   * Optional namespace
   */
  namespace?: string;
}

/**
 * Delete options for removing documents
 */
export interface VectorDeleteOptions {
  /**
   * Collection name
   */
  collectionName: string;
  
  /**
   * Document ID to delete
   */
  id: string;
}

/**
 * Collection creation options
 */
export interface VectorCollectionOptions {
  /**
   * Vector dimension size
   */
  dimension?: number;
  
  /**
   * Collection metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Generic vector database interface
 */
export interface VectorDB {
  /**
   * Add a document to the database
   */
  addDocument(options: VectorDocumentOptions): Promise<string>;
  
  /**
   * Add multiple documents to the database
   */
  addDocuments(documents: VectorDocument[], namespace?: string): Promise<string[]>;
  
  /**
   * Update a document in the database
   */
  updateDocument(options: VectorDocumentOptions): Promise<void>;
  
  /**
   * Delete a document from the database
   */
  deleteDocument(id: string, namespace?: string): Promise<boolean>;
  
  /**
   * Search for documents by text query or vector embedding
   */
  search(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
  
  /**
   * Search for documents by text query
   */
  searchByText(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  
  /**
   * Search for documents by vector embedding
   */
  searchByVector(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
  
  /**
   * Get document count in a collection
   */
  count(collectionName: string): Promise<number>;
  
  /**
   * Delete an entire collection
   */
  deleteCollection(collectionName: string): Promise<void>;

  /**
   * Get a document by ID
   */
  getDocument(id: string, namespace?: string): Promise<VectorDocument | null>;

  /**
   * List all available namespaces
   */
  listNamespaces(): Promise<string[]>;
}

/**
 * Alias for VectorDB interface to maintain backward compatibility
 * @deprecated Use VectorDB instead
 */
export type IVectorDB = VectorDB;

/**
 * Chroma vector database configuration
 */
export interface ChromaVectorDBConfig extends VectorDBConfig {

  /**
   * Chroma server URL
   */
  chromaUrl?: string;

  /**
   * Collection prefix
   */
  collectionPrefix?: string;

  /**
   * Use in-memory storage
   */
  useInMemory?: boolean;
}
