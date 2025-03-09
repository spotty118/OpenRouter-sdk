/**
 * ChromaDB Vector Database Implementation
 *
 * This module provides a ChromaDB-based implementation of vector database functionality
 * for semantic search and document storage.
 */
import { VectorSearchResult, VectorDocumentOptions, VectorSearchOptions, VectorDeleteOptions, VectorDB } from '../interfaces/vector-db.js';
/**
 * ChromaDB Vector Database implementation
 */
export declare class ChromaVectorDB implements VectorDB {
    private client;
    private collections;
    private logger;
    /**
     * Create a new ChromaDB vector database instance
     *
     * @param config Configuration options
     */
    constructor(config?: {
        host?: string;
        port?: number;
        logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
    });
    /**
     * Get or create a collection
     *
     * @param name Collection name
     * @param options Collection options
     * @returns Collection instance
     */
    private getOrCreateCollection;
    /**
     * Add a document to the database
     *
     * @param options Document options
     */
    addDocument(options: VectorDocumentOptions): Promise<void>;
    /**
     * Update a document in the database
     *
     * @param options Document options
     */
    updateDocument(options: VectorDocumentOptions): Promise<void>;
    /**
     * Delete a document from the database
     *
     * @param options Delete options
     */
    deleteDocument(options: VectorDeleteOptions): Promise<void>;
    /**
     * Search for documents by text query or vector embedding
     *
     * @param options Search options
     * @returns Matching documents with similarity scores
     */
    search(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Search for documents by vector embedding
     *
     * @param options Search options (must include vector)
     * @returns Matching documents with similarity scores
     */
    searchByVector(options: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Get total count of documents in a collection
     *
     * @param collectionName Collection name
     * @returns Document count
     */
    count(collectionName: string): Promise<number>;
    /**
     * Delete an entire collection
     *
     * @param collectionName Collection name
     */
    deleteCollection(collectionName: string): Promise<void>;
    /**
     * Reset the database (delete all collections)
     */
    reset(): Promise<void>;
}
//# sourceMappingURL=chroma-vector-db.d.ts.map