/**
 * Enhanced OpenRouter SDK Server with comprehensive error handling, API endpoints,
 * rate limiting, and monitoring dashboard
 * 
 * This server setup demonstrates best practices for using the OpenRouter SDK in a Node.js
 * environment, including proper API key management, error handling, rate limiting,
 * metrics collection, and standardized API responses.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { OpenRouter, Logger, OpenRouterError } from './dist/index.js';
import metrics from './src/monitoring/metrics.js';
import { rateLimiter } from './src/middleware/rate-limiter.js';

// Load environment variables from .env file if present
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const logger = new Logger('info');

// Middleware setup
app.use(express.json());
app.use(cors());
app.use(express.static('.'));

// Apply rate limiting to API routes
app.use('/api', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  message: 'Too many requests, please try again later'
}));

/**
 * Validate API key format and structure
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if API key format is valid
 */
function validateApiKeyFormat(apiKey) {
  if (!apiKey) return false;
  
  // Validate minimum length
  if (apiKey.length < 32) return false;
  
  // Basic format check (can be enhanced based on actual key format)
  const validKeyPattern = /^[a-zA-Z0-9_-]+$/;
  return validKeyPattern.test(apiKey);
}

/**
 * Get API key from environment variables with enhanced validation
 * @returns {string} The validated API key or throws a specific error
 */
function getApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new OpenRouterError(
      'OPENROUTER_API_KEY environment variable is not set',
      400,
      { hint: 'Set your API key by running: export OPENROUTER_API_KEY=your_key_here' }
    );
  }
  
  if (!validateApiKeyFormat(apiKey)) {
    throw new OpenRouterError(
      'Invalid API key format',
      400,
      { hint: 'Please check that your API key is correctly formatted' }
    );
  }
  
  return apiKey;
}

/**
 * Create OpenRouter instance with the given API key
 * @param {string} apiKey - The API key to use
 * @returns {OpenRouter} Initialized OpenRouter instance
 */
function createOpenRouter(apiKey) {
  return new OpenRouter({
    apiKey,
    defaultModel: 'openai/gpt-3.5-turbo',
    logLevel: 'info',
    maxRetries: 3,
    timeout: 60000, // 60 seconds timeout
  });
}

/**
 * Request and response logging middleware with detailed debugging information and metrics tracking
 */
