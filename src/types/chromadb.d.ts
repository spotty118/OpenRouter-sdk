/**
 * Type definitions for ChromaDB client library
 */

declare module 'chromadb' {
  export class ChromaClient {
    constructor(config?: { path?: string });
    
    /**
     * Get a collection by name
     */
    getCollection(params: GetCollectionParams): Promise<Collection>;
    
    /**
     * Create a new collection
     */
    createCollection(params: CreateCollectionParams): Promise<Collection>;
    
    /**
     * Delete a collection
     */
    deleteCollection(name: string): Promise<void>;
    
    /**
     * Reset the entire database
     */
    reset(): Promise<void>;
  }

  export interface Collection {
    /**
     * Add documents to the collection
     */
    add(params: AddParams): Promise<void>;
    
    /**
     * Update documents in the collection
     */
    update(params: UpdateParams): Promise<void>;
    
    /**
     * Delete documents from the collection
     */
    delete(params: DeleteParams): Promise<void>;
    
    /**
     * Query documents in the collection
     */
    query(params: QueryParams): Promise<QueryResults>;
    
    /**
     * Get document count
     */
    count(): Promise<number>;
  }

  export interface GetCollectionParams {
    name: string;
    embeddingFunction?: {
      dimension?: number;
    };
    metadata?: Record<string, any>;
  }

  export interface CreateCollectionParams extends GetCollectionParams {
    metadata?: Record<string, any>;
  }

  export interface AddParams {
    ids: string[];
    embeddings: number[][];
    metadatas?: Record<string, any>[];
    documents?: string[];
  }

  export interface UpdateParams extends AddParams {}

  export interface DeleteParams {
    ids: string[];
  }

  export interface QueryParams {
    queryEmbeddings?: number[][];
    queryTexts?: string[];
    nResults?: number;
    where?: Record<string, any>;
  }

  export interface QueryResults {
    ids: string[][];
    distances: number[][];
    documents: string[][];
    metadatas: Record<string, any>[][];
  }
}
