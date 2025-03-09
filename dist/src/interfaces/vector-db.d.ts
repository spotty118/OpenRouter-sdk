/**
 * Vector database interfaces for knowledge storage and retrieval
 */
/**
 * Represents a document in the vector database
 */
export interface VectorDocument {
    /** Unique identifier for the document */
    id: string;
    /** The text content of the document */
    content: string;
    /** Optional metadata associated with the document */
    metadata?: Record<string, any>;
    /** Optional embedding vector if pre-computed */
    embedding?: number[];
}
/**
 * Result of a vector search operation
 */
export interface VectorSearchResult {
    /** The document that matched the search */
    document: VectorDocument;
    /** Similarity score (higher is more similar) */
    score: number;
}
/**
 * Configuration options for the vector database
 */
export interface VectorDBConfig {
    /** Dimensionality of the embedding vectors */
    dimensions: number;
    /** Maximum number of vectors to store in memory (default: 10000) */
    maxVectors?: number;
    /** Similarity metric to use (default: 'cosine') */
    similarityMetric?: 'cosine' | 'euclidean' | 'dot';
    /** Whether to persist vectors to disk */
    persistToDisk?: boolean;
    /** Path to store persisted vectors (default: './.vectordb') */
    storagePath?: string;
}
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
 * Extended vector database configuration with type
 */
export interface ExtendedVectorDBConfig extends VectorDBConfig {
    /** Type of vector database to use */
    type?: VectorDBType;
    /** Chroma-specific configuration (only used if type is Chroma) */
    chroma?: Omit<ChromaVectorDBConfig, keyof VectorDBConfig>;
}
/**
 * Options for vector search operations
 */
export interface VectorSearchOptions {
    /** Maximum number of results to return */
    limit?: number;
    /** Minimum similarity score threshold (0-1) */
    minScore?: number;
    /** Filter based on metadata */
    filter?: (metadata: Record<string, any>) => boolean;
    /** Whether to include the raw vectors in the results */
    includeVectors?: boolean;
    /** Namespace or collection to search in */
    namespace?: string;
}
/**
 * Interface for vector database implementations
 */
export interface IVectorDB {
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
//# sourceMappingURL=vector-db.d.ts.map