app.use((req, res, next) => {
  // Generate a unique request ID for tracking
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // Track request timing
  const startTime = Date.now();
  
  // Log basic request information
  logger.info(`[${requestId}] ${req.method} ${req.path}`);
  
  // Log detailed request information for non-GET requests and if not homepage
  if (req.method !== 'GET' && req.path !== '/') {
    const sanitizedHeaders = { ...req.headers };
    
    // Remove sensitive information from headers for logging
    if (sanitizedHeaders.authorization) {
      sanitizedHeaders.authorization = 'Bearer [REDACTED]';
    }
    
    // Log headers and body (excluding sensitive fields)
    let sanitizedBody = null;
    if (req.body) {
      sanitizedBody = { ...req.body };
      
      // Redact any API keys or tokens in the body
      if (sanitizedBody.api_key) sanitizedBody.api_key = '[REDACTED]';
      if (sanitizedBody.apiKey) sanitizedBody.apiKey = '[REDACTED]';
      if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
      
      // Truncate message content if too long
      if (sanitizedBody.messages && Array.isArray(sanitizedBody.messages)) {
        sanitizedBody.messages = sanitizedBody.messages.map(msg => {
          if (msg.content && typeof msg.content === 'string' && msg.content.length > 100) {
            return { ...msg, content: `${msg.content.substring(0, 100)}... [truncated, length: ${msg.content.length}]` };
          }
          return msg;
        });
      }
    }
    
    logger.debug(`[${requestId}] Request details:`, {
      headers: sanitizedHeaders,
      body: sanitizedBody,
      query: req.query
    });
  }
  
  // Store original methods to restore later
  const originalEnd = res.end;
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Track token usage from request
  let tokenUsage = null;
  let modelUsed = null;
  
  // Try to extract model from request (for chat completions)
  if (req.body && req.body.model) {
    modelUsed = req.body.model;
  }
  
  // Override response methods for logging
  res.json = function(body) {
    // Log response body (sanitized) for debugging
    const sanitizedBody = typeof body === 'object' ? { ...body } : body;
    
    // Truncate or remove potentially large responses
    if (sanitizedBody && typeof sanitizedBody === 'object') {
      // Handle large arrays or token arrays in completions
      if (sanitizedBody.choices && Array.isArray(sanitizedBody.choices)) {
        if (sanitizedBody.choices.length > 2) {
          sanitizedBody.choices = [
            sanitizedBody.choices[0],
            `... ${sanitizedBody.choices.length - 2} more items ...`,
            sanitizedBody.choices[sanitizedBody.choices.length - 1]
          ];
        }
      }
      
      // Track token usage from response
      if (sanitizedBody.usage) {
        tokenUsage = sanitizedBody.usage;
        logger.info(`[${requestId}] Usage: ${JSON.stringify(sanitizedBody.usage)}`);
      }
    }
    
    // Only log non-stream responses
    if (res.statusCode !== 200 || !req.path.includes('/stream')) {
      logger.debug(`[${requestId}] Response payload:`, sanitizedBody);
    }
    
    return originalJson.call(this, body);
  };
  
  // Override send method to log responses
  res.send = function(body) {
    if (typeof body === 'string' && body.length > 200) {
      logger.debug(`[${requestId}] Response: ${body.substring(0, 200)}... [truncated, length: ${body.length}]`);
    } else if (typeof body !== 'string' && typeof body !== 'undefined') {
      logger.debug(`[${requestId}] Response: ${typeof body} data`);
    }
    return originalSend.call(this, body);
  };
  
  // Override end function to log response timing and status
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const size = res.getHeader('content-length') || 'unknown';
    const statusColor = res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info');
    
    // Log with appropriate level based on status code
    logger[statusColor](`[${requestId}] Completed ${res.statusCode} in ${duration}ms | Size: ${size} bytes`);
    
    // Record metrics for this request
    metrics.recordRequest({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      authenticated: !!req.apiKey,
      model: modelUsed,
      tokenUsage
    });
    
    // Record error metrics if applicable
    if (res.statusCode >= 400) {
      logger.warn(`[${requestId}] Error response details: Status ${res.statusCode}`);
      
      // Get error type from response if available
      let errorType = 'UNKNOWN_ERROR';
      let errorMessage = 'Unknown error occurred';
      
      if (res.locals.error) {
        errorType = res.locals.error.type || errorType;
        errorMessage = res.locals.error.message || errorMessage;
      }
      
      metrics.recordError({
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        errorType,
        message: errorMessage,
        ip: req.ip
      });
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
});

/**
 * API key validation middleware
 */
app.use((req, res, next) => {
  try {
    // Skip API key validation for the home page, status endpoints, and admin routes
    if (req.path === '/' || 
        req.path === '/api/status' || 
        req.path.startsWith('/admin/') || 
        req.path.startsWith('/api/monitoring/')) {
      return next();
    }
    
    // Try to get and validate API key
    const apiKey = getApiKey();
    
    // Store API key and create OpenRouter instance for route handlers
    req.apiKey = apiKey;
    req.openRouter = createOpenRouter(apiKey);
    
    next();
  } catch (error) {
    // Handle API key validation errors
    logger.error(`API Key Error: ${error.message}`);
    
    if (typeof OpenRouterError !== 'undefined' && error instanceof OpenRouterError && typeof error.toResponse === 'function') {
      return res.status(error.status || 400).json(error.toResponse());
    }
    
    return res.status(400).json({
      error: {
        type: 'api_key_error',
        message: error.message || 'Invalid API key',
        status: 400
      }
    });
  }
});

/**
 * Enhanced error handling middleware with detailed error categorization and user guidance
 */
app.use((err, req, res, next) => {
  // Determine appropriate log level based on error severity
  const statusCode = err.status || err.statusCode || 500;
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  
  // Log error with appropriate level and context
  logger[logLevel](`Error [${req.requestId}]: ${err.message}`);
  
  // For severe errors, log the full stack trace
  if (statusCode >= 500) {
    logger.error(`Stack trace for [${req.requestId}]:`, err.stack);
  }
  
  // Determine error type with fallbacks
  let errorType = 'SERVER_ERROR';
  let errorMessage = err.message || 'An unexpected error occurred';
  
  // SAFELY check for OpenRouterError to prevent errors when err is not an instance
  if (typeof OpenRouterError !== 'undefined' && err instanceof OpenRouterError && typeof err.toResponse === 'function') {
    return res.status(statusCode).json(err.toResponse());
  }
  
  // Categorize common error types based on status code and message patterns
  if (statusCode === 401 || statusCode === 403) {
    errorType = 'AUTHENTICATION_ERROR';
  } else if (statusCode === 429) {
    errorType = 'RATE_LIMIT_EXCEEDED';
  } else if (statusCode === 400) {
    errorType = 'INVALID_REQUEST_ERROR';
    
    // Further categorize bad requests
    if (err.message && err.message.toLowerCase().includes('api key')) {
      errorType = 'INVALID_API_KEY';
    } else if (err.message && err.message.toLowerCase().includes('model')) {
      errorType = 'INVALID_MODEL';
    } else if (err.message && err.message.toLowerCase().includes('parameter')) {
      errorType = 'INVALID_PARAMETER';
    }
  }
  
  // Build a comprehensive error response
  const errorResponse = {
    error: {
      type: errorType,
      message: errorMessage,
      status: statusCode,
      request_id: req.requestId
    }
  };
  
  // Add resolution steps based on error type
  errorResponse.error.resolution_steps = getErrorResolutionSteps(errorType, err.message);
  
  // Add additional context for debugging in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
    
    // Add request details for easier debugging (with sensitive data removed)
    errorResponse.error.debug = {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query || {}).length > 0 ? req.query : undefined
    };
    
    // Include original error cause if available
    if (err.cause) {
      errorResponse.error.cause = typeof err.cause === 'object' ? 
        JSON.stringify(err.cause) : String(err.cause);
    }
  }
  
  // Send the error response
  res.status(statusCode).json(errorResponse);
});

