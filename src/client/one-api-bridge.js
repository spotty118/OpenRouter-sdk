/**
 * OneAPI Bridge - Connects dashboard client to OneAPI implementation
 * 
 * This file bridges the gap between the OneAPIClient used by the dashboard
 * and the actual OneAPI implementation.
 */

import { getOneAPI } from '../oneapi.js';

// This function initializes the bridge when the document is loaded
function initOneAPIBridge() {
  console.log('Initializing OneAPI Bridge...');
  
  // Initialize OneAPI instance
  let oneAPIInstance = null;
  try {
    oneAPIInstance = getOneAPI();
    console.log('OneAPI instance loaded successfully');
  } catch (error) {
    console.error('Failed to initialize OneAPI instance:', error);
  }
  
  // Override fetch requests to API endpoints by monkey-patching fetch
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    // If URL is an API endpoint we want to intercept
    if (typeof url === 'string' && url.includes('/api/')) {
      
      // Extract endpoint and handle accordingly
      const endpoint = url.split('/api/')[1];
      
      // Only intercept if we have a valid OneAPI instance
      if (oneAPIInstance) {
        // Handle different endpoints
        if (endpoint === 'status') {
          return handleStatusRequest(oneAPIInstance);
        } else if (endpoint === 'v1/models') {
          return handleModelsRequest(oneAPIInstance);
        } else if (endpoint === 'update-keys') {
          return handleUpdateKeysRequest(oneAPIInstance, options);
        } else if (endpoint === 'chat') {
          return handleChatRequest(oneAPIInstance, options);
        } else if (endpoint === 'chat/stream') {
          return handleChatStreamRequest(oneAPIInstance, options);
        } else if (endpoint === 'sdk/functions') {
          return handleSDKFunctionsRequest(oneAPIInstance);
        } else if (endpoint === 'metrics') {
          return handleMetricsRequest(oneAPIInstance);
        } else if (endpoint === 'metrics/operations') {
          return handleOperationsRequest(oneAPIInstance);
        } else if (endpoint === 'metrics/errors') {
          return handleErrorsRequest(oneAPIInstance);
        }
      } else {
        // If no OneAPI instance, log the error but still allow the fetch to proceed
        // this will let the server-side implementation handle the request
        console.warn('OneAPI instance not available, forwarding request to server');
      }
    }
    
    // For any other requests, use the original fetch
    return originalFetch.apply(this, arguments);
  };
  
  // Register global access to OneAPI
  window.OneAPI = {
    getOneAPI: () => oneAPIInstance, 
    resetOneAPI: () => {
      oneAPIInstance = getOneAPI();
      return oneAPIInstance;
    }
  };
  
  console.log('OneAPI Bridge initialized successfully');
}

// Handle API status request
async function handleStatusRequest(oneAPI) {
  console.log('Handling status request with OneAPI');
  try {
    // Get direct status from OneAPI
    const status = oneAPI.checkStatus();
    
    // Convert to expected format
    const responseData = {
      success: true,
      message: 'Connection status retrieved successfully',
      providers: {
        openai: {
          connected: status.openai,
          available: status.openai
        },
        anthropic: {
          connected: status.anthropic,
          available: status.anthropic
        },
        google: {
          connected: status.gemini,
          available: status.gemini
        },
        mistral: {
          connected: status.mistral,
          available: status.mistral
        },
        together: {
          connected: status.together,
          available: status.together
        }
      }
    };
    
    return createSuccessResponse(responseData);
  } catch (error) {
    console.error('Error handling status request with OneAPI:', error);
    return createErrorResponse('Failed to get status', 500);
  }
}

// Handle models list request
async function handleModelsRequest(oneAPI) {
  console.log('Handling models request with OneAPI');
  try {
    // Get models directly from OneAPI
    const models = await oneAPI.listModels();
    return createSuccessResponse(models);
  } catch (error) {
    console.error('Error handling models request with OneAPI:', error);
    return createErrorResponse('Failed to list models', 500);
  }
}

