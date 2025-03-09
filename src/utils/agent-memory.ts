/**
 * Enhanced agent memory management with advanced capabilities
 * 
 * This utility provides sophisticated memory management for AI agents,
 * including short-term context windows, long-term knowledge retention,
 * and automatic relevance filtering with smart retrieval.
 */

import { createVectorDB } from './vector-db.js';
import { EmbeddingGenerator } from './embedding-generator.js';
import { ChatMessage } from '../interfaces/index.js';
import { VectorDB, VectorDocument, VectorSearchOptions, VectorSearchResult, ExtendedVectorDBConfig } from '../interfaces/vector-db.js';
import { VectorDBType } from './vector-db.js';
import { Logger } from './logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * Memory type configuration
 */
export enum MemoryType {
  /** Short-term memory only, cleared after agent task completion */
  ShortTerm = 'short-term',
  
  /** Long-term memory with vector database storage */
  LongTerm = 'long-term',
  
  /** Hybrid memory system with both short and long-term capabilities */
  Hybrid = 'hybrid'
}

/**
 * Memory retention configuration
 */
export interface MemoryRetentionConfig {
  /** Maximum number of messages to keep in short-term memory */
  messageLimit?: number;
  
  /** Whether to automatically summarize and compress memories */
  useCompression?: boolean;
  
  /** How to handle message removal when limit is reached */
  removalStrategy?: 'oldest' | 'least-relevant' | 'summarize';
  
  /** Minimum relevance score for long-term memory retrieval (0-1) */
  relevanceThreshold?: number;
  
  /** Maximum number of long-term memories to recall per context */
  maxRecallItems?: number;
}

/**
 * Agent Memory Configuration
 */
export interface AgentMemoryConfig {
  /** Memory type to use */
  memoryType?: MemoryType;
  
  /** Memory retention configuration */
  retention?: MemoryRetentionConfig;
  
  /** Vector database configuration for long-term memory */
  vectorDb?: ExtendedVectorDBConfig;
  
  /** Namespace/collection in the vector database */
  namespace?: string;
  
  /** Custom embedding model for memory encoding */
  embeddingModel?: string;
  
  /** Whether to automatically prune redundant memories */
  autoPrune?: boolean;
  
  /** Whether to index all agent interactions automatically */
  autoIndex?: boolean;
}

/**
 * Memory Entry
 */
export interface MemoryEntry {
  /** Unique ID for this memory */
  id: string;
  
  /** The actual content of the memory */
  content: string;
  
  /** When this memory was created */
  timestamp: Date;
  
  /** Text embedding if available */
  embedding?: number[];
  
  /** Memory type (conversation, knowledge, reflection, etc.) */
  type?: string;
  
  /** Additional metadata about this memory */
  metadata?: Record<string, any>;
}

/**
 * AgentMemory class provides enhanced memory capabilities for AI agents
 */
export class AgentMemory {
  private agentId: string;
  private config: AgentMemoryConfig;
  private shortTermMemory: ChatMessage[] = [];
  private vectorDb: VectorDB | null = null;
  private embeddingGenerator: EmbeddingGenerator | null = null;
  private logger: Logger;
  private reflectionThreshold: number = 5; // Number of messages before triggering reflection

  /**
   * Create a new AgentMemory instance
   * 
   * @param agentId - The agent's unique identifier
   * @param config - Memory configuration
   */
  constructor(agentId: string, config: AgentMemoryConfig = {}) {
    this.agentId = agentId;
    this.config = {
      memoryType: MemoryType.Hybrid,
      retention: {
        messageLimit: 10,
        useCompression: true,
        removalStrategy: 'least-relevant',
        relevanceThreshold: 0.7,
        maxRecallItems: 5
      },
      autoIndex: true,
      autoPrune: true,
      ...config
    };
    
    this.logger = new Logger('info');
    
    // Initialize long-term memory if configured
    if (this.config.memoryType !== MemoryType.ShortTerm && this.config.vectorDb) {
      this.initVectorDb();
      this.initEmbeddingGenerator();
    }
  }