/**
 * Get user-friendly resolution steps based on error type
 * @param {string} errorType - The categorized error type
 * @param {string} errorMessage - The original error message
 * @returns {string[]} Array of resolution steps
 */
function getErrorResolutionSteps(errorType, errorMessage = '') {
  const lowerMessage = errorMessage ? errorMessage.toLowerCase() : '';
  
  switch (errorType) {
    case 'AUTHENTICATION_ERROR':
    case 'INVALID_API_KEY':
      return [
        'Check if your API key is valid and properly formatted',
        'Verify that your API key is correctly set in the OPENROUTER_API_KEY environment variable',
        'Generate a new API key from the OpenRouter dashboard if necessary'
      ];
      
    case 'RATE_LIMIT_EXCEEDED':
      return [
        'Wait before making additional requests',
        'Implement request batching or throttling in your application',
        'Consider upgrading your OpenRouter plan for higher rate limits'
      ];
      
    case 'INVALID_MODEL':
      return [
        'Verify that the model ID is spelled correctly',
        'Check the available models endpoint to see a list of supported models',
        'Some models may require specific permissions or have limited availability'
      ];
      
    case 'INVALID_PARAMETER':
      return [
        'Check your request parameters against the OpenRouter API documentation',
        'Ensure all required fields are included and properly formatted',
        'Verify that parameter values are within acceptable ranges'
      ];
      
    case 'INVALID_REQUEST_ERROR':
      if (lowerMessage.includes('message') || lowerMessage.includes('content')) {
        return [
          'Ensure your messages array is properly formatted',
          'Verify that each message has a valid role and content',
          'Check for any invalid characters or formatting in your messages'
        ];
      }
      return [
        'Review your request structure according to the API documentation',
        'Validate all input parameters before sending the request',
        'Check for any syntax errors or missing required fields'
      ];
      
    case 'SERVER_ERROR':
    default:
      return [
        'This is likely a temporary server issue',
        'Try your request again after a few minutes',
        'If the problem persists, contact support with your request ID'
      ];
  }
}

