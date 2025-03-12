/**
 * Script to enhance metrics.js mock data
 * This will update the mock data in metrics.js to provide more realistic test scenarios
 */

import fs from 'fs/promises';
import path from 'path';

async function enhanceMockMetrics() {
  console.log("Enhancing metrics mock data...");
  
  // Path to the metrics.js file
  const metricsFilePath = path.join(process.cwd(), 'metrics.js');
  
  // Read the current file
  let metricsFileContent = await fs.readFile(metricsFilePath, 'utf8');
  
  // Generate enhanced mock data
  const enhancedData = generateEnhancedMockData();
  
  // Replace the mock data in the file
  const mockDataStart = "return {";
  const mockDataEnd = "};";
  
  const startIndex = metricsFileContent.indexOf(mockDataStart);
  if (startIndex === -1) {
    console.error("Could not find start of mock data in metrics.js");
    return;
  }
  
  let endIndex = metricsFileContent.indexOf(mockDataEnd, startIndex);
  if (endIndex === -1) {
    console.error("Could not find end of mock data in metrics.js");
    return;
  }
  endIndex += mockDataEnd.length;
  
  // Construct the updated file content
  const updatedContent = 
    metricsFileContent.substring(0, startIndex) + 
    "return " + JSON.stringify(enhancedData, null, 4) + ";" +
    metricsFileContent.substring(endIndex);
  
  // Write the updated file
  await fs.writeFile(metricsFilePath, updatedContent, 'utf8');
  
  console.log("Mock metrics data enhanced successfully!");
  console.log("Please refresh the dashboard to see the updated metrics.");
}

function generateEnhancedMockData() {
  // Enhanced data with more realistic patterns
  const totalRequests = 3427;
  const inputTokens = 2218560;
  const outputTokens = 642980;
  const avgResponseTime = 453;
  
  const providers = [
    {
      id: 'openai',
      requests: 1482,
      inputTokens: 1025250,
      outputTokens: 298840,
      avgResponseTime: 382,
      successRate: 99.7
    },
    {
      id: 'anthropic',
      requests: 846,
      inputTokens: 782750,
      outputTokens: 219240,
      avgResponseTime: 512,
      successRate: 98.9
    },
    {
      id: 'google',
      requests: 524,
      inputTokens: 247820,
      outputTokens: 78460,
      avgResponseTime: 327,
      successRate: 99.4
    },
    {
      id: 'mistral',
      requests: 427,
      inputTokens: 129800,
      outputTokens: 39940,
      avgResponseTime: 378,
      successRate: 97.8
    },
    {
      id: 'together',
      requests: 148,
      inputTokens: 32940,
      outputTokens: 6500,
      avgResponseTime: 468,
      successRate: 95.2
    }
  ];
  
  // Generate more realistic recent operations
  const recentOperations = [];
  const operationTypes = ['chat', 'embedding', 'chat', 'chat', 'embedding'];
  const models = [
    'openai/gpt-4-turbo',
    'anthropic/claude-3-opus',
    'google/gemini-pro',
    'mistral/mistral-medium',
    'together/llama-3-70b-instruct'
  ];
  const statuses = ['success', 'success', 'success', 'success', 'error'];
  
  for (let i = 0; i < 15; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)].id;
    const type = operationTypes[Math.floor(Math.random() * operationTypes.length)];
    const modelIndex = Math.floor(Math.random() * models.length);
    const model = models[modelIndex];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Time between now and 2 hours ago
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7200000)).toISOString();
    
    // Random request data
    const inputTokenCount = Math.floor(Math.random() * 2000) + 100;
    const outputTokenCount = Math.floor(Math.random() * 1000) + 50;
    const processingTime = Math.floor(Math.random() * 800) + 200;
    
    recentOperations.push({
      id: `op-${Date.now()}-${i}`,
      type,
      provider,
      model,
      status,
      timestamp,
      details: {
        inputTokens: inputTokenCount,
        outputTokens: outputTokenCount,
        processingTime,
        prompt: type === 'chat' ? 'User query about ' + ['AI capabilities', 'data processing', 'language models', 'machine learning', 'image generation'][Math.floor(Math.random() * 5)] : null
      }
    });
  }
  
  // Generate more realistic error logs
  const errors = [];
  const errorTypes = ['rate_limit_exceeded', 'invalid_request_error', 'authentication_error', 'server_error', 'context_length_exceeded'];
  const errorMessages = [
    'You exceeded your current quota, please check your plan and billing details.',
    'The model does not exist or you do not have access to it.',
    'Invalid Authentication: Incorrect API key provided.',
    'The server had an error while processing your request.',
    'This model\'s maximum context length is exceeded.'
  ];
  
  for (let i = 0; i < 8; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)].id;
    const errorIndex = Math.floor(Math.random() * errorTypes.length);
    const errorType = errorTypes[errorIndex];
    const message = errorMessages[errorIndex];
    
    // Time between now and 3 days ago
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 259200000)).toISOString();
    
    errors.push({
      id: `err-${Date.now()}-${i}`,
      provider,
      type: errorType,
      message,
      timestamp,
      resolved: Math.random() > 0.6, // Some errors are resolved
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

// Run the enhancement
enhanceMockMetrics().catch(console.error);