  /**
   * Initialize the vector database for long-term memory
   */
  private initVectorDb(): void {
    if (!this.config.vectorDb) return;
    
    try {
      this.vectorDb = createVectorDB({
        ...this.config.vectorDb,
        type: VectorDBType.CHROMA
      });
      this.logger.debug(`Initialized vector database for agent ${this.agentId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize vector database: ${error instanceof Error ? error.message : String(error)}`);
      throw new OpenRouterError(`Failed to initialize agent memory: ${error instanceof Error ? error.message : String(error)}`, 500, null);
    }
  }

  /**
   * Initialize the embedding generator
   */
  private initEmbeddingGenerator(): void {
    this.embeddingGenerator = new EmbeddingGenerator({
      model: this.config.embeddingModel || 'text-embedding-3-small',
      dimensions: 1536 // Standard embedding dimensions for most models
    });
  }

  /**
   * Add a message to the agent's memory
   * 
   * @param message - The message to add
   * @returns Promise resolving once the message is stored
   */
  async addMessage(message: ChatMessage): Promise<void> {
    // Add to short-term memory
    this.shortTermMemory.push(message);
    
    // Enforce short-term memory limits
    this.enforceMemoryLimits();
    
    // Auto-index for long-term memory if configured
    if (this.config.autoIndex && this.vectorDb && this.embeddingGenerator) {
      await this.indexMessage(message);
    }
    
    // Check if reflection is needed
    if (this.shortTermMemory.length >= this.reflectionThreshold) {
      await this.reflect();
    }
  }

  /**
   * Index a message in the long-term memory
   * 
   * @param message - The message to index
   * @returns Promise resolving to the memory entry ID
   */
  private async indexMessage(message: ChatMessage): Promise<void> {
    if (!this.vectorDb || !this.embeddingGenerator) {
      throw new OpenRouterError('Long-term memory not initialized', 400, null);
    }
    
    const content = message.content.toString();
    const embedding = await this.embeddingGenerator.generateEmbedding(content);
    
    const document: VectorDocument = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      metadata: {
        role: message.role,
        timestamp: new Date().toISOString(),
        type: 'conversation'
      }
    };
    
