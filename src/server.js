/**
 * OpenRouter SDK Production Server
 * Implements real provider integrations using OpenRouter SDK
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/google-gemini.js';
import { MistralProvider } from './providers/mistral.js';
import { TogetherProvider } from './providers/together.js';
import { getOneAPI } from './oneapi.js';

// Get the current directory path (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to API keys storage
const API_KEYS_PATH = path.join(__dirname, '../data/api-keys.js');

// Function to load API keys
async function loadApiKeys() {
  try {
    // Import API keys from file
    const apiKeysModule = await import(`../data/api-keys.js?timestamp=${Date.now()}`);
    const apiKeys = apiKeysModule.default;
    
    // Set environment variables from loaded keys
    if (apiKeys.openaiKey) process.env.OPENAI_API_KEY = apiKeys.openaiKey;
    if (apiKeys.anthropicKey) process.env.ANTHROPIC_API_KEY = apiKeys.anthropicKey;
    if (apiKeys.googleKey) process.env.GOOGLE_API_KEY = apiKeys.googleKey;
    if (apiKeys.mistralKey) process.env.MISTRAL_API_KEY = apiKeys.mistralKey;
    if (apiKeys.togetherKey) process.env.TOGETHER_API_KEY = apiKeys.togetherKey;
    
    console.log('API keys loaded successfully:', Object.keys(apiKeys).filter(k => apiKeys[k]).join(', '));
    return apiKeys;
  } catch (error) {
    console.warn('Failed to load API keys:', error.message);
    return {};
  }
}

// Function to save API keys
async function saveApiKeys(keys) {
  try {
    const content = `/**
 * Persistent API Key Storage for OpenRouter SDK
 */

