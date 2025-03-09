/**
 * Vector database implementation for knowledge storage and retrieval
 */
import { VectorDB as IVectorDB, VectorDBConfig, VectorDocument, VectorSearchOptions, VectorDBType, VectorDocumentOptions, ChromaVectorDBConfig, VectorSearchResult } from '../interfaces/index.js';
export { VectorDBType } from '../interfaces/index.js';
/**
 * Extended vector database configuration with type
 */
export interface ExtendedVectorDBConfig extends VectorDBConfig {
    /** Type of vector database to use (overrides the one from VectorDBConfig) */
    type: VectorDBType;
    /** Chroma-specific configuration (only used if type is CHROMA) */
    chroma?: Omit<ChromaVectorDBConfig, keyof VectorDBConfig>;
}
/**
 * Create a vector database instance
 *
 * @param config - Configuration options
 * @returns A vector database instance
 */
export declare function createVectorDB(config: ExtendedVectorDBConfig): IVectorDB;
/**
 * In-memory vector database with optional persistence
 *
 * This implementation provides a simple vector database that stores documents
 * and their embeddings in memory, with optional persistence to disk.
 */
export declare class VectorDB implements IVectorDB {
    private documents;
    private vectors;
    private config;
    private logger;
    private defaultNamespace;
    /**
     * Create a new vector database
     *
     * @param config - Configuration options
     */
    constructor(config: VectorDBConfig);
    /**
     * Add a document to the vector database
     *
     * @param options - Document options
     * @returns Promise resolving to the document ID
     */
    addDocument(options: VectorDocumentOptions): Promise<string>;
    /**
     * Add multiple documents to the vector database
     *
     * @param documents - Array of documents to add
     * @param namespace - Optional namespace/collection to add the documents to
     * @returns Promise resolving to an array of document IDs
     */
    addDocuments(documents: VectorDocument[], namespace?: string): Promise<string[]>;
    /**
     * Search for similar documents using text query
     *
     * @param query - The text to search for
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    searchByText(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Search for similar documents using a vector
     *
     * @param options - Search options with vector
     * @returns Promise resolving to an array of search results
     */
    searchByVector(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Search for documents
     *
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    search(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Get a document by its ID
     *
     * @param id - The document ID
     * @param namespace - Optional namespace/collection to search in
     * @returns Promise resolving to the document or null if not found
     */
    getDocument(id: string, namespace?: string): Promise<VectorDocument | null>;
    /**
     * Update an existing document
     *
     * @param options - Document options
     * @returns Promise resolving when update is complete
     */
    updateDocument(options: VectorDocumentOptions): Promise<void>;
    /**
     * Delete a document by its ID
     *
     * @param id - The document ID
     * @param namespace - Optional namespace/collection
     * @returns Promise resolving to a boolean indicating success
     */
    deleteDocument(id: string, namespace?: string): Promise<boolean>;
    /**
     * Delete all documents in a namespace/collection
     *
     * @param collectionName - The collection name to clear
     * @returns Promise resolving when deletion is complete
     */
    deleteCollection(collectionName: string): Promise<void>;
    /**
     * Get document count in a collection
     *
     * @param collectionName - The collection name
     * @returns Promise resolving to the number of documents
     */
    count(collectionName: string): Promise<number>;
    /**
     * Get all available namespaces
     *
     * @returns Promise resolving to an array of namespace names
     */
    listNamespaces(): Promise<string[]>;
    /**
     * Save the current state to disk (if persistence is enabled)
     *
     * @returns Promise resolving when save is complete
     */
    save(): Promise<void>;
    /**
     * Load state from disk (if persistence is enabled)
     *
     * @returns Promise resolving when load is complete
     */
    load(): Promise<void>;
    /**
     * Generate a unique ID for a document
     *
     * @returns A unique ID string
     */
    private generateId;
    /**
     * Create a random vector for testing purposes
     *
     * @returns A random vector with the configured dimensions
     */
    private createRandomVector;
    /**
     * Calculate similarity between two vectors
     *
     * @param a - First vector
     * @param b - Second vector
     * @returns Similarity score (0-1, higher is more similar)
     */
    private calculateSimilarity;
    /**
     * Calculate cosine similarity between two vectors
     *
     * @param a - First vector
     * @param b - Second vector
     * @returns Cosine similarity (0-1, higher is more similar)
     */
    private cosineSimilarity;
    /**
     * Calculate Euclidean similarity between two vectors
     *
     * @param a - First vector
     * @param b - Second vector
     * @returns Euclidean similarity (0-1, higher is more similar)
     */
    private euclideanSimilarity;
    /**
     * Calculate dot product between two vectors
     *
     * @param a - First vector
     * @param b - Second vector
     * @returns Dot product
     */
    private dotProduct;
}
//# sourceMappingURL=vector-db.d.ts.map