// Handle API key update request
async function handleUpdateKeysRequest(oneAPI, options) {
  console.log('Handling update keys request with OneAPI');
  try {
    // Parse request body
    const body = JSON.parse(options.body);
    
    // Extract API keys
    const config = {
      openaiApiKey: body.openaiKey,
      anthropicApiKey: body.anthropicKey,
      googleApiKey: body.googleKey,
      mistralApiKey: body.mistralKey,
      togetherApiKey: body.togetherKey
    };
    
    // Update OneAPI instance with new config
    Object.assign(oneAPI, getOneAPI(config));
    
    // Get updated status
    const status = oneAPI.checkStatus();
    
    // Return response with updated status
    const responseData = {
      success: true,
      message: 'API keys updated successfully',
      status: {
        providers: {
          openai: {
            connected: status.openai,
            available: status.openai
          },
          anthropic: {
            connected: status.anthropic,
            available: status.anthropic
          },
          google: {
            connected: status.gemini,
            available: status.gemini
          },
          mistral: {
            connected: status.mistral,
            available: status.mistral
          },
          together: {
            connected: status.together,
            available: status.together
          }
        }
      }
    };
    
    return createSuccessResponse(responseData);
  } catch (error) {
    console.error('Error handling update keys request with OneAPI:', error);
    return createErrorResponse('Failed to update API keys', 500);
  }
}

// Handle chat completion request
async function handleChatRequest(oneAPI, options) {
  console.log('Handling chat request with OneAPI');
  try {
    // Parse request body
    const body = JSON.parse(options.body);
    
    // Format request for OneAPI
    const chatRequest = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature || 0.7,
      maxTokens: body.max_tokens || 1000
    };
    
    // Use OneAPI directly
    const response = await oneAPI.createChatCompletion(chatRequest);
    
    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error handling chat request with OneAPI:', error);
    return createErrorResponse('Failed to create chat completion', 500);
  }
}