export default {
  openaiKey: "${keys.openaiKey || ''}",
  anthropicKey: "${keys.anthropicKey || ''}",
  googleKey: "${keys.googleKey || ''}",
  mistralKey: "${keys.mistralKey || ''}",
  togetherKey: "${keys.togetherKey || ''}"
};`;

    fs.writeFileSync(API_KEYS_PATH, content, 'utf8');
    console.log('API keys saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save API keys:', error);
    return false;
  }
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000; // Changed to port 3000 to match default expectations

// Load API keys at startup
await loadApiKeys();

// Initialize providers
const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const gemini = new GeminiProvider({
  apiKey: process.env.GOOGLE_API_KEY
});

const mistral = new MistralProvider({
  apiKey: process.env.MISTRAL_API_KEY
});

const together = new TogetherProvider({
  apiKey: process.env.TOGETHER_API_KEY
});

// Initialize OneAPI with all providers
const oneAPI = getOneAPI({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY,
  mistralApiKey: process.env.MISTRAL_API_KEY,
  togetherApiKey: process.env.TOGETHER_API_KEY
});

// Middleware
app.use(express.json());

// Set correct MIME type for JavaScript modules
app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
  }
  next();
});

// Routes - define before static middleware to ensure they take precedence
app.get('/', (req, res) => {
  // Show dashboard by default instead of chat interface
  // Use absolute redirect to ensure it works in all environments
  res.redirect(302, '/dashboard');
});

// Serve static files after defining critical routes
app.use(express.static(path.join(__dirname, '..')));

// Dashboard route
app.get('/dashboard', (req, res) => {
  // Set appropriate headers to prevent caching issues
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// Original chat interface
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// API endpoint for status check
app.get('/api/status', (req, res) => {
  const status = oneAPI.checkStatus();
  
  // Log the status for debugging
  console.log('API Status:', status);
  
  res.json(status);
});

// API endpoint for updating API keys
app.post('/api/update-keys', async (req, res) => {
  try {
    const { openaiKey, anthropicKey, googleKey, mistralKey, togetherKey } = req.body;
    
    // Update environment variables
    if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
    if (anthropicKey) process.env.ANTHROPIC_API_KEY = anthropicKey;
    if (googleKey) process.env.GOOGLE_API_KEY = googleKey;
    if (mistralKey) process.env.MISTRAL_API_KEY = mistralKey;
    if (togetherKey) process.env.TOGETHER_API_KEY = togetherKey;
    
    // Save keys to persistent storage
    const saveResult = await saveApiKeys({
      openaiKey, anthropicKey, googleKey, mistralKey, togetherKey
    });
    
    // Reinitialize OneAPI with updated keys
    Object.assign(oneAPI, getOneAPI({
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      googleApiKey: process.env.GOOGLE_API_KEY,
      mistralApiKey: process.env.MISTRAL_API_KEY,
      togetherApiKey: process.env.TOGETHER_API_KEY
    }));
    
    // Return the new status
    const status = oneAPI.checkStatus();
    res.json({
      success: true,
      message: 'API keys updated and saved successfully',
      persistentSave: saveResult,
      status
    });
  } catch (error) {
    console.error('Error updating API keys:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API endpoint for models listing
app.get('/api/v1/models', async (req, res) => {
  try {
    const models = await oneAPI.listModels();
    res.json(models);
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat completion endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, maxTokens = 1000, ...rest } = req.body;
    
    // Use OneAPI to handle chat completion with any provider
    const response = await oneAPI.createChatCompletion({
      model,
      messages,
      temperature,
      maxTokens,
      ...rest
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error in chat completion:', error);
    
    // Preserve all OpenRouterError properties if available
    const statusCode = error.statusCode || 500;
    const errorResponse = {
      error: {
        message: error.message,
        type: error.type || 'server_error',
        code: error.code || 'internal_error',
        param: error.param,
        requestId: error.requestId,
        provider: error.provider,
        model: error.model,
        timestamp: new Date().toISOString()
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
});

// Stream chat completion endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, maxTokens = 1000, ...rest } = req.body;
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Use OneAPI to handle streaming chat completion
    const streamGenerator = await oneAPI.createChatCompletionStream({
      model,
      messages,
      temperature,
      maxTokens,
      ...rest
    });
    
    // Convert async generator to stream if needed
    if (streamGenerator[Symbol.asyncIterator]) {
      // Handle async generator pattern
      (async () => {
        try {
          for await (const chunk of streamGenerator) {
            const data = JSON.stringify(chunk);
            res.write(`data: ${data}\n\n`);
          }
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (streamError) {
          const errorObj = {
            error: {
              message: streamError.message,
              type: streamError.type || 'server_error',
              code: streamError.code || 'stream_error',
              provider: streamError.provider,
              model: streamError.model,
              timestamp: new Date().toISOString()
            }
          };
          res.write(`data: ${JSON.stringify(errorObj)}\n\n`);
          res.end();
        }
      })();
    } else {
      // Handle traditional Node.js stream
      streamGenerator.pipe(res);
    }
    
    // Handle client disconnect
    req.on('close', () => {
      stream.destroy();
    });
  } catch (error) {
    console.error('Error in streaming chat completion:', error);
    
    // Send structured error as SSE
    const errorObj = {
      error: {
        message: error.message,
        type: error.type || 'server_error',
        code: error.code || 'stream_initialization_error',
        param: error.param,
        requestId: error.requestId,
        provider: error.provider,
        model: error.model,
        timestamp: new Date().toISOString()
      }
    };
    
    res.write(`data: ${JSON.stringify(errorObj)}\n\n`);
    res.end();
  }
});

// Compare models endpoint
app.post('/api/compare', async (req, res) => {
  try {
    const { prompt, models, temperature = 0.7, maxTokens = 1000 } = req.body;
    
    // Use OneAPI for model comparison
    const results = await oneAPI.compareModels({
      prompt,
      models,
      temperature,
      maxTokens
    });
    
    res.json({ results });
  } catch (error) {
    console.error('Error in model comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agent endpoints
// Research Agent endpoint
app.post('/api/agents/research', async (req, res) => {
  try {
    const { topic, depth = 3, format = 'summary' } = req.body;
    const results = await oneAPI.agents.research.execute({ topic, depth, format });
    res.json(results);
  } catch (error) {
    console.error('Research Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analysis Agent endpoint
app.post('/api/agents/analysis', async (req, res) => {
  try {
    const { data, metrics, visualize = false } = req.body;
    const results = await oneAPI.agents.analysis.execute({ data, metrics, visualize });
    res.json(results);
  } catch (error) {
    console.error('Analysis Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat Agent endpoint
app.post('/api/agents/chat', async (req, res) => {
  try {
    const { message, context = '', personality = 'helpful' } = req.body;
    const results = await oneAPI.agents.chat.execute({ message, context, personality });
    res.json(results);
  } catch (error) {
    console.error('Chat Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Automation Agent endpoint
app.post('/api/agents/automation', async (req, res) => {
  try {
    const { tasks, dependencies = {}, parallel = false } = req.body;
    const results = await oneAPI.agents.automation.execute({ tasks, dependencies, parallel });
    res.json(results);
  } catch (error) {
    console.error('Automation Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Learning Agent endpoint
app.post('/api/agents/learning', async (req, res) => {
  try {
    const { input, feedback = [], persist = true } = req.body;
    const results = await oneAPI.agents.learning.execute({ input, feedback, persist });
    res.json(results);
  } catch (error) {
    console.error('Learning Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tool endpoints
// Vector Store tool endpoint
app.post('/api/tools/vectorstore', async (req, res) => {
  try {
    const { operation, data } = req.body;
    const results = await oneAPI.tools.vectorStore.execute({ operation, data });
    res.json(results);
  } catch (error) {
    console.error('Vector Store tool error:', error);
    res.status(500).json({ error: error.message });
  }
});

// LLM Router tool endpoint
app.post('/api/tools/llmrouter', async (req, res) => {
  try {
    const { content, requirements } = req.body;
    const results = await oneAPI.tools.llmRouter.execute({ content, requirements });
    res.json(results);
  } catch (error) {
    console.error('LLM Router tool error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Embeddings endpoint
app.post('/api/embeddings', async (req, res) => {
  try {
    const { text, model = 'openai/text-embedding-ada-002' } = req.body;
    const embedding = await oneAPI.createEmbedding({ text, model });
    res.json(embedding);
  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Image generation endpoint
app.post('/api/images/generate', async (req, res) => {
  try {
    const { prompt, model = 'openai/dall-e-3', size = '1024x1024', n = 1 } = req.body;
    const images = await oneAPI.generateImage({ prompt, model, size, n });
    res.json(images);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: {
      message: err.message || 'An unknown error occurred',
      status: err.status || 500
    }
  });
});

// Catch-all handler for non-existent routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.url}`,
      status: 404
    }
  });
});

