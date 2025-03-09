/**
 * Function Registry
 * 
 * This module provides a system for registering, discovering, and persisting
 * function definitions that can be used by AI models through different endpoints.
 * It enables a self-learning system where endpoints can automatically discover
 * available functions and remember them for future use.
 */

import { Logger } from './logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * Function parameter schema (JSON Schema format)
 */
export interface FunctionParameterSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

/**
 * Function definition that can be registered and used by AI models
 */
export interface FunctionDefinition {
  /**
   * Unique name for the function
   */
  name: string;
  
  /**
   * Human-readable description of what the function does
   */
  description: string;
  
  /**
   * JSON Schema defining the function's parameters
   */
  parameters: FunctionParameterSchema;
  
  /**
   * Optional categorization tag(s) for grouping related functions
   */
  tags?: string[];
  
  /**
   * Optional list of models or providers this function is compatible with
   */
  compatibleWith?: string[];
  
  /**
   * The actual function implementation (can be async)
   */
  implementation?: (...args: any[]) => any | Promise<any>;
}

/**
 * Function usage statistics for tracking and optimization
 */
interface FunctionUsageStats {
  /**
   * Count of successful invocations
   */
  invocationCount: number;
  
  /**
   * Count of failed invocations
   */
  errorCount: number;
  
  /**
   * List of model IDs that have used this function
   */
  usedByModels: Set<string>;
  
  /**
   * Average execution time in milliseconds
   */
  avgExecutionTimeMs: number;
  
  /**
   * Last used timestamp
   */
  lastUsed: Date;
}

/**
 * Storage driver interface for persisting function definitions
 */
export interface FunctionStorageDriver {
  /**
   * Save a function definition to storage
   * 
   * @param func Function definition to save
   * @returns Promise resolving to success status
   */
  saveFunction(func: FunctionDefinition): Promise<boolean>;
  
  /**
   * Retrieve a function definition by name
   * 
   * @param name Function name
   * @returns Promise resolving to function definition or null if not found
   */
  getFunction(name: string): Promise<FunctionDefinition | null>;
  
  /**
   * List all function definitions
   * 
   * @param tag Optional tag to filter by
   * @returns Promise resolving to array of function definitions
   */
  listFunctions(tag?: string): Promise<FunctionDefinition[]>;
  
  /**
   * Delete a function definition
   * 
   * @param name Function name
   * @returns Promise resolving to success status
   */
  deleteFunction(name: string): Promise<boolean>;
  
  /**
   * Update function usage statistics
   * 
   * @param name Function name
   * @param stats Updated usage statistics
   * @returns Promise resolving to success status
   */
  updateUsageStats(name: string, stats: Partial<FunctionUsageStats>): Promise<boolean>;
  
  /**
   * Get function usage statistics
   * 
   * @param name Function name
   * @returns Promise resolving to usage statistics or null if not found
   */
  getUsageStats(name: string): Promise<FunctionUsageStats | null>;
}

/**
 * Memory storage driver that persists data in-memory (for testing or simple usage)
 */
export class MemoryFunctionStorage implements FunctionStorageDriver {
  private functions: Map<string, FunctionDefinition> = new Map();
  private stats: Map<string, FunctionUsageStats> = new Map();
  
  async saveFunction(func: FunctionDefinition): Promise<boolean> {
    this.functions.set(func.name, func);
    return true;
  }
  
  async getFunction(name: string): Promise<FunctionDefinition | null> {
    return this.functions.get(name) || null;
  }
  
  async listFunctions(tag?: string): Promise<FunctionDefinition[]> {
    const funcs = Array.from(this.functions.values());
    if (tag) {
      return funcs.filter(f => f.tags?.includes(tag));
    }
    return funcs;
  }
  
  async deleteFunction(name: string): Promise<boolean> {
    return this.functions.delete(name);
  }
  
  async updateUsageStats(name: string, stats: Partial<FunctionUsageStats>): Promise<boolean> {
    const existing = this.stats.get(name) || {
      invocationCount: 0,
      errorCount: 0,
      usedByModels: new Set<string>(),
      avgExecutionTimeMs: 0,
      lastUsed: new Date()
    };
    
    this.stats.set(name, {
      ...existing,
      ...stats,
      usedByModels: stats.usedByModels 
        ? new Set([...existing.usedByModels, ...stats.usedByModels])
        : existing.usedByModels
    });
    
    return true;
  }
  
