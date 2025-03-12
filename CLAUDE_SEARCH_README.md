# Claude AI with Google Search Integration for OpenRouter SDK

This extension to the OpenRouter SDK enables Claude AI models to perform web searches via the Google Custom Search API, combining Claude's powerful language capabilities with real-time information from the web.

## Features

- 🔍 Seamless integration of Google Search with Claude AI models
- 🌐 Real-time web information incorporated into Claude's responses
- 📊 Configurable search parameters (number of results, language, safety settings)
- 📡 Support for both synchronous and streaming responses
- 🔄 Compatible with Claude 3 models (Opus, Sonnet, Haiku)
- 🧠 Context-aware search based on user queries

## Installation

This integration is included in the OpenRouter SDK. Make sure you have the following dependencies:

```bash
npm install @anthropic-ai/sdk dotenv
```

## Configuration

To use this integration, you'll need:

1. **Anthropic API Key**: Obtain from [Anthropic's platform](https://console.anthropic.com/)
2. **Google API Key**: Create in the [Google Cloud Console](https://console.cloud.google.com/) with access to Custom Search API
3. **Google Custom Search Engine ID**: Create a [Custom Search Engine](https://programmablesearchengine.google.com/about/)

Add these to your environment variables:

```
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

## Usage

### Basic Usage

```typescript
import { ClaudeProvider } from 'openrouter-sdk';

// Create Claude provider with Google Search
const claude = new ClaudeProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY,
  googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
  enableSearch: true,
  maxSearchResults: 5
});

// Use Claude with search capabilities
const response = await claude.createChatCompletion({
  model: 'anthropic/claude-3-opus-20240229',
  messages: [
    { 
      role: 'system', 
      content: 'You are a helpful assistant with access to Google Search. Use search results to provide up-to-date information.' 
    },
    { role: 'user', content: 'What are the latest developments in quantum computing?' }
  ],
  temperature: 0.7,
  tools: [
    {
      type: 'function',
      function: {
        name: 'search',
        description: 'Search the web for current information',
        parameters: {}
      }
    }
  ]
});

console.log(response.choices[0].message.content);
```

### Streaming Responses

```typescript
const stream = claude.streamChatCompletions({
  model: 'anthropic/claude-3-haiku-20240307',
  messages: [
    { role: 'system', content: 'You are a helpful assistant with search capabilities.' },
    { role: 'user', content: 'What are the top tech trends this year?' }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'search',
        description: 'Search the web for current information',
        parameters: {}
      }
    }
  ]
});

// Process stream
for await (const chunk of stream) {
  const content = chunk.choices?.[0]?.message?.content || '';
  process.stdout.write(content);
}
```

### Direct Search API Usage

You can also use the Google Search service directly:

```typescript
import { GoogleSearch } from 'openrouter-sdk';

const searchClient = new GoogleSearch({
  apiKey: process.env.GOOGLE_SEARCH_API_KEY,
  searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
  maxResults: 5
});

const results = await searchClient.search('climate change solutions');
console.log(results);
```

## Advanced Configuration

The Claude provider accepts several configuration options:

```typescript
const claude = new ClaudeProvider({
  apiKey: 'your-claude-api-key',
  baseUrl: 'https://api.anthropic.com', // Optional, default Anthropic API URL
  apiVersion: '2023-06-01', // Optional Anthropic API version
  googleSearchApiKey: 'your-google-search-api-key',
  googleSearchEngineId: 'your-search-engine-id',
  enableSearch: true, // Enable/disable search functionality
  maxSearchResults: 5, // Number of search results to return
  timeout: 60000, // Request timeout in ms
  maxRetries: 3, // Maximum number of retries
  headers: {} // Additional headers for API requests
});
```

The Google Search service also supports additional configuration:

```typescript
const searchClient = new GoogleSearch({
  apiKey: 'your-google-api-key',
  searchEngineId: 'your-search-engine-id',
  maxResults: 5, // Number of results to return
  language: 'en', // Search language
  country: 'us', // Country restriction
  safeSearch: 'medium' // Safe search level: 'off', 'medium', or 'high'
});
```

## Example Project

See the full example implementation in `/src/examples/claude-search-example.ts` for a complete demonstration of the Claude + Google Search integration.

## Limitations

- Requires active Anthropic API key with access to Claude models
- Depends on Google Custom Search API, which has usage quotas and may incur costs
- Search results are limited to text content (no direct image processing)

## License

This integration is part of the OpenRouter SDK and is subject to the same license terms.
