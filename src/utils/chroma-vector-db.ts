/**
 * Chroma vector database implementation for knowledge storage and retrieval
 */

import { 
  IVectorDB, 
  VectorDBConfig, 
  VectorDocument, 
  VectorSearchOptions, 
  VectorSearchResult 
} from '../interfaces';
import { Logger } from './logger';
import { ChromaClient, Collection, IncludeEnum } from 'chromadb';
import { EmbeddingGenerator } from './embedding-generator';

// Define types for Chroma since we don't have the official types
interface ChromaClientOptions {
  path?: string;
  fetchOptions?: {
    headers?: Record<string, string>;
  };
}
interface ICollection {
  name: string;
  metadata?: Record<string, any>;
  count: () => Promise<number>;
  add: (params: {
    ids: string[];
    embeddings: number[][];
    metadatas?: Record<string, any>[];
    documents?: string[];
  }) => Promise<void>;
  get: (params: {
    ids?: string[];
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    include?: IncludeEnum[];
  }) => Promise<{
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, any>[];
    documents?: string[];
  }>;
  update: (params: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, any>[];
    documents?: string[];
  }) => Promise<void>;
  query: (params: {
    queryEmbeddings?: number[][];
    queryTexts?: string[];
    nResults?: number;
    where?: Record<string, any>;
    include?: IncludeEnum[];
  }) => Promise<{
    ids: string[][];
    distances?: number[][];
    metadatas?: Record<string, any>[][];
    embeddings?: number[][][];
    documents?: string[][];
  }>;
  delete: (params?: {
    ids?: string[];
    where?: Record<string, any>;
  }) => Promise<void>;
}

interface IChromaClient {
  listCollections: () => Promise<{ name: string; metadata?: Record<string, any> }[]>;
  getCollection: (params: {
    name: string;
    embeddingFunction?: any;
  }) => Promise<Collection>;
  createCollection: (params: {
    name: string;
    metadata?: Record<string, any>;
    embeddingFunction?: any;
    distanceFunction?: string;
  }) => Promise<Collection>;
  deleteCollection: (name: string) => Promise<void>;
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
 * Chroma vector database implementation
 * 
 * This implementation provides a vector database that uses Chroma for
 * storing and retrieving embeddings with high-performance vector search.
 */
export class ChromaVectorDB implements IVectorDB {
  private client: ChromaClient;
  private collections: Map<string, ICollection> = new Map();
  private config: Required<ChromaVectorDBConfig>;
  private logger: Logger;
  private defaultNamespace = 'default';
  private initialized = false;
  private embeddingGenerator: EmbeddingGenerator;

  /**
   * Create a new Chroma vector database
   * 
   * @param config - Configuration options
   */
  constructor(config: ChromaVectorDBConfig) {
    this.config = {
      dimensions: config.dimensions,
      maxVectors: config.maxVectors || 10000,
      similarityMetric: config.similarityMetric || 'cosine',
      persistToDisk: config.persistToDisk || false,
      storagePath: config.storagePath || './.vectordb',
      chromaUrl: config.chromaUrl || 'http://localhost:8000',
      chromaApiKey: config.chromaApiKey || '',
      collectionPrefix: config.collectionPrefix || 'openrouter_',
      useInMemory: config.useInMemory || false
    };
    
    this.logger = new Logger('info');
    
    // Initialize real Chroma client
    if (this.config.useInMemory) {
      this.client = new ChromaClient({
        path: this.config.chromaUrl,
        fetchOptions: this.config.chromaApiKey ? {
          headers: {
            'Authorization': `Bearer ${this.config.chromaApiKey}`
          }
        } : undefined
      });
    } else {
      this.client = new ChromaClient({
        path: this.config.chromaUrl,
        fetchOptions: this.config.chromaApiKey ? {
          headers: {
            'Authorization': `Bearer ${this.config.chromaApiKey}`
          }
        } : undefined
      });
    }

    // Initialize embedding generator
    this.embeddingGenerator = new EmbeddingGenerator({
      dimensions: this.config.dimensions,
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'text-embedding-3-small',
      useOpenRouter: false
    });
    
    // Initialize default collection
    this.initializeCollection(this.defaultNamespace).catch(err => {
      this.logger.warn(`Failed to initialize default collection: ${err.message}`);
    });
  }

