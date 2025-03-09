/**
 * Endpoint Configuration Types
 * 
 * This module defines the interfaces for configuring AI provider endpoints
 * with automatic function registry integration.
 */

import { FunctionRegistry } from '../utils/function-registry.js';
import { VectorDB } from './vector-db.js';

/**
 * Base endpoint configuration
 */
export interface BaseEndpointConfig {
  /**
   * Base URL for the API endpoint
   */
  baseUrl: string;
  
  /**
   * API key for authentication
   */
  apiKey: string;
  
  /**
   * Optional organization ID
   */
  organizationId?: string;
  
  /**
   * Optional model ID prefix for this endpoint
   */
  modelPrefix?: string;
  
  /**
   * Optional function registry for automatic function discovery
   */
  functionRegistry?: FunctionRegistry;
  
  /**
   * Optional vector database for persistent storage
   */
  vectorDb?: VectorDB;
  
  /**
   * Optional extra headers to include in requests
   */
  headers?: Record<string, string>;
  
  /**
   * Whether to automatically discover and store functions
   * Default: true if functionRegistry is provided
   */
  autoDiscoverFunctions?: boolean;
  
  /**
   * Whether to persist discovered functions to vector database
   * Default: true if both functionRegistry and vectorDb are provided
   */
  persistFunctions?: boolean;
  
  /**
   * Log level for endpoint operations
   */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * OpenAI-specific endpoint configuration
 */
export interface OpenAIEndpointConfig extends BaseEndpointConfig {
  type: 'openai';
  defaultModel?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Anthropic-specific endpoint configuration
 */
export interface AnthropicEndpointConfig extends BaseEndpointConfig {
  type: 'anthropic';
  defaultModel?: string;
  apiVersion?: string;
}

/**
 * Google Gemini-specific endpoint configuration 
*/
export interface GeminiEndpointConfig extends BaseEndpointConfig {
  type: 'gemini';
  projectId?: string;
  defaultModel?: string;
  location?: string;
}

/**
 * Google Vertex AI-specific endpoint configuration
 */
export interface VertexEndpointConfig extends BaseEndpointConfig {
  type: 'vertex';
  projectId: string;
  location?: string;
  defaultModel?: string;
}

/**
 * OpenRouter-specific endpoint configuration
 */
export interface OpenRouterEndpointConfig extends BaseEndpointConfig {
  type: 'openrouter';
  defaultModel?: string;
  referer?: string;
}

/**
 * Custom endpoint configuration with format transformers
 */
export interface CustomEndpointConfig extends BaseEndpointConfig {
  type: 'custom';
  
  /**
   * Transform request to endpoint format
   */
  requestTransformer?: (request: any) => any;
  
  /**
   * Transform response from endpoint format
   */
  responseTransformer?: (response: any) => any;
  
  /**
   * Custom function discovery logic
   */
  functionDiscovery?: {
    /**
     * Extract function definitions from responses
     */
    extractFunctions?: (response: any) => any[];
    
    /**
     * Convert extracted functions to standard format
     */
    transformFunction?: (func: any) => any;
  };
}

/**
 * Union type of all endpoint configurations
 */
export type EndpointConfig = 
  | OpenAIEndpointConfig 
  | AnthropicEndpointConfig
  | GeminiEndpointConfig
  | VertexEndpointConfig
  | OpenRouterEndpointConfig
  | CustomEndpointConfig;

/**
 * Endpoint metadata stored in function registry
 */
export interface EndpointMetadata {
  id: string;
  type: EndpointConfig['type'];
  baseUrl: string;
  modelPrefix?: string;
  discoveredFunctions: string[];
  lastDiscovery?: Date;
  stats: {
    requestCount: number;
    errorCount: number;
    avgLatencyMs: number;
    lastUsed: Date;
  };
}
