/**
 * ChromaDB Vector Database Implementation
 *
 * This module provides a ChromaDB-based implementation of vector database functionality
 * for semantic search and document storage.
 */
import { VectorDocument, VectorSearchResult, VectorDocumentOptions, VectorSearchOptions, VectorDB } from '../interfaces/vector-db.js';
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
    addDocument(options: VectorDocumentOptions): Promise<string>;
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
    deleteDocument(id: string, namespace?: string): Promise<boolean>;
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
    /**
     * Add multiple documents to the database
     *
     * @param documents Array of documents to add
     * @param namespace Optional namespace/collection
     * @returns Array of document IDs
     */
    addDocuments(documents: VectorDocument[], namespace?: string): Promise<string[]>;
    /**
     * Search by text query
     *
     * @param query Text query
     * @param options Search options
     * @returns Search results
     */
    searchByText(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Get a document by ID
     *
     * @param id Document ID
     * @param namespace Optional namespace
     * @returns Document or null if not found
     */
    getDocument(id: string, namespace?: string): Promise<VectorDocument | null>;
    /**
     * List all available namespaces
     *
     * @returns Array of namespace names
     */
    listNamespaces(): Promise<string[]>;
}
//# sourceMappingURL=chroma-vector-db.d.ts.map