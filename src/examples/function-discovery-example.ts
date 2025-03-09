/**
 * Function Discovery Example
 * 
 * This example demonstrates how to use the automatic function discovery system
 * to discover, cache, and manage available functions from different endpoints.
 */

import { EndpointRouter } from '../core/endpoint-router.js';
import { FunctionRegistry } from '../utils/function-registry.js';
import { FunctionDiscoveryService } from '../utils/function-discovery.js';
import { DbFunctionStorage } from '../utils/db-function-storage.js';
import { ChromaVectorDB } from '../utils/chroma-vector-db.js';
import { OpenAIEmbeddingGenerator } from '../utils/openai-embedding.js';
import { FunctionDefinition } from '../utils/function-registry.js';
import { CustomEndpointConfig } from '../interfaces/endpoints.js';
import { RouterCallOptions, RouterOptions } from '../interfaces/router.js';
import { EndpointRouterConfig } from '../core/endpoint-router.js';

// Example function definitions for testing
const EXAMPLE_FUNCTIONS: FunctionDefinition[] = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City and state (e.g. San Francisco, CA)'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'get_stock_price',
    description: 'Get current stock price',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Stock symbol (e.g. AAPL)'
        }
      },
      required: ['symbol']
    }
  }
];

async function main() {
  console.log('Function Discovery Example');
  console.log('-------------------------\n');

  try {
    // For demonstration, we'll skip ChromaDB and use a simple mock
    console.log('Setting up example with mock implementations...');
    
    // Mock function registry with example functions
    const mockRegistry = {
      registerFunctions: async (funcs: FunctionDefinition[]) => {
        console.log(`Would register ${funcs.length} functions`);
        return true;
      },
      getFunctions: async () => EXAMPLE_FUNCTIONS,
      searchFunctions: async (query: string) => {
        return EXAMPLE_FUNCTIONS.filter(f => 
          f.name.includes(query) || f.description.toLowerCase().includes(query.toLowerCase())
        );
      }
    };

    // Mock discovery service
    const mockDiscoveryService = {
      discoverFunctions: async (endpoint: any) => ({
        functions: await mockRegistry.getFunctions(),
        fromCache: false,
        lastDiscovered: new Date()
      }),
      updateEndpointStats: async (endpoint: any, stats: any) => {
        console.log('Would update stats:', stats);
      }
    };

    // Example 1: Custom endpoint with explicit function definitions
  console.log('Example 1: Custom Endpoint with Explicit Functions');
  console.log('------------------------------------------------');

  const customEndpoint: CustomEndpointConfig = {
    type: 'custom',
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'CUSTOM_API_KEY',
    functionDiscovery: {
      extractFunctions: () => EXAMPLE_FUNCTIONS,
      transformFunction: (func: any) => func // Identity transform
    }
  };

    console.log('Example: Discovering Functions');
    console.log('-----------------------------');

    const discoveredFuncs = await mockDiscoveryService.discoverFunctions(customEndpoint);
    console.log('\nDiscovered functions:');
    for (const func of discoveredFuncs.functions) {
      console.log(`- ${func.name}: ${func.description}`);
    }

    console.log('\nExample: Function Search');
    console.log('------------------------');

    const weatherFuncs = await mockRegistry.searchFunctions('weather');
    console.log('\nFunctions related to weather:');
    for (const func of weatherFuncs) {
      console.log(`- ${func.name}: ${func.description}`);
    }

  // Example 3: OpenAI endpoint with automatic function discovery
  console.log('\nExample 3: OpenAI Function Discovery');
  console.log('-----------------------------------');

  const openaiEndpoint = {
    type: 'openai' as const,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'OPENAI_API_KEY'
  };

  try {
    console.log('Discovering OpenAI functions...');
    const openaiResult = await mockDiscoveryService.discoverFunctions(openaiEndpoint);
    console.log('Discovered functions:');
    for (const func of openaiResult.functions) {
      console.log(`- ${func.name}: ${func.description}`);
    }
  } catch (error) {
    console.log('OpenAI function discovery not yet implemented');
  }

  // Example 4: Function Usage Statistics
  console.log('\nExample 4: Function Usage Statistics');
  console.log('-----------------------------------');

  // Update stats for the custom endpoint
  await mockDiscoveryService.updateEndpointStats(customEndpoint, {
    requestCount: 10,
    errorCount: 1,
    latencyMs: 250
  });

  // Show simulated usage statistics
  const exampleStats = {
    requestCount: 10,
    errorCount: 1,
    avgLatencyMs: 250,
    lastUsed: new Date()
  };

  console.log('Example Usage Statistics:');
  console.log(`Total Requests: ${exampleStats.requestCount}`);
  console.log(`Error Rate: ${(exampleStats.errorCount / exampleStats.requestCount * 100).toFixed(1)}%`);
  console.log(`Average Latency: ${exampleStats.avgLatencyMs.toFixed(1)}ms`);
  console.log(`Last Used: ${exampleStats.lastUsed.toISOString()}`);

  // Example 5: Using with the Endpoint Router
  console.log('\nExample 5: Integration with Endpoint Router');
  console.log('----------------------------------------');

  const routerConfig: EndpointRouterConfig = {
    endpoints: {
      custom: customEndpoint
    },
    defaultEndpointId: 'custom',
    logLevel: 'info'
  };

  const router = new EndpointRouter(routerConfig);

  // Example chat completion with function discovery
  try {
    // Configure router options
    const routerOptions: RouterOptions = {
      enableFunctionDiscovery: true,
      forceFunctionRefresh: false,
      maxRetries: 3,
      timeout: 30000,
      trackStats: true
    };

    // Create chat completion with function discovery
    const response = await router.createChatCompletion({
      messages: [
        { role: 'user', content: 'What\'s the weather in San Francisco?' }
      ],
      model: 'gpt-4'
    }, {
      endpointId: 'custom',
      ...routerOptions
    });

    console.log('\nRouter Response Example:');
    console.log('------------------------');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('Router example requires full implementation');
  }

  console.log('\nRouter configured with function discovery capabilities:');
  console.log('- Functions will be automatically discovered and cached');
  console.log('- Usage statistics will be tracked');
  console.log('- Semantic search enabled for finding relevant functions');
  
    console.log('\n----------------------------------------\n');

  } catch (error: any) {
    console.error('Failed to initialize or run example:', {
      message: error.message,
      stack: error.stack,
      details: error
    });
    throw error;
  }
}

// Check if this module is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export default main;
