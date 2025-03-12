/**
 * OneAPI Bridge - Connects dashboard client to OneAPI implementation
 * 
 * This file bridges the gap between the OneAPIClient used by the dashboard
 * and the actual OneAPI implementation.
 */

// In a module context, this would be proper importing
// For browser compatibility, we'll use the global OneAPI object

// This function initializes the bridge when the document is loaded
function initOneAPIBridge() {
  console.log('Initializing OneAPI Bridge...');
  
  // Override fetch requests to API endpoints by monkey-patching fetch
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    // If URL is an API endpoint we want to intercept
    if (typeof url === 'string' && url.includes('/api/')) {
      
      // Extract endpoint and handle accordingly
      const endpoint = url.split('/api/')[1];
      
      // Handle different endpoints
      if (endpoint === 'status') {
        return handleStatusRequest();
      } else if (endpoint === 'v1/models') {
        return handleModelsRequest();
      } else if (endpoint === 'update-keys') {
        return handleUpdateKeysRequest(options);
      } else if (endpoint === 'chat') {
        return handleChatRequest(options);
      } else if (endpoint === 'chat/stream') {
        return handleChatStreamRequest(options);
      } else if (endpoint === 'sdk/functions') {
        return handleSDKFunctionsRequest();
      } else if (endpoint === 'metrics') {
        return handleMetricsRequest();
      } else if (endpoint === 'metrics/operations') {
        return handleOperationsRequest();
      } else if (endpoint === 'metrics/errors') {
        return handleErrorsRequest();
      }
    }
    
    // For any other requests, use the original fetch
    return originalFetch.apply(this, arguments);
  };
  
  console.log('OneAPI Bridge initialized successfully');
}

// Handle API status request
async function handleStatusRequest() {
  console.log('Handling status request');
  try {
    // Get oneAPI instance
    const oneAPI = window.OneAPI.getOneAPI();
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
    console.error('Error handling status request:', error);
    return createErrorResponse('Failed to get status', 500);
  }
}

// Handle models list request
async function handleModelsRequest() {
  console.log('Handling models request');
  try {
    // Get oneAPI instance
    const oneAPI = window.OneAPI.getOneAPI();
    const models = await oneAPI.listModels();
    
    return createSuccessResponse(models);
  } catch (error) {
    console.error('Error handling models request:', error);
    return createErrorResponse('Failed to list models', 500);
  }
}

// Handle API key update request
async function handleUpdateKeysRequest(options) {
  console.log('Handling update keys request');
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
    
    // Get oneAPI instance and reset it with new config
    window.OneAPI.resetOneAPI();
    const oneAPI = window.OneAPI.getOneAPI(config);
    
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
    console.error('Error handling update keys request:', error);
    return createErrorResponse('Failed to update API keys', 500);
  }
}

// Handle chat completion request
async function handleChatRequest(options) {
  console.log('Handling chat request');
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
    
    // Get oneAPI instance
    const oneAPI = window.OneAPI.getOneAPI();
    const response = await oneAPI.createChatCompletion(chatRequest);
    
    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error handling chat request:', error);
    return createErrorResponse('Failed to create chat completion', 500);
  }
}

// Handle streaming chat completion request
async function handleChatStreamRequest(options) {
  console.log('Handling chat stream request');
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
    
    // Get oneAPI instance
    const oneAPI = window.OneAPI.getOneAPI();
    const streamResponse = await oneAPI.createChatCompletionStream(chatRequest);
    
    // Create a mock response for the stream
    return new Response(streamResponse);
  } catch (error) {
    console.error('Error handling chat stream request:', error);
    return createErrorResponse('Failed to create streaming chat completion', 500);
  }
}