// SDK Functions API endpoint
app.get('/api/sdk/functions', (req, res) => {
  // Return available SDK functions
  res.json({
    functions: [
      {
        name: 'researchAgent',
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      },
      {
        name: 'analysisAgent',
        description: 'AI Agent that analyzes data and provides insights',
        parameters: [
          { name: 'data', type: 'string', description: 'JSON data to analyze', required: true },
          { name: 'metrics', type: 'string', description: 'Metrics to calculate (comma-separated)', required: true },
          { name: 'visualize', type: 'boolean', description: 'Generate visualizations', required: false }
        ]
      },
      {
        name: 'chatAgent',
        description: 'AI Agent that maintains context and engages in conversation',
        parameters: [
          { name: 'message', type: 'string', description: 'User message', required: true },
          { name: 'context', type: 'string', description: 'Previous conversation context', required: false },
          { name: 'personality', type: 'string', description: 'Agent personality type', required: false }
        ]
      },
      {
        name: 'automationAgent',
        description: 'AI Agent that automates sequences of tasks',
        parameters: [
          { name: 'tasks', type: 'string', description: 'JSON array of tasks to perform', required: true },
          { name: 'dependencies', type: 'string', description: 'JSON object of task dependencies', required: false },
          { name: 'parallel', type: 'boolean', description: 'Execute tasks in parallel if possible', required: false }
        ]
      },
      {
        name: 'learningAgent',
        description: 'AI Agent that learns from interactions and improves over time',
        parameters: [
          { name: 'input', type: 'string', description: 'Input data or query', required: true },
          { name: 'feedback', type: 'string', description: 'Previous interaction feedback', required: false },
          { name: 'modelPath', type: 'string', description: 'Path to trained model', required: false }
        ]
      },
      {
        name: 'vectorStore',
        description: 'Interface for vector database storage and retrieval',
        parameters: [
          { name: 'operation', type: 'string', description: 'Operation to perform (store/query/delete)', required: true },
          { name: 'data', type: 'string', description: 'Data to store or query parameters', required: true },
          { name: 'namespace', type: 'string', description: 'Collection namespace to use', required: false }
        ]
      },
      {
        name: 'llmRouter',
        description: 'Routes requests to appropriate language models',
        parameters: [
          { name: 'prompt', type: 'string', description: 'The prompt to send to the LLM', required: true },
          { name: 'model', type: 'string', description: 'Model to use (defaults to auto-routing)', required: false },
          { name: 'options', type: 'string', description: 'JSON string of additional options', required: false }
        ]
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`OpenRouter SDK Production Server running at http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('--------------------------------');
  console.log('Available endpoints:');
  console.log('- GET  /: Main chat interface');
  console.log('- GET  /dashboard: SDK Functions & Agents Dashboard');
  console.log('- GET  /api/status: Check API keys and provider status');
  console.log('- GET  /api/v1/models: List available models');
  console.log('- GET  /api/sdk/functions: Get available SDK functions');
  console.log('- POST /api/chat: Send a chat completion request');
  console.log('- POST /api/chat/stream: Send a streaming chat completion request');
});