  async getUsageStats(name: string): Promise<FunctionUsageStats | null> {
    return this.stats.get(name) || null;
  }
}

/**
 * Function Registry that manages function definitions and handles discovery
 */
export class FunctionRegistry {
  private logger: Logger;
  private storage: FunctionStorageDriver;
  
  /**
   * Create a new function registry
   * 
   * @param storage Storage driver for persisting functions (default: in-memory)
   * @param logLevel Log level (default: info)
   */
  constructor(
    storage?: FunctionStorageDriver,
    logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' = 'info'
  ) {
    this.storage = storage || new MemoryFunctionStorage();
    this.logger = new Logger(logLevel);
  }
  
  /**
   * Register a new function
   * 
   * @param definition Function definition
   * @returns Promise resolving to success status
   */
  async registerFunction(definition: FunctionDefinition): Promise<boolean> {
    try {
      // Validate the function definition
      this.validateFunctionDefinition(definition);
      
      // Check if function already exists
      const existing = await this.storage.getFunction(definition.name);
      if (existing) {
        this.logger.warn(`Function ${definition.name} already registered, updating definition`);
      }
      
      // Save the function
      const result = await this.storage.saveFunction(definition);
      
      // Initialize usage stats if new function
      if (!existing) {
        await this.storage.updateUsageStats(definition.name, {
          invocationCount: 0,
          errorCount: 0,
          usedByModels: new Set<string>(),
          avgExecutionTimeMs: 0,
          lastUsed: new Date()
        });
      }
      
      this.logger.info(`Function ${definition.name} registered successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to register function ${definition.name}:`, error);
      return false;
    }
  }
  
  /**
   * Validate a function definition
   * 
   * @param definition Function definition to validate
   * @throws Error if validation fails
   */
  private validateFunctionDefinition(definition: FunctionDefinition): void {
    // Basic validation
    if (!definition.name) {
      throw new Error('Function name is required');
    }
    
    if (!definition.description) {
      throw new Error('Function description is required');
    }
    
    if (!definition.parameters) {
      throw new Error('Function parameters schema is required');
    }
    
    // Validate parameters schema (basic validation)
    if (definition.parameters.type !== 'object') {
      throw new Error('Function parameters must be an object');
    }
  }
  
  /**
   * Get a function definition by name
   * 
   * @param name Function name
   * @returns Promise resolving to function definition
   * @throws OpenRouterError if function not found
   */
  async getFunction(name: string): Promise<FunctionDefinition> {
    const func = await this.storage.getFunction(name);
    if (!func) {
      throw new OpenRouterError(
        `Function "${name}" not found`,
        404,
        null
      );
    }
    return func;
  }
  
  /**
   * Find functions by capability description using fuzzy matching
   * 
   * @param description Capability description to match
   * @param limit Maximum number of matches to return
   * @returns Promise resolving to matching function definitions
   */
  async discoverFunctions(description: string, limit: number = 5): Promise<FunctionDefinition[]> {
    // Get all functions
    const allFunctions = await this.storage.listFunctions();
    
    // Perform simple keyword matching (in a real implementation, this would be more sophisticated)
    const matches = allFunctions.filter(func => {
      const matchText = `${func.name} ${func.description} ${func.tags?.join(' ') || ''}`.toLowerCase();
      const descLower = description.toLowerCase();
      
      // Simple string contains matching (in a real implementation, use embeddings or better NLP)
      return descLower.split(' ').some(word => 
        word.length > 3 && matchText.includes(word)
      );
    });
    
    // Sort by relevance and limit results
    // In a real implementation, this would use a better ranking algorithm
    return matches.slice(0, limit);
  }
  
  /**
   * Get compatible functions for a specific model
   * 
   * @param modelId Model ID to find compatible functions for
   * @returns Promise resolving to compatible function definitions
   */
  async getCompatibleFunctions(modelId: string): Promise<FunctionDefinition[]> {
    const allFunctions = await this.storage.listFunctions();
    
    // Filter functions that are compatible with this model
    return allFunctions.filter(func => {
      // If no compatibility list is specified, assume compatible with all
      if (!func.compatibleWith || func.compatibleWith.length === 0) {
        return true;
      }
      
      // Check if model ID or provider name is in the compatibility list
      const providerName = modelId.split('/')[0];
      return func.compatibleWith.some(pattern => {
        return modelId === pattern || // Exact match
               pattern === '*' || // Wildcard
               pattern === providerName || // Provider match
               pattern.endsWith('*') && modelId.startsWith(pattern.slice(0, -1)); // Prefix match
      });
    });
  }
  
