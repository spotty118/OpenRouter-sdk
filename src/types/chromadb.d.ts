/**
 * Type declarations for ChromaDB
 */

declare module 'chromadb' {
  export enum IncludeEnum {
    Documents = 'documents',
    Embeddings = 'embeddings',
    Metadatas = 'metadatas',
    Distances = 'distances'
  }

  export interface ChromaClientParams {
    path?: string;
    fetchOptions?: {
      headers?: Record<string, string>;
    };
  }

  export interface CollectionMetadata {
    name: string;
    metadata?: Record<string, any>;
  }

  export interface GetParams {
    ids?: string[];
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    include?: IncludeEnum[];
  }

  export interface GetResult {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, any>[];
    documents?: string[];
  }

  export interface AddParams {
    ids: string[];
    embeddings: number[][];
    metadatas?: Record<string, any>[];
    documents?: string[];
  }

  export interface UpdateParams {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, any>[];
    documents?: string[];
  }

  export interface QueryParams {
    queryEmbeddings?: number[][];
    queryTexts?: string[];
    nResults?: number;
    where?: Record<string, any>;
    include?: IncludeEnum[];
  }

  export interface QueryResult {
    ids: string[][];
    distances?: number[][];
    metadatas?: Record<string, any>[][];
    embeddings?: number[][][];
    documents?: string[][];
  }

  export interface DeleteParams {
    ids?: string[];
    where?: Record<string, any>;
  }

  export interface Collection {
    name: string;
    metadata?: Record<string, any>;
    count: () => Promise<number>;
    add: (params: AddParams) => Promise<void>;
    get: (params: GetParams) => Promise<GetResult>;
    update: (params: UpdateParams) => Promise<void>;
    query: (params: QueryParams) => Promise<QueryResult>;
    delete: (params?: DeleteParams) => Promise<void>;
  }

  export interface CreateCollectionParams {
    name: string;
    metadata?: Record<string, any>;
    embeddingFunction?: any;
    distanceFunction?: string;
  }

  export interface GetCollectionParams {
    name: string;
    embeddingFunction?: any;
  }

  export class ChromaClient {
    constructor(params?: ChromaClientParams);
    
    listCollections(): Promise<CollectionMetadata[]>;
    
    getCollection(params: GetCollectionParams): Promise<Collection>;
    
    createCollection(params: CreateCollectionParams): Promise<Collection>;
    
    deleteCollection(name: string): Promise<void>;
  }
}