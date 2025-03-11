/**
 * OpenRouter SDK Production Server
 * Implements real provider integrations using OpenRouter SDK
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/google-gemini.js';
import { MistralProvider } from './providers/mistral.js';
import { TogetherProvider } from './providers/together.js';

// Get the current directory path (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000; // Changed to port 3000 to match default expectations

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

// Middleware
app.use(express.json());

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
  const status = {
    openai: openai.isConfigured(),
    anthropic: anthropic.isConfigured(),
    google: gemini.isConfigured(),
    mistral: mistral.isConfigured(),
    together: together.isConfigured()
  };
  
  // Log the status for debugging
  console.log('API Status:', status);
  
  res.json(status);
});

// API endpoint for models listing
app.get('/api/v1/models', (req, res) => {
  // Create a mock response with available models
  const models = {
    data: [
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        context_length: 4096,
        pricing: { prompt: 0.5, completion: 1.5 }
      },
      {
        id: 'openai/gpt-4',
        name: 'GPT-4',
        context_length: 8192,
        pricing: { prompt: 15, completion: 30 }
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        context_length: 100000,
        pricing: { prompt: 15, completion: 75 }
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        context_length: 200000,
        pricing: { prompt: 3, completion: 15 }
      },
      {
        id: 'google/gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        context_length: 1000000,
        pricing: { prompt: 3.5, completion: 10.5 }
      },
      {
        id: 'mistral/mistral-large',
        name: 'Mistral Large',
        context_length: 32768,
        pricing: { prompt: 2.7, completion: 8.1 }
      },
      {
        id: 'mistral/mistral-medium',
        name: 'Mistral Medium',
        context_length: 32768,
        pricing: { prompt: 0.27, completion: 0.81 }
      },
      {
        id: 'together/llama-3-70b-instruct',
        name: 'Llama 3 70B Instruct',
        context_length: 32768,
        pricing: { prompt: 0.9, completion: 2.7 }
      }
    ]
  };
  
  res.json(models);
});

// Chat completion endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, maxTokens = 1000 } = req.body;
    
    // Route to appropriate provider based on model prefix
    let response;
    if (model.startsWith('openai/')) {
      response = await openai.createChatCompletion({
        model: model.replace('openai/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('anthropic/')) {
      response = await anthropic.createChatCompletion({
        model: model.replace('anthropic/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('google/')) {
      response = await gemini.createChatCompletion({
        model: model.replace('google/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('mistral/')) {
      response = await mistral.createChatCompletion({
        model: model.replace('mistral/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('together/')) {
      response = await together.createChatCompletion({
        model: model.replace('together/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else {
      throw new Error(`Unsupported model provider: ${model}`);
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in chat completion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream chat completion endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, maxTokens = 1000 } = req.body;
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Route to appropriate provider based on model prefix
    let stream;
    if (model.startsWith('openai/')) {
      stream = await openai.createChatCompletionStream({
        model: model.replace('openai/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('anthropic/')) {
      stream = await anthropic.createChatCompletionStream({
        model: model.replace('anthropic/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('google/')) {
      stream = await gemini.createChatCompletionStream({
        model: model.replace('google/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('mistral/')) {
      stream = await mistral.createChatCompletionStream({
        model: model.replace('mistral/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else if (model.startsWith('together/')) {
      stream = await together.createChatCompletionStream({
        model: model.replace('together/', ''),
        messages,
        temperature,
        max_tokens: maxTokens
      });
    } else {
      throw new Error(`Unsupported model provider: ${model}`);
    }
    
    // Pipe the stream to response
    stream.pipe(res);
    
    // Handle client disconnect
    req.on('close', () => {
      stream.destroy();
    });
  } catch (error) {
    console.error('Error in stream creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare models endpoint
app.post('/api/compare', async (req, res) => {
  try {
    const { prompt, models } = req.body;
    const results = [];
    
    // Process each model in parallel
    await Promise.all(models.map(async (model) => {
      try {
        const response = await fetch(`http://localhost:${PORT}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            maxTokens: 1000
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        results.push({
          model,
          content: data.choices[0].message.content,
          error: null
        });
      } catch (error) {
        results.push({
          model,
          content: null,
          error: error.message
        });
      }
    }));
    
    res.json({ results });
  } catch (error) {
    console.error('Error in model comparison:', error);
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
