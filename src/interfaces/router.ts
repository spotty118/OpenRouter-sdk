/**
 * Router Interface Types
 */

import { EndpointConfig } from './endpoints.js';
import { FunctionRegistry } from '../utils/function-registry.js';

/**
 * Configuration for the endpoint router
 */
export interface RouterConfig {
  /**
   * Map of endpoint IDs to endpoint configurations
   */
  endpoints: Record<string, EndpointConfig>;
  
  /**
   * Optional function registry for function discovery and caching
   */
  functionRegistry?: FunctionRegistry;
  
  /**
   * Default endpoint ID to use when none specified
   */
  defaultEndpointId?: string;
  
  /**
   * Log level for router operations
   */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Base options for router operations
 */
export interface RouterOptions {
  /**
   * Whether to enable function discovery
   */
  enableFunctionDiscovery?: boolean;
  
  /**
   * Whether to force refresh of discovered functions
   */
  forceFunctionRefresh?: boolean;
  
  /**
   * Maximum retries for failed requests
   */
  maxRetries?: number;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to track usage statistics
   */
  trackStats?: boolean;
  
  /**
   * Additional headers to include in the request
   */
  headers?: Record<string, string>;
}

/**
 * Call options for router operations
 */
export interface RouterCallOptions {
  /**
   * Specific endpoint ID to use
   */
  endpointId?: string;

  /**
   * Additional router options
   */
  options?: RouterOptions;

  /**
   * Model ID to use for the request
   */
  model?: string;
  
  /**
   * Functions available for this call
   */
  functions?: any[];
  
  /**
   * Tool choice configuration
   */
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * Response from a router call
 */
export interface RouterResponse<T = any> {
  /**
   * Response data
   */
  data: T;
  
  /**
   * Endpoint used for the request
   */
  endpoint: {
    id: string;
    type: string;
    baseUrl: string;
  };
  
  /**
   * Functions used in the response (if any)
   */
  functionsUsed?: string[];
  
  /**
   * Usage statistics
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
}