// Basic home route
app.get('/', (req, res) => {
  // Get API key status for display
  let apiKeyStatus = 'Not configured';
  let apiKeyClass = 'status-error';
  
  try {
    getApiKey();
    apiKeyStatus = 'Configured and validated';
    apiKeyClass = 'status-success';
  } catch (error) {
    apiKeyStatus = error.message || 'Invalid or missing';
  }
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OpenRouter SDK Server</title>
        <style>
          :root {
            --primary-color: #2196F3;
            --secondary-color: #0D47A1;
            --success-color: #4CAF50;
            --error-color: #F44336;
            --warning-color: #FF9800;
            --light-bg: #f8f9fa;
            --dark-text: #333;
            --light-text: #666;
            --border-radius: 6px;
          }
          
          body {
            font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: var(--dark-text);
            background-color: #fff;
          }
          
          header {
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          h1 {
            color: var(--primary-color);
            margin-top: 0;
            font-weight: 600;
          }
          
          h2 {
            color: var(--secondary-color);
            margin-top: 30px;
          }
          
          h3 {
            font-weight: 600;
            margin-bottom: 5px;
            color: var(--secondary-color);
          }
          
          code {
            background: var(--light-bg);
            padding: 2px 5px;
            border-radius: 3px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.9em;
          }
          
          pre {
            background: var(--light-bg);
            padding: 15px;
            border-radius: var(--border-radius);
            overflow-x: auto;
            border: 1px solid #ddd;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.9em;
          }
          
          .endpoint {
            margin-bottom: 30px;
            border-left: 4px solid var(--primary-color);
            padding-left: 15px;
            background-color: #fff;
            border-radius: var(--border-radius);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            padding: 20px;
          }
          
          .method {
            display: inline-block;
            padding: 3px 8px;
            background-color: var(--primary-color);
            color: white;
            border-radius: 3px;
            font-weight: bold;
            margin-right: 10px;
          }
          
          .endpoint-path {
            font-weight: 500;
            font-size: 1.1em;
            margin-bottom: 10px;
          }
          
          .description {
            color: var(--light-text);
            margin-bottom: 15px;
          }
          
          .status-panel {
            background-color: var(--light-bg);
            border-radius: var(--border-radius);
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .status-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          
          .status-label {
            font-weight: 500;
          }
          
          .status-success {
            color: var(--success-color);
          }
          
          .status-error {
            color: var(--error-color);
          }
          
          .status-warning {
            color: var(--warning-color);
          }
          
          footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.9em;
            color: var(--light-text);
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          
          @media (max-width: 768px) {
            body {
              padding: 15px;
            }
            
            .endpoint {
              padding: 15px;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <h1>OpenRouter SDK Server</h1>
          <p>A production-ready server implementation using the OpenRouter SDK with enhanced error handling and input validation.</p>
        </header>
        
        <div class="status-panel">
          <h2>Server Status</h2>
          <div class="status-info">
            <span class="status-label">Server:</span>
            <span class="status-success">Running</span>
          </div>
          <div class="status-info">
            <span class="status-label">API Key:</span>
            <span class="${apiKeyClass}">${apiKeyStatus}</span>
          </div>
          <div class="status-info">
            <span class="status-label">Port:</span>
            <span>${PORT}</span>
          </div>
          <div class="status-info">
            <span class="status-label">Environment:</span>
            <span>${process.env.NODE_ENV || 'development'}</span>
          </div>
        </div>
        
        <h2>API Endpoints</h2>
        
        <div class="endpoint">
          <div class="endpoint-path">
            <span class="method">GET</span> /api/status
          </div>
          <div class="description">Check server status and configuration</div>
          <h3>Response:</h3>
          <pre>{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-03-09T00:00:00.000Z"
}</pre>
        </div>
        
        <div class="endpoint">
          <div class="endpoint-path">
            <span class="method">GET</span> /api/models
          </div>
          <div class="description">List all available AI models with pricing information</div>
          <div class="note"><strong>Note:</strong> Requires valid API key</div>
        </div>
        
        <div class="endpoint">
          <div class="endpoint-path">
            <span class="method">POST</span> /api/chat/completions
          </div>
          <div class="description">Create a chat completion using the specified model</div>
          <h3>Request Body:</h3>
          <pre>{
  "model": "openai/gpt-3.5-turbo",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello, world!" }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}</pre>
          <div class="note"><strong>Note:</strong> Requires valid API key</div>
        </div>
        
        <footer>
          <p>OpenRouter SDK Server &copy; ${new Date().getFullYear()} | <a href="https://github.com/openrouter-api/openrouter-sdk">GitHub Repository</a></p>
        </footer>
      </body>
    </html>
  `);
});

// Server status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// List models endpoint
app.get('/api/models', async (req, res, next) => {
  try {
    const models = await req.openRouter.listModels();
    res.json(models);
  } catch (error) {
    next(error);
  }
});

// Chat completions endpoint
app.post('/api/chat/completions', async (req, res, next) => {
  try {
    const options = req.body;
    
    if (!options.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
      throw new OpenRouterError('Messages array is required and must not be empty', 400);
    }
    
    // Log request (excluding sensitive data)
    logger.info(`Chat completion request [${req.requestId}]: model=${options.model || 'default'}, messages=${options.messages.length}`);
    
    // Handle streaming requests
    if (options.stream === true) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream responses
      try {
        for await (const chunk of req.openRouter.streamChatCompletions(options)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        
        // End the stream
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamError) {
        logger.error(`Stream error [${req.requestId}]: ${streamError.message}`, streamError);
        
        // Send error as SSE event and end the stream
        if (streamError instanceof OpenRouterError) {
          res.write(`data: ${JSON.stringify(streamError.toResponse())}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ error: { message: streamError.message || 'Stream error' } })}\n\n`);
        }
        res.end();
      }
    } else {
      // Non-streaming request
      const response = await req.openRouter.createChatCompletion(options);
      res.json(response);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Monitoring Dashboard Routes
 */

// Simple admin authorization middleware
function adminAuth(req, res, next) {
  // For a production app, you would implement proper authentication here
  // This is a simplified version for demonstration purposes
  const adminToken = process.env.ADMIN_TOKEN || 'admin-secret';
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;
  
  // Check if token is in Authorization header
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === adminToken) {
    return next();
  }
  
  // Check if token is in query parameters
  if (queryToken && queryToken === adminToken) {
    return next();
  }
  
  return res.status(401).json({
    error: {
      type: 'AUTHENTICATION_ERROR',
      message: 'Unauthorized - Admin access required',
      status: 401
    }
  });
}

// Dashboard home - HTML dashboard view
app.get('/admin/dashboard', adminAuth, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenRouter SDK Monitoring Dashboard</title>
        <style>
          :root {
            --primary: #2563eb;
            --primary-dark: #1e40af;
            --secondary: #10b981;
            --dark: #1f2937;
            --light: #f9fafb;
            --danger: #ef4444;
            --warning: #f59e0b;
            --success: #10b981;
            --info: #3b82f6;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: var(--dark);
            background-color: #f3f4f6;
          }
          
          header {
            background-color: var(--primary);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          h1, h2, h3 {
            margin-bottom: 0.5rem;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
          }
          
          .card {
            background-color: white;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }
          
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.5rem;
          }
          
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
          }
          
          .stat-card {
            display: flex;
            flex-direction: column;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            background-color: white;
          }
          
          .stat-card h3 {
            color: #6b7280;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
          }
          
          .stat-card .change {
            display: flex;
            align-items: center;
            font-size: 0.875rem;
          }
          
          .positive {
            color: var(--success);
          }
          
          .negative {
            color: var(--danger);
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .table th, .table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .table th {
            background-color: #f9fafb;
            font-weight: 600;
          }
          
          .refresh-btn {
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 0.375rem;
            padding: 0.5rem 1rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
          }
          
          .refresh-btn:hover {
            background-color: var(--primary-dark);
          }
          
          .status {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
          }
          
          .status-success {
            background-color: rgba(16, 185, 129, 0.1);
            color: var(--success);
          }
          
          .status-error {
            background-color: rgba(239, 68, 68, 0.1);
            color: var(--danger);
          }
          
          .status-warning {
            background-color: rgba(245, 158, 11, 0.1);
            color: var(--warning);
          }
          
          #api-metrics, #error-metrics, #performance-metrics {
            margin-top: 2rem;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>OpenRouter SDK Monitoring</h1>
          <button class="refresh-btn" onclick="refreshData()">Refresh Data</button>
        </header>
        
        <div class="container">
          <div class="card">
            <div class="card-header">
              <h2>Overview</h2>
              <span id="last-updated"></span>
            </div>
            
            <div class="grid">
              <div class="stat-card">
                <h3>Total Requests (24h)</h3>
                <div class="value" id="total-requests">-</div>
                <div class="change" id="request-change"></div>
              </div>
              
              <div class="stat-card">
                <h3>Success Rate</h3>
                <div class="value" id="success-rate">-</div>
                <div class="change"></div>
              </div>
              
              <div class="stat-card">
                <h3>Avg Response Time</h3>
                <div class="value" id="avg-response-time">-</div>
                <div class="change"></div>
              </div>
              
              <div class="stat-card">
                <h3>Total Tokens (24h)</h3>
                <div class="value" id="total-tokens">-</div>
                <div class="change"></div>
              </div>
            </div>
          </div>
          
          <div class="card" id="api-metrics">
            <div class="card-header">
              <h2>Top Endpoints</h2>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Requests</th>
                  <th>Errors</th>
                  <th>Avg Time</th>
                </tr>
              </thead>
              <tbody id="endpoints-table">
                <tr>
                  <td colspan="4">Loading data...</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="card" id="error-metrics">
            <div class="card-header">
              <h2>Recent Errors</h2>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Error Type</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody id="errors-table">
                <tr>
                  <td colspan="5">Loading data...</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="card" id="performance-metrics">
            <div class="card-header">
              <h2>Model Usage</h2>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Requests</th>
                  <th>Tokens</th>
                </tr>
              </thead>
              <tbody id="models-table">
                <tr>
                  <td colspan="3">Loading data...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <script>
          // Helper for formatting numbers
          function formatNumber(num) {
            if (num >= 1000000) {
              return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
              return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
          }
          
          // Format dates nicely
          function formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString();
          }
          
          // Format time elapsed nicely
          function formatElapsed(timestamp) {
            const now = Date.now();
            const elapsed = now - timestamp;
            
            if (elapsed < 60000) {
              return 'Just now';
            }
            
            const minutes = Math.floor(elapsed / 60000);
            if (minutes < 60) {
              return minutes + 'm ago';
            }
            
            const hours = Math.floor(minutes / 60);
            if (hours < 24) {
              return hours + 'h ago';
            }
            
            const days = Math.floor(hours / 24);
            return days + 'd ago';
          }
          
          // Format status code with color
          function formatStatus(code) {
            let statusClass = 'status-success';
            
            if (code >= 500) {
              statusClass = 'status-error';
            } else if (code >= 400) {
              statusClass = 'status-warning';
            }
            
            return '<span class="status ' + statusClass + '">' + code + '</span>';
          }
          
          // Fetch and render dashboard data
          async function fetchDashboardData() {
            try {
              const response = await fetch('/api/monitoring/summary', {
                headers: {
                  'Authorization': 'Bearer ' + (localStorage.getItem('adminToken') || 'admin-secret')
                }
              });
              
              if (!response.ok) {
                throw new Error('Failed to fetch monitoring data');
              }
              
              const data = await response.json();
              renderDashboard(data);
              
              // Update last updated time
              document.getElementById('last-updated').textContent = 
                'Last updated: ' + new Date().toLocaleTimeString();
                
            } catch (error) {
              console.error('Error fetching dashboard data:', error);
              alert('Error loading dashboard data. Check your authorization or server status.');
            }
          }
          
          // Render the dashboard with data
          function renderDashboard(data) {
            // Update overview stats
            document.getElementById('total-requests').textContent = 
              formatNumber(data.requests.last24h);
              
            document.getElementById('success-rate').textContent = 
              data.requests.successRate24h.toFixed(1) + '%';
              
            document.getElementById('avg-response-time').textContent = 
              data.performance.avgResponseTime.toFixed(0) + 'ms';
              
            document.getElementById('total-tokens').textContent = 
              formatNumber(data.tokens.last24h);
              
            // Render endpoints table
            const endpointsTable = document.getElementById('endpoints-table');
            endpointsTable.innerHTML = '';
            
            if (data.performance.topEndpoints.length === 0) {
              endpointsTable.innerHTML = '<tr><td colspan="4">No endpoint data available</td></tr>';
            } else {
              data.performance.topEndpoints.forEach(endpoint => {
                const row = document.createElement('tr');
                row.innerHTML = 
                  '<td>' + endpoint.path + '</td>' +
                  '<td>' + formatNumber(endpoint.count) + '</td>' +
                  '<td>' + formatNumber(endpoint.errors) + '</td>' +
                  '<td>' + endpoint.avgTime.toFixed(0) + 'ms</td>';
                endpointsTable.appendChild(row);
              });
            }
            
            // Render errors table
            const errorsTable = document.getElementById('errors-table');
            errorsTable.innerHTML = '';
            
            if (data.errors.topErrors.length === 0) {
              errorsTable.innerHTML = '<tr><td colspan="5">No errors reported</td></tr>';
            } else {
              data.errors.topErrors.forEach(error => {
                const row = document.createElement('tr');
                row.innerHTML = 
                  '<td>' + formatElapsed(error.timestamp) + '</td>' +
                  '<td>' + error.path + '</td>' +
                  '<td>' + formatStatus(error.statusCode) + '</td>' +
                  '<td>' + error.errorType + '</td>' +
                  '<td>' + error.message + '</td>';
                errorsTable.appendChild(row);
              });
            }
            
            // Render models table
            const modelsTable = document.getElementById('models-table');
            modelsTable.innerHTML = '';
            
            if (data.models.topModels.length === 0) {
              modelsTable.innerHTML = '<tr><td colspan="3">No model usage data available</td></tr>';
            } else {
              data.models.topModels.forEach(model => {
                const row = document.createElement('tr');
                row.innerHTML = 
                  '<td>' + model.model + '</td>' +
                  '<td>' + formatNumber(model.count) + '</td>' +
                  '<td>' + formatNumber(model.totalTokens) + '</td>';
                modelsTable.appendChild(row);
              });
            }
          }
          
          // Refresh data function
          function refreshData() {
            fetchDashboardData();
          }
          
          // Initial data load
          document.addEventListener('DOMContentLoaded', fetchDashboardData);
        </script>
      </body>
    </html>
  `);
});

// API Routes for monitoring data

// Get monitoring summary
app.get('/api/monitoring/summary', adminAuth, (req, res, next) => {
  try {
    const summary = metrics.getSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Get detailed metrics
app.get('/api/monitoring/detailed', adminAuth, (req, res, next) => {
  try {
    const { startTime, endTime, interval } = req.query;
    
    const options = {};
    
    if (startTime) {
      options.startTime = parseInt(startTime);
    }
    
    if (endTime) {
      options.endTime = parseInt(endTime);
    }
    
    if (interval && ['minute', 'hour', 'day'].includes(interval)) {
      options.interval = interval;
    }
    
    const detailedMetrics = metrics.getDetailedMetrics(options);
    res.json(detailedMetrics);
  } catch (error) {
    next(error);
  }
});

// Get current server status
app.get('/api/status', (req, res) => {
  const status = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  // Check if API key is configured
  try {
    getApiKey();
    status.apiKeyConfigured = true;
  } catch (error) {
    status.apiKeyConfigured = false;
    status.apiKeyMessage = error.message;
  }
  
  res.json(status);
});

// Start the server
app.listen(PORT, () => {
  logger.info(`OpenRouter SDK Server running on port ${PORT}`);
  logger.info(`Access the server at http://localhost:${PORT}`);
  logger.info(`Monitoring dashboard available at http://localhost:${PORT}/admin/dashboard`);
  
  // API key status message
  try {
    getApiKey();
    logger.info('API key is configured');
  } catch (error) {
    logger.warn(`API Key Warning: ${error.message}`);
    logger.info('Note: API endpoints requiring authentication will not work until an API key is set');
    logger.info('Set your API key by running: export OPENROUTER_API_KEY=your_key_here');
  }
  
  // Admin token status
  if (!process.env.ADMIN_TOKEN) {
    logger.info('Using default admin token: admin-secret');
    logger.info('Set a custom admin token with: export ADMIN_TOKEN=your-secret-token');
  } else {
    logger.info('Admin token is configured');
  }
});