// Handle SDK functions request
async function handleSDKFunctionsRequest() {
  console.log('Handling SDK functions request');
  try {
    // Get oneAPI instance
    const oneAPI = window.OneAPI.getOneAPI();
    
    // Get all available functions
    const functions = [];
    
    // Get provider functions
    for (const [providerName, provider] of Object.entries(oneAPI.providers)) {
      if (provider && typeof provider === 'object') {
        const providerFunctions = Object.getOwnPropertyNames(Object.getPrototypeOf(provider))
          .filter(name => typeof provider[name] === 'function' && name !== 'constructor')
          .map(name => ({
            id: `${providerName}.${name}`,
            name: name,
            provider: providerName,
            category: 'provider',
            description: `${providerName} provider ${name} function`
          }));
        functions.push(...providerFunctions);
      }
    }
    
    // Get agent functions
    for (const [agentName, agent] of Object.entries(oneAPI.agents)) {
      if (agent && typeof agent === 'object') {
        const agentFunctions = Object.getOwnPropertyNames(Object.getPrototypeOf(agent))
          .filter(name => typeof agent[name] === 'function' && name !== 'constructor')
          .map(name => ({
            id: `${agentName}.${name}`,
            name: name,
            provider: agentName,
            category: 'agent',
            description: `${agentName} agent ${name} function`
          }));
        functions.push(...agentFunctions);
      }
    }
    
    // Get tool functions
    for (const [toolName, tool] of Object.entries(oneAPI.tools)) {
      if (tool && typeof tool === 'object') {
        const toolFunctions = Object.getOwnPropertyNames(Object.getPrototypeOf(tool))
          .filter(name => typeof tool[name] === 'function' && name !== 'constructor')
          .map(name => ({
            id: `${toolName}.${name}`,
            name: name,
            provider: toolName,
            category: 'tool',
            description: `${toolName} tool ${name} function`
          }));
        functions.push(...toolFunctions);
      }
    }
    
    // Get OneAPI methods
    const oneAPIFunctions = Object.getOwnPropertyNames(Object.getPrototypeOf(oneAPI))
      .filter(name => typeof oneAPI[name] === 'function' && name !== 'constructor')
      .map(name => ({
        id: `oneAPI.${name}`,
        name: name,
        provider: 'oneAPI',
        category: 'core',
        description: `OneAPI core ${name} function`
      }));
    functions.push(...oneAPIFunctions);
    
    return createSuccessResponse(functions);
  } catch (error) {
    console.error('Error handling SDK functions request:', error);
    return createErrorResponse('Failed to get SDK functions', 500);
  }
}

// Helper function to create success response
function createSuccessResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle metrics request
async function handleMetricsRequest() {
  console.log('Handling metrics request');
  try {
    // Get oneAPI instance
    const oneAPI = window.OneAPI.getOneAPI();
    
    // Try to get metrics from the oneAPI instance
    // If the method doesn't exist, fall back to mock data
    let metrics;
    if (oneAPI.getMetrics && typeof oneAPI.getMetrics === 'function') {
      metrics = await oneAPI.getMetrics();
    } else {
      // Generate mock metrics data similar to what's in the metrics.js file
      metrics = generateMockMetricsData();
    }
    
    return createSuccessResponse(metrics);
  } catch (error) {
    console.error('Error handling metrics request:', error);
    return createErrorResponse('Failed to get metrics data', 500);
  }
}

// Handle operations request
async function handleOperationsRequest() {
  console.log('Handling operations request');
  
  try {
    // Get cached or generated metrics
    let metrics;
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        metrics = await response.json();
      }
    } catch (error) {
      console.error('Error fetching metrics for operations:', error);
    }
    
    // If we couldn't get metrics, generate them
    if (!metrics) {
      metrics = generateMockMetricsData();
    }
    
    // Extract and return the recentOperations
    return createSuccessResponse(metrics.recentOperations || []);
  } catch (error) {
    console.error('Error handling operations request:', error);
    return createErrorResponse('Failed to get operations data', 500);
  }
}

// Handle errors request
async function handleErrorsRequest() {
  console.log('Handling errors request');
  
  try {
    // Get cached or generated metrics
    let metrics;
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        metrics = await response.json();
      }
    } catch (error) {
      console.error('Error fetching metrics for errors:', error);
    }
    
    // If we couldn't get metrics, generate them
    if (!metrics) {
      metrics = generateMockMetricsData();
    }
    
    // Extract and return the errors
    return createSuccessResponse(metrics.errors || []);
  } catch (error) {
    console.error('Error handling errors request:', error);
    return createErrorResponse('Failed to get errors data', 500);
  }
}

