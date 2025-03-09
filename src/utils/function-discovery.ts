/**
 * Function Discovery Service
 * 
 * This module provides automatic function discovery and registration from 
 * AI provider endpoints, storing them in a vector database for future use.
 */

import { FunctionRegistry, FunctionDefinition } from './function-registry.js';
import { 
  EndpointConfig, 
  EndpointMetadata,
  CustomEndpointConfig
} from '../interfaces/endpoints.js';
import { VectorDB } from '../interfaces/vector-db.js';
import { Logger } from './logger.js';

/**
 * Function discovery options
 */
interface DiscoveryOptions {
  /**
   * Whether to force refresh even if functions were recently discovered
   */
  forceRefresh?: boolean;
  
  /**
   * Maximum age of discovered functions before refresh (in milliseconds)
   * Default: 24 hours
   */
  maxAge?: number;
  
  /**
   * Maximum retries for discovery attempts
   */
  maxRetries?: number;
  
  /**
   * Timeout for discovery requests (in milliseconds)
   */
  timeout?: number;
}

/**
 * Function discovery result
 */
interface DiscoveryResult {
  /**
   * Functions discovered from the endpoint
   */
  functions: FunctionDefinition[];
  
  /**
   * Whether functions were newly discovered or loaded from cache
   */
  fromCache: boolean;
  
  /**
   * Timestamp of when functions were last discovered
   */
  lastDiscovered: Date;
}

/**
 * Service for discovering and registering functions from endpoints
 */
export class FunctionDiscoveryService {
  private registry: FunctionRegistry;
  private vectorDb: VectorDB;
  private logger: Logger;
  
  /**
   * Create a new function discovery service
   * 
   * @param registry Function registry for storing functions
   * @param vectorDb Vector database for persistent storage
   * @param logLevel Log level
   */
  constructor(
    registry: FunctionRegistry,
    vectorDb: VectorDB,
    logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' = 'info'
  ) {
    this.registry = registry;
    this.vectorDb = vectorDb;
    this.logger = new Logger(logLevel);
  }
  
  /**
   * Discover functions from an endpoint
   * 
   * @param endpoint Endpoint configuration
   * @param options Discovery options
   * @returns Discovery result
   */
  async discoverFunctions(
    endpoint: EndpointConfig,
    options: DiscoveryOptions = {}
  ): Promise<DiscoveryResult> {
    const {
      forceRefresh = false,
      maxAge = 24 * 60 * 60 * 1000, // 24 hours
      maxRetries = 3,
      timeout = 30000
    } = options;
    
    try {
      // Check if we have recently discovered functions for this endpoint
      if (!forceRefresh) {
        const metadata = await this.getEndpointMetadata(endpoint);
        if (metadata && metadata.lastDiscovery) {
          const age = Date.now() - metadata.lastDiscovery.getTime();
          if (age < maxAge) {
            // Load functions from registry
            const cachedFunctions = await Promise.all(
              metadata.discoveredFunctions.map(name => this.registry.getFunction(name))
            );
            
            return {
              functions: cachedFunctions.filter(f => f !== null) as FunctionDefinition[],
              fromCache: true,
              lastDiscovered: metadata.lastDiscovery
            };
          }
        }
      }
      
      // Need to discover functions - use provider-specific logic
      let functions: FunctionDefinition[] = [];
      
      if (endpoint.type === 'openai') {
        functions = await this.discoverOpenAIFunctions(endpoint, timeout);
      } else if (endpoint.type === 'anthropic') {
        functions = await this.discoverAnthropicFunctions(endpoint, timeout);
      } else if (endpoint.type === 'gemini' || endpoint.type === 'vertex') {
        functions = await this.discoverGoogleFunctions(endpoint, timeout);
      } else if (endpoint.type === 'custom') {
        // For custom endpoints, try function discovery if available
        functions = await this.discoverCustomFunctions(endpoint, timeout);
      }
      
      // Register discovered functions
      for (const func of functions) {
        await this.registry.registerFunction(func);
      }
      
      // Update endpoint metadata
      await this.updateEndpointMetadata(endpoint, functions);
      
      return {
        functions,
        fromCache: false,
        lastDiscovered: new Date()
      };
    } catch (error) {
      this.logger.error(`Function discovery failed for ${endpoint.type} endpoint:`, error);
      throw error;
    }
  }
  
  /**
   * Get endpoint metadata from storage
   */
  private async getEndpointMetadata(endpoint: EndpointConfig): Promise<EndpointMetadata | null> {
    try {
      const results = await this.vectorDb.search({
        collectionName: 'endpoint-metadata',
        query: `id:${endpoint.type}-${endpoint.baseUrl}`,
        limit: 1
      });
      
      if (!results.length) return null;
      
      return JSON.parse(results[0].document.content) as EndpointMetadata;
    } catch (error) {
      this.logger.error('Failed to get endpoint metadata:', error);
      return null;
    }
  }
  