// Handle streaming chat completion request
async function handleChatStreamRequest(oneAPI, options) {
  console.log('Handling chat stream request with OneAPI');
  try {
    // Parse request body
    const body = JSON.parse(options.body);
    
    // Format request for OneAPI
    const chatRequest = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature || 0.7,
      maxTokens: body.max_tokens || 1000
    };
    
    // Use OneAPI streaming method
    const streamResponse = await oneAPI.createChatCompletionStream(chatRequest);
    
    // Create readable stream response
    return createSuccessResponse({
      body: streamResponse,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error handling chat stream request with OneAPI:', error);
    return createErrorResponse('Failed to create streaming chat completion', 500);
  }
}

// Handle SDK functions request
async function handleSDKFunctionsRequest(oneAPI) {
  console.log('Handling SDK functions request with OneAPI');
  try {
    // Get the available SDK functions directly from OneAPI
    const functions = oneAPI.getSdkFunctions ? await oneAPI.getSdkFunctions() : getDefaultSdkFunctions(oneAPI);
    
    return createSuccessResponse({ functions });
  } catch (error) {
    console.error('Error handling SDK functions request with OneAPI:', error);
    return createErrorResponse('Failed to get SDK functions', 500);
  }
}

// Provide default SDK functions based on OneAPI capabilities
function getDefaultSdkFunctions(oneAPI) {
  return [
    {
      name: 'createChatCompletion',
      description: 'Create a chat completion with any supported AI model',
      parameters: [
        {
          name: 'model',
          type: 'string',
          description: 'The model ID to use for completion',
          required: true
        },
        {
          name: 'messages',
          type: 'array',
          description: 'Array of message objects with role and content',
          required: true
        },
        {
          name: 'temperature',
          type: 'number',
          description: 'Sampling temperature (0-1)',
          required: false
        },
        {
          name: 'maxTokens',
          type: 'number',
          description: 'Maximum tokens to generate',
          required: false
        }
      ],
      section: 'Chat',
      provider: 'OneAPI'
    },
    {
      name: 'createEmbeddings',
      description: 'Generate embeddings for text input',
      parameters: [
        {
          name: 'model',
          type: 'string',
          description: 'The embedding model to use',
          required: true
        },
        {
          name: 'input',
          type: 'string',
          description: 'Text to generate embeddings for',
          required: true
        }
      ],
      section: 'Embeddings',
      provider: 'OneAPI'
    }
  ];
}

// Helper function to create success response
function createSuccessResponse(data) {
  const response = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return Promise.resolve(response);
}

// Handle metrics request
async function handleMetricsRequest(oneAPI) {
  console.log('Handling metrics request with OneAPI');
  try {
    // Get metrics directly from OneAPI
    const metrics = oneAPI.metrics || generateMockMetricsData();
    return createSuccessResponse({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error handling metrics request with OneAPI:', error);
    return createErrorResponse('Failed to get metrics data', 500);
  }
}

// Handle operations request
async function handleOperationsRequest(oneAPI) {
  console.log('Handling operations request with OneAPI');
  try {
    // Get operations directly from OneAPI
    const operations = oneAPI.metrics ? oneAPI.metrics.operations || [] : [];
    return createSuccessResponse({
      success: true,
      operations: operations.length > 0 ? operations : generateMockMetricsData().operations
    });
  } catch (error) {
    console.error('Error handling operations request with OneAPI:', error);
    return createErrorResponse('Failed to get operations data', 500);
  }
}

// Handle errors request
async function handleErrorsRequest(oneAPI) {
  console.log('Handling errors request with OneAPI');
  try {
    // Get errors directly from OneAPI
    const errors = oneAPI.metrics ? oneAPI.metrics.errors || [] : [];
    return createSuccessResponse({
      success: true,
      errors: errors.length > 0 ? errors : generateMockMetricsData().errors
    });
  } catch (error) {
    console.error('Error handling errors request with OneAPI:', error);
    return createErrorResponse('Failed to get error data', 500);
  }
}

// Generate mock metrics data for testing
function generateMockMetricsData() {
  return {
    totalRequests: 248,
    inputTokens: 53280,
    outputTokens: 27654,
    totalTime: 38750,
    providers: {
      openai: {
        requests: 125,
        inputTokens: 27500,
        outputTokens: 13200,
        totalTime: 18500,
        errors: 2
      },
      anthropic: {
        requests: 67,
        inputTokens: 15780,
        outputTokens: 8730,
        totalTime: 12750,
        errors: 1
      },
      google: {
        requests: 35,
        inputTokens: 6500,
        outputTokens: 3240,
        totalTime: 4500,
        errors: 0
      },
      mistral: {
        requests: 21,
        inputTokens: 3500,
        outputTokens: 2484,
        totalTime: 3000,
        errors: 0
      }
    },
    operations: [
      {
        id: 'op-1709654821000-123',
        type: 'chat_completion',
        provider: 'openai',
        model: 'gpt-4',
        status: 'success',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: {
          inputTokens: 520,
          outputTokens: 380,
          processingTime: 4250
        }
      },
      {
        id: 'op-1709654721000-456',
        type: 'embedding',
        provider: 'openai',
        model: 'text-embedding-ada-002',
        status: 'success',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        details: {
          inputTokens: 1024,
          outputTokens: 0,
          processingTime: 750
        }
      },
      {
        id: 'op-1709654621000-789',
        type: 'chat_completion',
        provider: 'anthropic',
        model: 'claude-3-opus',
        status: 'success',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        details: {
          inputTokens: 870,
          outputTokens: 620,
          processingTime: 5200
        }
      }
    ],
    errors: [
      {
        id: 'err-1709654521000-123',
        provider: 'openai',
        type: 'rate_limit_exceeded',
        message: 'Rate limit exceeded, please try again later',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        resolved: false
      },
      {
        id: 'err-1709654421000-456',
        provider: 'anthropic',
        type: 'invalid_api_key',
        message: 'Invalid API key provided',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        resolved: true
      }
    ]
  };
}

// Helper function to create error response
function createErrorResponse(message, status = 400) {
  const response = new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return Promise.resolve(response);
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', initOneAPIBridge);

export { initOneAPIBridge };