  /**
   * Initialize a collection in Chroma
   * 
   * @param namespace - The namespace/collection name
   * @returns Promise resolving to the collection
   */
  private async initializeCollection(namespace: string): Promise<ICollection> {
    const collectionName = `${this.config.collectionPrefix}${namespace}`;
    
    try {
      // Check if collection exists
      const collections = await this.client.listCollections();
      const exists = collections.some((c: { name: string }) => c.name === collectionName);
      
      let collection: ICollection;
      
      if (exists) {
        collection = await this.client.getCollection({
          name: collectionName,
          embeddingFunction: undefined // We'll provide embeddings directly
        });
      } else {
        // Create new collection
        collection = await this.client.createCollection({
          name: collectionName,
          metadata: { namespace },
          embeddingFunction: undefined, // We'll provide embeddings directly
          distanceFunction: this.mapSimilarityMetric(this.config.similarityMetric)
        });
      }
      
      // Cache collection
      this.collections.set(namespace, collection);
      return collection;
    } catch (err) {
      this.logger.error(`Failed to initialize collection ${namespace}:`, err);
      throw err;
    }
  }

  /**
   * Map our similarity metric to Chroma's distance function
   * 
   * @param metric - Our similarity metric
   * @returns Chroma distance function name
   */
  private mapSimilarityMetric(metric: string): string {
    switch (metric) {
      case 'cosine':
        return 'cosine';
      case 'euclidean':
        return 'l2';
      case 'dot':
        return 'dot';
      default:
        return 'cosine';
    }
  }

  /**
   * Get a collection, initializing it if necessary
   * 
   * @param namespace - The namespace/collection name
   * @returns Promise resolving to the collection
   */
  private async getCollection(namespace: string): Promise<ICollection> {
    if (this.collections.has(namespace)) {
      return this.collections.get(namespace)!;
    }
    
    return this.initializeCollection(namespace);
  }

  /**
   * Generate a random embedding for testing purposes
   * 
   * @returns A random embedding vector
   */
  private createRandomEmbedding(): number[] {
    return Array.from({ length: this.config.dimensions }, () => (Math.random() * 2 - 1));
  }

