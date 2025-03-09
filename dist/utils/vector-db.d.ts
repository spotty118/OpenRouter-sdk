/**
 * Vector database implementation for knowledge storage and retrieval
 */
import { IVectorDB, VectorDBConfig, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../interfaces';
import { ChromaVectorDBConfig } from './chroma-vector-db';
/**
 * Vector database type
 */
export declare enum VectorDBType {
    /** In-memory vector database with optional persistence */
    InMemory = "in-memory",
    /** Chroma vector database */
    Chroma = "chroma"
}
/**
 * Extended vector database configuration with type
 */
export interface ExtendedVectorDBConfig extends VectorDBConfig {
    /** Type of vector database to use */
    type?: VectorDBType;
    /** Chroma-specific configuration (only used if type is Chroma) */
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
     * @param document - The document to add
     * @param namespace - Optional namespace/collection to add the document to
     * @returns Promise resolving to the document ID
     */
    addDocument(document: VectorDocument, namespace?: string): Promise<string>;
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
     * @param text - The text to search for
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    searchByText(text: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Search for similar documents using a vector
     *
     * @param vector - The embedding vector to search with
     * @param options - Search options
     * @returns Promise resolving to an array of search results
     */
    searchByVector(vector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
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
     * @param id - The document ID
     * @param document - The updated document data
     * @param namespace - Optional namespace/collection
     * @returns Promise resolving to a boolean indicating success
     */
    updateDocument(id: string, document: Partial<VectorDocument>, namespace?: string): Promise<boolean>;
    /**
     * Delete a document by its ID
     *
     * @param id - The document ID
     * @param namespace - Optional namespace/collection
     * @returns Promise resolving to a boolean indicating success
     */
    deleteDocument(id: string, namespace?: string): Promise<boolean>;
    /**
     * Delete all documents in a namespace
     *
     * @param namespace - The namespace to clear
     * @returns Promise resolving to the number of documents deleted
     */
    deleteNamespace(namespace: string): Promise<number>;
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