  /**
   * Record function usage statistics
   * 
   * @param name Function name
   * @param modelId Model ID that used the function
   * @param successful Whether the invocation was successful
   * @param executionTimeMs Execution time in milliseconds
   * @returns Promise resolving to success status
   */
  async recordFunctionUsage(
    name: string,
    modelId: string,
    successful: boolean = true,
    executionTimeMs: number = 0
  ): Promise<boolean> {
    try {
      // Get current stats
      const stats = await this.storage.getUsageStats(name) || {
        invocationCount: 0,
        errorCount: 0,
        usedByModels: new Set<string>(),
        avgExecutionTimeMs: 0,
        lastUsed: new Date()
      };
      
      // Update stats
      const newInvocationCount = stats.invocationCount + 1;
      const newErrorCount = stats.errorCount + (successful ? 0 : 1);
      const usedByModels = stats.usedByModels;
      usedByModels.add(modelId);
      
      // Calculate new average execution time
      const newAvgTime = (stats.avgExecutionTimeMs * stats.invocationCount + executionTimeMs) / newInvocationCount;
      
      // Update storage
      return await this.storage.updateUsageStats(name, {
        invocationCount: newInvocationCount,
        errorCount: newErrorCount,
        usedByModels: usedByModels,
        avgExecutionTimeMs: newAvgTime,
        lastUsed: new Date()
      });
    } catch (error) {
      this.logger.error(`Failed to record usage for function ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Execute a function by name with the given arguments
   * 
   * @param name Function name
   * @param args Arguments to pass to the function
   * @param modelId Model ID executing the function (for stats)
   * @returns Promise resolving to function result
   * @throws OpenRouterError if function not found or execution fails
   */
  async executeFunction(name: string, args: any, modelId: string): Promise<any> {
    const startTime = Date.now();
    let successful = false;
    
    try {
      // Get the function
      const func = await this.getFunction(name);
      
      // Check if implementation exists
      if (!func.implementation) {
        throw new OpenRouterError(
          `Function "${name}" has no implementation`,
          501,
          null
        );
      }
      
      // Execute the function
      const result = await func.implementation(args);
      
      // Record successful usage
      successful = true;
      return result;
    } catch (error) {
      // Record failed usage
      this.logger.error(`Function execution failed for ${name}:`, error);
      throw error instanceof OpenRouterError ? error : new OpenRouterError(
        `Function execution failed: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    } finally {
      // Record usage stats regardless of success/failure
      const executionTime = Date.now() - startTime;
      this.recordFunctionUsage(name, modelId, successful, executionTime).catch(e => {
        this.logger.error('Failed to record function usage stats:', e);
      });
    }
  }
  
  /**
   * List all registered functions
   * 
   * @param tag Optional tag to filter by
   * @returns Promise resolving to array of function definitions
   */
  async listFunctions(tag?: string): Promise<FunctionDefinition[]> {
    return this.storage.listFunctions(tag);
  }
  
  /**
   * Delete a function
   * 
   * @param name Function name
   * @returns Promise resolving to success status
   */
  async deleteFunction(name: string): Promise<boolean> {
    return this.storage.deleteFunction(name);
  }
  
  /**
   * Get usage statistics for a function
   * 
   * @param name Function name
   * @returns Promise resolving to usage statistics
   */
  async getFunctionStats(name: string): Promise<FunctionUsageStats | null> {
    return this.storage.getUsageStats(name);
  }
  
  /**
   * Get the most frequently used functions
   * 
   * @param limit Maximum number of functions to return
   * @returns Promise resolving to array of function definitions with usage stats
   */
  async getPopularFunctions(limit: number = 10): Promise<Array<FunctionDefinition & { usageStats: FunctionUsageStats }>> {
    const allFunctions = await this.storage.listFunctions();
    const results: Array<FunctionDefinition & { usageStats: FunctionUsageStats }> = [];
    
    for (const func of allFunctions) {
      const stats = await this.storage.getUsageStats(func.name);
      if (stats) {
        results.push({
          ...func,
          usageStats: stats
        });
      }
    }
    
    // Sort by invocation count (descending)
    results.sort((a, b) => b.usageStats.invocationCount - a.usageStats.invocationCount);
    
    return results.slice(0, limit);
  }
}
