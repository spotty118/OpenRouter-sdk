/**
 * Dashboard Server for OpenRouter SDK
 * Provides API endpoints for the dashboard to interact with Claude and Google Search
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Claude } = require('../providers/claude');
const { GoogleSearch } = require('../services/google-search');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../..'));

// Initialize providers based on request parameters
function initializeProviders(req) {
  const {
    claudeApiKey, 
    googleApiKey, 
    googleSearchEngineId,
    claudeModel = 'anthropic/claude-3-sonnet-20240229',
    temperature = 0.7,
    maxTokens = 1024,
    enableSearch = true,
    maxSearchResults = 5
  } = req.body;
  
  // Create Google Search service instance
  const googleSearch = new GoogleSearch({
    apiKey: googleApiKey,
    searchEngineId: googleSearchEngineId,
    maxResults: maxSearchResults
  });
  
  // Create Claude provider instance
  const claude = new Claude({
    apiKey: claudeApiKey,
    model: claudeModel,
    temperature,
    maxTokens,
    googleSearch: enableSearch ? googleSearch : null
  });
  
  return { claude, googleSearch };
}

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, messages = [], stream = false } = req.body;
    const { claude } = initializeProviders(req);
    
    if (stream) {
      // Set up server-sent events for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream response
      const streamCallback = (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      };
      
      await claude.streamChatCompletion(messages, { onData: streamCallback });
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const response = await claude.chatCompletion(messages);
      res.json({ response });
    }
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/search', async (req, res) => {
  try {
    const { query, format = 'simple' } = req.body;
    const { googleSearch } = initializeProviders(req);
    
    let results;
    
    switch (format) {
      case 'detailed':
        results = await googleSearch.searchDetailed(query);
        break;
      case 'markdown':
        results = await googleSearch.searchMarkdown(query);
        break;
      case 'claude':
        results = await googleSearch.searchForClaude(query);
        break;
      case 'simple':
      default:
        results = await googleSearch.search(query);
        break;
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Dashboard server running on port ${PORT}`);
  console.log(`Access the dashboard at http://localhost:${PORT}/dashboard.html`);
});