  /**
   * Update endpoint metadata in storage
   */
  private async updateEndpointMetadata(
    endpoint: EndpointConfig,
    discoveredFunctions: FunctionDefinition[]
  ): Promise<void> {
    const metadata: EndpointMetadata = {
      id: `${endpoint.type}-${endpoint.baseUrl}`,
      type: endpoint.type,
      baseUrl: endpoint.baseUrl,
      modelPrefix: endpoint.modelPrefix,
      discoveredFunctions: discoveredFunctions.map(f => f.name),
      lastDiscovery: new Date(),
      stats: {
        requestCount: 0,
        errorCount: 0,
        avgLatencyMs: 0,
        lastUsed: new Date()
      }
    };
    
    await this.vectorDb.addDocument({
      collectionName: 'endpoint-metadata',
      document: {
        id: metadata.id,
        content: JSON.stringify(metadata),
        metadata: {
          type: 'endpoint-metadata',
          endpointType: endpoint.type,
          baseUrl: endpoint.baseUrl
        }
      },
      embedding: [] // No need for semantic search
    });
  }
  
  /**
   * Discover functions from OpenAI endpoint using function enumeration
   */
  private async discoverOpenAIFunctions(
    endpoint: EndpointConfig,
    timeout: number
  ): Promise<FunctionDefinition[]> {
    // OpenAI provides function definitions in their API spec
    // This would query their API to get available functions
    throw new Error('Not implemented');
  }
  
  /**
   * Discover functions from Anthropic endpoint using example probing
   */
  private async discoverAnthropicFunctions(
    endpoint: EndpointConfig,
    timeout: number
  ): Promise<FunctionDefinition[]> {
    // Anthropic requires probing the model with examples to discover functions
    throw new Error('Not implemented');
  }
  
  /**
   * Discover functions from Google AI endpoints
   */
  private async discoverGoogleFunctions(
    endpoint: EndpointConfig,
    timeout: number
  ): Promise<FunctionDefinition[]> {
    // Google provides function definitions through their model info API
    throw new Error('Not implemented');
  }
  
  /**
   * Discover functions from custom endpoint using provided logic
   */
  private async discoverCustomFunctions(
    endpoint: EndpointConfig,
    timeout: number
  ): Promise<FunctionDefinition[]> {
    // Check if endpoint is custom type with discovery capabilities
    const customEndpoint = endpoint as CustomEndpointConfig;
    if (customEndpoint.type !== 'custom' || !customEndpoint.functionDiscovery?.extractFunctions) {
      return [];
    }
    
    try {
      // Use custom extraction logic with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const rawFunctions = await Promise.race([
        customEndpoint.functionDiscovery.extractFunctions(customEndpoint),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => 
            reject(new Error('Function discovery timed out'))
          );
        })
      ]);
      
      clearTimeout(timeoutId);
      
      // Transform to standard format if transformer provided
      if (customEndpoint.functionDiscovery.transformFunction) {
        return rawFunctions.map((func: unknown) => 
          customEndpoint.functionDiscovery!.transformFunction!(func)
        );
      }
      
      // Otherwise assume functions are already in correct format
      return rawFunctions as FunctionDefinition[];
    } catch (error) {
      this.logger.error('Custom function discovery failed:', error);
      return [];
    }
  }
  
  /**
   * Update endpoint statistics
   * 
   * @param endpoint Endpoint configuration
   * @param stats Statistics update
   */
  async updateEndpointStats(
    endpoint: EndpointConfig,
    stats: {
      requestCount?: number;
      errorCount?: number;
      latencyMs?: number;
    }
  ): Promise<void> {
    try {
      const metadata = await this.getEndpointMetadata(endpoint);
      if (!metadata) return;
      
      // Update stats
      const currentStats = metadata.stats;
      if (stats.requestCount) {
        currentStats.requestCount += stats.requestCount;
      }
      if (stats.errorCount) {
        currentStats.errorCount += stats.errorCount;
      }
      if (stats.latencyMs) {
        // Update rolling average latency
        const totalRequests = currentStats.requestCount;
        currentStats.avgLatencyMs = 
          (currentStats.avgLatencyMs * (totalRequests - 1) + stats.latencyMs) / totalRequests;
      }
      currentStats.lastUsed = new Date();
      
      // Save updated metadata
      metadata.stats = currentStats;
      await this.updateEndpointMetadata(endpoint, 
        await Promise.all(metadata.discoveredFunctions.map(name => 
          this.registry.getFunction(name)
        )) as FunctionDefinition[]
      );
    } catch (error) {
      this.logger.error('Failed to update endpoint stats:', error);
    }
  }
}
