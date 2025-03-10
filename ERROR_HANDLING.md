# Enhanced Error Handling in OpenRouter SDK

This document outlines the robust error handling system implemented in the OpenRouter SDK, designed to provide clear, actionable feedback for developers and end-users.

## Error Architecture

The SDK implements a comprehensive error handling architecture with the following components:

### 1. Error Classification

Errors are categorized by type to enable targeted handling and messaging:

| Error Type | Description | HTTP Status |
|------------|-------------|-------------|
| `AUTHENTICATION_ERROR` | Issues with API key validation | 401, 403 |
| `RATE_LIMIT_EXCEEDED` | Request limits have been reached | 429 |
| `INVALID_REQUEST_ERROR` | Malformed request parameters | 400 |
| `INVALID_API_KEY` | Specifically for API key format issues | 400 |
| `INVALID_MODEL` | Requested model is unavailable or invalid | 400 |
| `INVALID_PARAMETER` | Specific parameter validation failures | 400 |
| `SERVER_ERROR` | Internal server or upstream API errors | 500 |

### 2. Error Response Structure

All error responses follow a consistent JSON format:

```json
{
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human-readable error description",
    "status": 400,
    "request_id": "unique-request-id-for-tracking",
    "resolution_steps": [
      "Step 1 to resolve the issue",
      "Step 2 to resolve the issue",
      "Step 3 to resolve the issue"
    ]
  }
}
```

In non-production environments, additional debugging information is included:
```json
{
  "error": {
    // Basic error information as above
    "stack": "Stack trace information",
    "cause": "Original error cause if available",
    "debug": {
      "method": "HTTP method",
      "path": "/api/endpoint",
      "query": { "param": "value" }
    }
  }
}
```

## User-Friendly Resolution Steps

A key feature of our error handling system is providing actionable resolution steps based on the error type and context. For example:

### API Key Errors
```json
{
  "error": {
    "type": "INVALID_API_KEY",
    "message": "Invalid API key format",
    "resolution_steps": [
      "Check if your API key is valid and properly formatted",
      "Verify that your API key is correctly set in the OPENROUTER_API_KEY environment variable",
      "Generate a new API key from the OpenRouter dashboard if necessary"
    ]
  }
}
```

### Rate Limiting
```json
{
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "resolution_steps": [
      "Wait before making additional requests",
      "Implement request batching or throttling in your application",
      "Consider upgrading your OpenRouter plan for higher rate limits"
    ]
  }
}
```

## Implementation Details

### Client-Side Error Handling

The SDK provides methods to gracefully handle errors in client applications:

```javascript
try {
  const response = await openRouter.createChatCompletion({
    model: "openai/gpt-3.5-turbo",
    messages: [{ role: "user", content: "Hello!" }]
  });
  
  // Process successful response
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error(`${error.type}: ${error.message}`);
    
    // Handle specific error types
    switch (error.type) {
      case ErrorType.RATE_LIMIT_EXCEEDED:
        // Wait and retry logic
        break;
      case ErrorType.AUTHENTICATION_ERROR:
        // Prompt for new API key
        break;
      default:
        // Generic error handling
    }
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### Server-Side Error Handling

For server implementations, the SDK provides middleware for Express applications:

```javascript
import express from 'express';
import { errorHandler } from 'openrouter-sdk';

const app = express();

// Your routes and middleware
app.get('/api/chat', chatHandler);

// Global error handler - add last
app.use(errorHandler);
```

## Logging and Debugging

The SDK implements a structured logging system that provides detailed context for debugging:

1. Each request is assigned a unique ID for tracking
2. Request and response data are logged (with sensitive information redacted)
3. Timing information is captured for performance analysis
4. Log levels are adjusted based on error severity

Example log output:
```
[INFO] [d8e2fca9-1234-5678-9abc-def012345678] POST /api/chat/completions
[DEBUG] [d8e2fca9-1234-5678-9abc-def012345678] Request details: { headers: {...}, body: {...} }
[WARN] [d8e2fca9-1234-5678-9abc-def012345678] Error: Invalid model specified
[INFO] [d8e2fca9-1234-5678-9abc-def012345678] Completed 400 in 123ms | Size: 517 bytes
```

## Best Practices

1. **Always check the `type` field** in error responses to provide targeted handling
2. **Use the `request_id` in support requests** to help with troubleshooting
3. **Present resolution steps to end-users** to improve user experience
4. **Implement exponential backoff** when handling rate limit errors
5. **Log all API interactions** to aid in debugging issues

## Runtime Environment Considerations

Error responses are tailored based on the runtime environment:

- **Development/Testing**: Includes full stack traces and detailed debug information
- **Production**: Includes only essential information to avoid exposing sensitive details

The environment is determined by the `NODE_ENV` environment variable.