  /**
   * Add a document to the vector database
   * 
   * @param document - The document to add
   * @param namespace - Optional namespace/collection to add the document to
   * @returns Promise resolving to the document ID
   */
  async addDocument(document: VectorDocument, namespace: string = this.defaultNamespace): Promise<string> {
    // Generate ID if not provided
    if (!document.id) {
      document.id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Get or create collection
    const collection = await this.getCollection(namespace);
    
    // Generate embedding if not provided
    const embedding = document.embedding || this.createRandomEmbedding();
    
    if (embedding.length !== this.config.dimensions) {
      throw new Error(`Vector dimensions mismatch: expected ${this.config.dimensions}, got ${embedding.length}`);
    }
    
    // Add document to Chroma
    await collection.add({
      ids: [document.id],
      embeddings: [embedding],
      metadatas: [document.metadata ? { ...document.metadata, content: document.content } : { content: document.content }],
      documents: [document.content]
    });
    
    return document.id;
  }

  /**
   * Add multiple documents to the vector database
   * 
   * @param documents - Array of documents to add
   * @param namespace - Optional namespace/collection to add the documents to
   * @returns Promise resolving to an array of document IDs
   */
  async addDocuments(documents: VectorDocument[], namespace: string = this.defaultNamespace): Promise<string[]> {
    if (documents.length === 0) {
      return [];
    }
    
    // Generate IDs for documents that don't have them
    const docsWithIds = documents.map(doc => ({
      ...doc,
      id: doc.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }));
    
    // Get or create collection
    const collection = await this.getCollection(namespace);
    
    // Generate embeddings for documents that don't have them
    const embeddings = docsWithIds.map(doc => 
      doc.embedding || this.createRandomEmbedding()
    );
    
    // Validate embeddings
    for (let i = 0; i < embeddings.length; i++) {
      if (embeddings[i].length !== this.config.dimensions) {
        throw new Error(`Vector dimensions mismatch for document ${i}: expected ${this.config.dimensions}, got ${embeddings[i].length}`);
      }
    }
    
    // Add documents to Chroma
    await collection.add({
      ids: docsWithIds.map(doc => doc.id),
      embeddings: embeddings,
      metadatas: docsWithIds.map(doc => doc.metadata ? { ...doc.metadata, content: doc.content } : { content: doc.content }),
      documents: docsWithIds.map(doc => doc.content)
    });
    
    return docsWithIds.map(doc => doc.id);
  }

  /**
   * Search for similar documents using text query
   * 
   * @param text - The text to search for
   * @param options - Search options
   * @returns Promise resolving to an array of search results
   */
  async searchByText(text: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    // Generate embedding using our utility
    const embedding = await this.embeddingGenerator.generateEmbedding(text);
    
    return this.searchByVector(embedding, options);
  }

  /**
   * Search for similar documents using a vector
   * 
   * @param vector - The embedding vector to search with
   * @param options - Search options
   * @returns Promise resolving to an array of search results
   */
  async searchByVector(vector: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const namespace = options.namespace || this.defaultNamespace;
    const limit = options.limit || 10;
    const minScore = options.minScore || 0;
    
    if (vector.length !== this.config.dimensions) {
      throw new Error(`Vector dimensions mismatch: expected ${this.config.dimensions}, got ${vector.length}`);
    }
    
    try {
      // Get collection
      const collection = await this.getCollection(namespace);
      
      // Query Chroma
      const result = await collection.query({
        queryEmbeddings: [vector],
        nResults: limit,
        include: [
          IncludeEnum.Documents,
          IncludeEnum.Metadatas,
          IncludeEnum.Distances,
          options.includeVectors ? IncludeEnum.Embeddings : undefined
        ].filter(Boolean) as IncludeEnum[]
      });
      
      // Format results
      const searchResults: VectorSearchResult[] = [];
      
      if (result.ids && result.ids.length > 0) {
        const ids = result.ids[0] || [];
        const documents = result.documents ? (result.documents[0] || []) : [];
        const metadatas = result.metadatas ? (result.metadatas[0] || []) : [];
        const distances = result.distances ? (result.distances[0] || []) : [];
        const embeddings = result.embeddings ? (result.embeddings[0] || []) : [];
        
        for (let i = 0; i < ids.length; i++) {
          // Convert distance to similarity score (0-1, higher is more similar)
          // This depends on the distance metric used
          let score: number;
          
          if (this.config.similarityMetric === 'cosine' || this.config.similarityMetric === 'euclidean') {
            // For cosine and euclidean, lower distance means higher similarity
            score = 1 - (distances[i] || 0);
          } else {
            // For dot product, higher is better, but normalize to 0-1
            score = (distances[i] + 1) / 2;
          }
          
          // Skip if below minimum score
          if (score < minScore) {
            continue;
          }
          
          // Apply filter if provided
          const metadata = metadatas[i] || {};
          if (options.filter && !options.filter(metadata)) {
            continue;
          }
          
          // Extract content from metadata
          const content = metadata.content || documents[i] || '';
          delete metadata.content;
          
          searchResults.push({
            document: {
              id: ids[i],
              content: content,
              metadata: metadata,
              embedding: options.includeVectors ? embeddings[i] : undefined
            },
            score
          });
        }
      }
      
      return searchResults;
    } catch (err) {
      this.logger.error(`Search error in namespace ${namespace}:`, err);
      throw err;
    }
  }

  /**
   * Get a document by its ID
   * 
   * @param id - The document ID
   * @param namespace - Optional namespace/collection to search in
   * @returns Promise resolving to the document or null if not found
   */
  async getDocument(id: string, namespace: string = this.defaultNamespace): Promise<VectorDocument | null> {
    try {
      // Get collection
      const collection = await this.getCollection(namespace);
      
      // Get document from Chroma
      const result = await collection.get({
        ids: [id],
        include: [
          IncludeEnum.Documents,
          IncludeEnum.Metadatas,
          IncludeEnum.Embeddings
        ]
      });
      
      if (!result.ids || result.ids.length === 0) {
        return null;
      }
      
      // Extract content from metadata
      const metadata = result.metadatas ? (result.metadatas[0] || {}) : {};
      const content = metadata.content || (result.documents ? result.documents[0] : '');
      delete metadata.content;
      
      return {
        id,
        content,
        metadata,
        embedding: result.embeddings ? result.embeddings[0] : undefined
      };
    } catch (err) {
      this.logger.error(`Error getting document ${id} from namespace ${namespace}:`, err);
      return null;
    }
  }

  /**
   * Update an existing document
   * 
   * @param id - The document ID
   * @param document - The updated document data
   * @param namespace - Optional namespace/collection
   * @returns Promise resolving to a boolean indicating success
   */
  async updateDocument(id: string, document: Partial<VectorDocument>, namespace: string = this.defaultNamespace): Promise<boolean> {
    try {
      // Get existing document
      const existingDoc = await this.getDocument(id, namespace);
      
      if (!existingDoc) {
        return false;
      }
      
      // Merge with updates
      const updatedDoc = {
        ...existingDoc,
        ...document,
        id // Ensure ID remains the same
      };
      
      // Get collection
      const collection = await this.getCollection(namespace);
      
      // Generate embedding if not provided
      const embedding = updatedDoc.embedding || this.createRandomEmbedding();
      
      if (embedding.length !== this.config.dimensions) {
        throw new Error(`Vector dimensions mismatch: expected ${this.config.dimensions}, got ${embedding.length}`);
      }
      
      // Update document in Chroma
      await collection.update({
        ids: [id],
        embeddings: [embedding],
        metadatas: [updatedDoc.metadata ? { ...updatedDoc.metadata, content: updatedDoc.content } : { content: updatedDoc.content }],
        documents: [updatedDoc.content]
      });
      
      return true;
    } catch (err) {
      this.logger.error(`Error updating document ${id} in namespace ${namespace}:`, err);
      return false;
    }
  }

  /**
   * Delete a document by its ID
   * 
   * @param id - The document ID
   * @param namespace - Optional namespace/collection
   * @returns Promise resolving to a boolean indicating success
   */
  async deleteDocument(id: string, namespace: string = this.defaultNamespace): Promise<boolean> {
    try {
      // Get collection
      const collection = await this.getCollection(namespace);
      
      // Delete document from Chroma
      await collection.delete({
        ids: [id]
      });
      
      return true;
    } catch (err) {
      this.logger.error(`Error deleting document ${id} from namespace ${namespace}:`, err);
      return false;
    }
  }

  /**
   * Delete all documents in a namespace
   * 
   * @param namespace - The namespace to clear
   * @returns Promise resolving to the number of documents deleted
   */
  async deleteNamespace(namespace: string): Promise<number> {
    try {
      // Get collection
      const collection = await this.getCollection(namespace);
      
      // Get count of documents
      const count = await collection.count();
      
      // Delete all documents
      await collection.delete();
      
      // Remove from cache
      this.collections.delete(namespace);
      
      return count;
    } catch (err) {
      this.logger.error(`Error deleting namespace ${namespace}:`, err);
      return 0;
    }
  }

  /**
   * Get all available namespaces
   * 
   * @returns Promise resolving to an array of namespace names
   */
  async listNamespaces(): Promise<string[]> {
    try {
      // Get all collections from Chroma
      const collections = await this.client.listCollections();
      
      // Filter collections by prefix and extract namespace
      return collections
        .filter((c: { name: string }) => c.name.startsWith(this.config.collectionPrefix))
        .map((c: { name: string }) => c.name.substring(this.config.collectionPrefix.length));
    } catch (err) {
      this.logger.error('Error listing namespaces:', err);
      return [];
    }
  }

  /**
   * Save the current state to disk (if persistence is enabled)
   * 
   * @returns Promise resolving when save is complete
   */
  async save(): Promise<void> {
    // Chroma handles persistence automatically
    return Promise.resolve();
  }

  /**
   * Load state from disk (if persistence is enabled)
   * 
   * @returns Promise resolving when load is complete
   */
  async load(): Promise<void> {
    // Chroma handles persistence automatically
    return Promise.resolve();
  }
}