// Generate mock metrics data for testing
function generateMockMetricsData() {
  // Get providers list from OneAPI if available
  const oneAPI = window.OneAPI.getOneAPI();
  const providerStatus = oneAPI.checkStatus();
  
  // Basic metrics data
  const totalRequests = Math.floor(Math.random() * 3000) + 500;
  const inputTokens = totalRequests * (Math.floor(Math.random() * 500) + 300);
  const outputTokens = inputTokens * (Math.random() * 0.4 + 0.2); // 20-60% of input tokens
  const avgResponseTime = Math.floor(Math.random() * 300) + 200;
  
  // Provider metrics
  const providerNames = [
    { id: 'openai', name: 'OpenAI', status: providerStatus.openai },
    { id: 'anthropic', name: 'Anthropic', status: providerStatus.anthropic },
    { id: 'google', name: 'Google Gemini', status: providerStatus.gemini },
    { id: 'mistral', name: 'Mistral', status: providerStatus.mistral },
    { id: 'together', name: 'Together', status: providerStatus.together }
  ];
  
  // Calculate distribution of requests across providers
  let remainingRequests = totalRequests;
  const providers = [];
  
  // Assign more requests to providers that are configured
  providerNames.forEach((provider, index) => {
    if (index === providerNames.length - 1) {
      // Last provider gets all remaining requests
      const requests = remainingRequests;
      const inputTokenShare = Math.floor(inputTokens * (requests / totalRequests));
      const outputTokenShare = Math.floor(outputTokens * (requests / totalRequests));
      
      providers.push({
        id: provider.id,
        requests: requests,
        inputTokens: inputTokenShare,
        outputTokens: outputTokenShare,
        avgResponseTime: Math.floor(Math.random() * 200) + 300,
        successRate: 95 + Math.random() * 5
      });
    } else {
      // Calculate a share for this provider
      const share = provider.status ? 
        (0.15 + Math.random() * 0.25) : // 15-40% for configured providers
        (Math.random() * 0.15);         // 0-15% for non-configured providers
      
      const requests = Math.floor(totalRequests * share);
      remainingRequests -= requests;
      
      const inputTokenShare = Math.floor(inputTokens * (requests / totalRequests));
      const outputTokenShare = Math.floor(outputTokens * (requests / totalRequests));
      
      providers.push({
        id: provider.id,
        requests: requests,
        inputTokens: inputTokenShare,
        outputTokens: outputTokenShare,
        avgResponseTime: Math.floor(Math.random() * 200) + 300,
        successRate: provider.status ? (97 + Math.random() * 3) : (90 + Math.random() * 7)
      });
    }
  });
  
  // Generate recent operations
  const recentOperations = [];
  for (let i = 0; i < 15; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const type = Math.random() > 0.3 ? 'chat' : 'embedding';
    const status = Math.random() > 0.1 ? 'success' : 'error';
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7200000)).toISOString();
    
    recentOperations.push({
      id: `op-${Date.now()}-${i}`,
      type,
      provider: provider.id,
      model: `${provider.id}/${type === 'chat' ? 'gpt-3.5-turbo' : 'text-embedding-ada-002'}`,
      status,
      timestamp,
      details: {
        inputTokens: Math.floor(Math.random() * 1000) + 100,
        outputTokens: Math.floor(Math.random() * 500) + 50,
        processingTime: Math.floor(Math.random() * 500) + 200,
        prompt: type === 'chat' ? 'User query about AI capabilities' : null
      }
    });
  }
  
  // Generate errors
  const errors = [];
  const errorTypes = ['rate_limit_exceeded', 'invalid_request_error', 'authentication_error'];
  const errorMessages = [
    'Rate limit exceeded for this API key',
    'The model does not exist or you do not have access to it',
    'Invalid Authentication: Incorrect API key provided'
  ];
  
  for (let i = 0; i < 5; i++) {
    const errorIndex = Math.floor(Math.random() * errorTypes.length);
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 259200000)).toISOString();
    
    errors.push({
      id: `err-${Date.now()}-${i}`,
      provider: provider.id,
      type: errorTypes[errorIndex],
      message: errorMessages[errorIndex],
      timestamp,
      resolved: Math.random() > 0.6
    });
  }
  
  return {
    totalRequests,
    inputTokens,
    outputTokens,
    avgResponseTime,
    providers,
    recentOperations,
    errors
  };
}

// Helper function to create error response
function createErrorResponse(message, status = 400) {
  return new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', initOneAPIBridge);
