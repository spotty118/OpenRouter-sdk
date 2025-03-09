/**
 * Chroma vector database implementation for knowledge storage and retrieval
 */
import { IVectorDB, VectorDBConfig, VectorDocument, VectorSearchOptions, VectorSearchResult } from '../interfaces';
/**
 * Configuration options specific to Chroma
 */
export interface ChromaVectorDBConfig extends VectorDBConfig {
    /** Chroma server URL (default: http://localhost:8000) */
    chromaUrl?: string;
    /** Chroma API key if authentication is enabled */
    chromaApiKey?: string;
    /** Collection prefix to avoid name collisions */
    collectionPrefix?: string;
    /** Whether to use in-memory Chroma instance (default: false) */
    useInMemory?: boolean;
}
/**
 * Chroma vector database implementation
 *
 * This implementation provides a vector database that uses Chroma for
 * storing and retrieving embeddings with high-performance vector search.
 */
export declare class ChromaVectorDB implements IVectorDB {
    private client;
    private collections;
    private config;
    private logger;
    private defaultNamespace;
    private initialized;
    private embeddingGenerator;
    /**
     * Create a new Chroma vector database
     *
     * @param config - Configuration options
     */
    constructor(config: ChromaVectorDBConfig);
    /**
     * Initialize a collection in Chroma
     *
     * @param namespace - The namespace/collection name
     * @returns Promise resolving to the collection
     */
    private initializeCollection;
    /**
     * Map our similarity metric to Chroma's distance function
     *
     * @param metric - Our similarity metric
     * @returns Chroma distance function name
     */
    private mapSimilarityMetric;
    /**
     * Get a collection, initializing it if necessary
     *
     * @param namespace - The namespace/collection name
     * @returns Promise resolving to the collection
     */
    private getCollection;
    /**
     * Generate a random embedding for testing purposes
     *
     * @returns A random embedding vector
     */
    private createRandomEmbedding;
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
}
//# sourceMappingURL=chroma-vector-db.d.ts.map