    await this.vectorDb.addDocument({
      collectionName: this.config.namespace || 'default',
      document,
      embedding
    });
  }

  /**
   * Enforce memory limits based on configuration
   */
  private enforceMemoryLimits(): void {
    const limit = this.config.retention?.messageLimit || 10;
    
    if (this.shortTermMemory.length <= limit) return;
    
    const strategy = this.config.retention?.removalStrategy || 'oldest';
    
    if (strategy === 'oldest') {
      // Remove oldest messages
      this.shortTermMemory = this.shortTermMemory.slice(-limit);
    } else if (strategy === 'summarize' && this.shortTermMemory.length > limit + 5) {
      // Summarize older messages (in a real implementation, this would use the LLM to generate a summary)
      const oldMessages = this.shortTermMemory.slice(0, this.shortTermMemory.length - limit);
      const summary: ChatMessage = {
        role: 'system',
        content: `[Summary of ${oldMessages.length} previous messages]`
      };
      
      this.shortTermMemory = [summary, ...this.shortTermMemory.slice(-limit)];
    }
  }

  /**
   * Reflect on recent conversations to extract key information and store 
   * as structured memories in long-term storage
   */
  private async reflect(): Promise<void> {
    if (!this.vectorDb || !this.embeddingGenerator || !this.config.autoIndex) return;
    
    // Get recent messages
    const recentMessages = this.shortTermMemory.slice(-this.reflectionThreshold);
    
    // In a real implementation, this would use the LLM to analyze the conversation
    // and extract key information. For now, we'll just store a placeholder.
    const reflectionContent = `[Reflection on recent conversation: ${recentMessages.map(m => `${m.role}: ${m.content.toString().substring(0, 20)}...`).join(' | ')}]`;
    
    const document: VectorDocument = {
      id: `reflection-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content: reflectionContent,
      metadata: {
        type: 'reflection',
        timestamp: new Date().toISOString(),
        messageCount: recentMessages.length
      }
    };
    
    const embedding = await this.embeddingGenerator.generateEmbedding(reflectionContent);
    
    await this.vectorDb.addDocument({
      collectionName: this.config.namespace || 'default',
      document,
      embedding
    });
    this.logger.debug(`Created reflection for agent ${this.agentId}`);
  }

  /**
   * Get all messages in the agent's short-term memory
   * 
   * @returns Array of messages
   */
  getMessages(): ChatMessage[] {
    return [...this.shortTermMemory];
  }

  /**
   * Clear the agent's short-term memory
   */
  clearShortTermMemory(): void {
    this.shortTermMemory = [];
  }

  /**
   * Retrieve relevant memories based on a query
   * 
   * @param query - The text query to find relevant memories
   * @param options - Search options
   * @returns Promise resolving to an array of relevant memories
   */
  async retrieveRelevantMemories(query: string, options?: Partial<VectorSearchOptions>): Promise<VectorSearchResult[]> {
    if (!this.vectorDb || !this.embeddingGenerator) {
      throw new OpenRouterError('Long-term memory not initialized', 400, null);
    }
    
    const searchOptions: VectorSearchOptions = {
      collectionName: this.config.namespace || 'default',
      query,
      limit: this.config.retention?.maxRecallItems || 5,
      minScore: this.config.retention?.relevanceThreshold || 0.7,
      ...options
    };
    
    return this.vectorDb.search(searchOptions);
  }

  /**
   * Store a new memory directly in long-term storage
   * 
   * @param content - Memory content
   * @param type - Memory type
   * @param metadata - Additional metadata
   * @returns Promise resolving to the memory ID
   */
  async storeMemory(content: string, type: string = 'knowledge', metadata: Record<string, any> = {}): Promise<void> {
    if (!this.vectorDb || !this.embeddingGenerator) {
      throw new OpenRouterError('Long-term memory not initialized', 400, null);
    }
    
    const document: VectorDocument = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      metadata: {
        type,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
    
    const embedding = await this.embeddingGenerator.generateEmbedding(content);
    
    await this.vectorDb.addDocument({
      collectionName: this.config.namespace || 'default',
      document,
      embedding
    });
  }

  /**
   * Generate a contextualized memory prompt by combining short-term memory
   * with relevant long-term memories
   * 
   * @param query - Current context/query to find relevant memories
   * @returns Promise resolving to the enhanced context
   */
  async generateEnhancedContext(query: string): Promise<{
    messages: ChatMessage[],
    relevantMemories: VectorSearchResult[]
  }> {
    // Start with current short-term context
    const contextMessages = [...this.shortTermMemory];
    
    let relevantMemories: VectorSearchResult[] = [];
    
    // Add relevant long-term memories if available
    if (this.vectorDb && this.embeddingGenerator && this.config.memoryType !== MemoryType.ShortTerm) {
      relevantMemories = await this.retrieveRelevantMemories(query);
      
      if (relevantMemories.length > 0) {
        // Insert a system message with relevant memories
        const memoryPrompt = `Relevant information from your memory:
${relevantMemories.map(m => `- ${m.document.content}`).join('\n')}`;
        
        // Insert after system message if it exists, otherwise at the beginning
        const sysIndex = contextMessages.findIndex(m => m.role === 'system');
        if (sysIndex >= 0) {
          contextMessages.splice(sysIndex + 1, 0, {
            role: 'system',
            content: memoryPrompt
          });
        } else {
          contextMessages.unshift({
            role: 'system',
            content: memoryPrompt
          });
        }
      }
    }
    
    return {
      messages: contextMessages,
      relevantMemories
    };
  }

  /**
   * Prune redundant or low-value memories
   * 
   * @returns Promise resolving to the number of memories pruned
   */
  async pruneMemories(): Promise<number> {
    if (!this.vectorDb || !this.embeddingGenerator || !this.config.autoPrune) {
      return 0;
    }
    
    // In a real implementation, this would use the LLM and vector similarity
    // to identify and remove redundant memories. For now, we'll just return 0.
    return 0;
  }
}
