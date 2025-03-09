/**
 * Vector Database Interfaces
 */
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
     * Collection name to search in
     */
    collectionName: string;
    /**
     * Query string or vector depending on search type
     */
    query?: string;
    vector?: number[];
    /**
     * Optional filter query
     */
    filter?: string;
    /**
     * Maximum results to return
     */
    limit?: number;
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
    addDocument(options: VectorDocumentOptions): Promise<void>;
    /**
     * Update a document in the database
     */
    updateDocument(options: VectorDocumentOptions): Promise<void>;
    /**
     * Delete a document from the database
     */
    deleteDocument(options: VectorDeleteOptions): Promise<void>;
    /**
     * Search for documents by text query or vector embedding
     */
    search(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
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
}
//# sourceMappingURL=vector-db.d.ts.map