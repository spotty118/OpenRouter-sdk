/**
 * API Proxy Server for OpenRouter SDK
 * Handles browser-based requests to external APIs with CORS restrictions
 */

// Import required modules
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from current directory
app.use(express.static(__dirname));

// Anthropic API Proxy
app.use('/api/proxy/anthropic', (req, res, next) => {
  // Extract API key from header
  const apiKey = req.headers['x-api-key'];
  
  // Log request (sanitize key for safety)
  console.log(`Proxying request to Anthropic API: ${req.method} ${req.url}`);
  console.log(`API Key present: ${!!apiKey}`);
  
  // Create proxy with dynamic target
  const anthropicProxy = createProxyMiddleware({
    target: 'https://api.anthropic.com/v1',
    changeOrigin: true,
    pathRewrite: {
      '^/api/proxy/anthropic': '' // Remove the /api/proxy/anthropic prefix
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward the API key and other headers
      if (apiKey) {
        proxyReq.setHeader('x-api-key', apiKey);
      }
      
      // Set other required Anthropic headers
      proxyReq.setHeader('anthropic-version', req.headers['anthropic-version'] || '2023-06-01');
      
      // Log the proxied request
      console.log(`Proxied request to: ${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  });
  
  // Apply the proxy middleware
  anthropicProxy(req, res, next);
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`OpenRouter SDK Proxy Server running on port ${PORT}`);
  console.log(`Dashboard available at: http://localhost:${PORT}`);
});
