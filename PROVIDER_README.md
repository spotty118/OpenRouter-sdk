# Native Provider Integration for OpenRouter SDK

This document describes the native provider integration feature implemented in the OpenRouter SDK. This feature allows direct interaction with AI providers like OpenAI, Google Gemini, and Google Vertex AI without going through the OpenRouter API, while maintaining full compatibility with the OpenRouter API.

## Features

- **Direct Provider Access**: Communicate directly with provider APIs when possible
- **OpenRouter Fallback**: Fall back to OpenRouter when direct access fails or is not available
- **Type-Safe Interfaces**: Well-defined interfaces for all providers
- **Model Mapping**: Automatic mapping between OpenRouter and provider-specific model names
- **Full Compatibility**: Support for all OpenRouter features (chat, embeddings, images, audio)

## Supported Providers

The SDK now includes support for the following providers:

- **OpenAI**: Direct access to GPT models, embeddings, DALL-E, and Whisper
- **Google Gemini**: Access to Gemini Pro, Gemini Pro Vision, and Gemini 1.5 models
- **Google Vertex AI**: Access to Google Cloud's Vertex AI Platform including Gemini models and PaLM models
- **Anthropic**: Access to Claude models including Claude 3 Opus, Sonnet, and Haiku
- **Mistral AI**: Access to Mistral's models including Mistral Small, Medium, and Large
- **Together AI**: Access to open source models like Llama, Gemma, and Mixtral via Together's API

## Usage

### Basic Setup

```typescript
import { OpenRouter, ProviderManager, ProviderIntegration, ProviderType } from 'openrouter-sdk';

// Create provider configurations
const providerManager = new ProviderManager({
  openai: {
    apiKey: 'OPENAI_API_KEY',
    organizationId: 'OPENAI_ORG_ID' // optional
  },
  gemini: {
    apiKey: 'GEMINI_API_KEY'
  },
  vertex: {
    apiKey: 'VERTEX_API_KEY',
    projectId: 'VERTEX_PROJECT_ID',
    location: 'us-central1'
  }
});

// Create provider integration helper
const providerIntegration = new ProviderIntegration(
  providerManager,
  'info',    // log level
  true       // enable direct integration
);

// Create OpenRouter instance for fallback
const openRouter = new OpenRouter({
  apiKey: 'OPENROUTER_API_KEY'
});
```

### Using Provider Integration with OpenRouter

```typescript
// Example request
const request = {
  model: 'openai/gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Tell me about the solar system.' }
  ],
  temperature: 0.7,
};

// Try to use direct provider integration
const directResponse = await providerIntegration.tryChatCompletion(request);

if (directResponse) {
  console.log('Response from direct provider:');
  console.log(directResponse.choices[0].message.content);
} else {
  // Fall back to OpenRouter API
  console.log('Falling back to OpenRouter API...');
  const fallbackResponse = await openRouter.createChatCompletion(request);
  console.log('Response from OpenRouter:');
  console.log(fallbackResponse.choices[0].message.content);
}
```

### Using Providers Directly

You can also use the providers directly for complete control:

```typescript
// Get Gemini provider
const geminiProvider = providerManager.getProvider(ProviderType.GOOGLE_GEMINI);

if (geminiProvider) {
  const response = await geminiProvider.createChatCompletion({
    model: 'google/gemini-pro',
    messages: [
      { role: 'user', content: 'Explain quantum computing in simple terms.' }
    ],
    temperature: 0.3,
  });
  
  console.log(response.choices[0].message.content);
}
```

### Streaming with Vertex AI

```typescript
const vertexProvider = providerManager.getProvider(ProviderType.GOOGLE_VERTEX);

if (vertexProvider) {
  // Start streaming request
  const stream = vertexProvider.streamChatCompletions({
    model: 'google-vertex/gemini-1.5-pro',
    messages: [
      { role: 'user', content: 'Write a short poem about technology.' }
    ],
    temperature: 0.7,
    max_tokens: 150,
  });
  
  // Process streaming response
  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.message?.content || '';
    process.stdout.write(content);
  }
}
```

### Multimodal Content with Gemini Vision

```typescript
const geminiProvider = providerManager.getProvider(ProviderType.GOOGLE_GEMINI);

if (geminiProvider) {
  const response = await geminiProvider.createChatCompletion({
    model: 'google/gemini-pro-vision',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What does this image show?'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.com/image.jpg'
            }
          }
        ]
      }
    ]
  });
  
  console.log(response.choices[0].message.content);
}
```

## Benefits of Native Provider Integration

1. **Reduced Latency**: Direct API calls can be faster than going through OpenRouter
2. **Reliability**: Continue working even if OpenRouter is temporarily unavailable
3. **Cost Control**: Choose between direct API usage or OpenRouter's routing capabilities
4. **Feature Access**: Access provider-specific features that may not be exposed through OpenRouter
5. **Flexibility**: Seamlessly switch between direct provider access and OpenRouter based on needs

## Implementation Details

The native provider integration is implemented using the following components:

- **Provider Interface**: A common interface for all providers
- **Provider Implementations**: Specific implementations for each provider
- **Provider Manager**: Manages provider instances
- **Provider Integration**: Integrates providers with OpenRouter

## Model Mapping

The SDK automatically maps between OpenRouter model IDs and provider-specific model IDs:

### OpenAI Mapping
- `openai/gpt-4o` ↔ `gpt-4o`
- `openai/gpt-4` ↔ `gpt-4`
- `openai/dall-e-3` ↔ `dall-e-3`

### Google Gemini Mapping
- `google/gemini-pro` ↔ `gemini-pro`
- `google/gemini-pro-vision` ↔ `gemini-pro-vision`
- `google/gemini-1.5-pro` ↔ `gemini-1.5-pro`

### Google Vertex AI Mapping
- `google-vertex/gemini-pro` ↔ `gemini-pro`
- `google-vertex/text-bison` ↔ `text-bison`
- `google-vertex/gemini-1.5-pro` ↔ `gemini-1.5-pro`

## Error Handling

The provider integration includes comprehensive error handling:

- Automatically retries requests with exponential backoff
- Falls back to OpenRouter when direct provider access fails
- Provides detailed error messages for debugging

## Integration with Other OpenRouter SDK Features

The native provider integration is fully compatible with all other OpenRouter SDK features including:

### CrewAI Integration

You can use native providers with the CrewAI orchestration system:

```typescript
// Create a crew with a direct provider
const researcher = openRouter.createAgent({
  id: 'researcher',
  name: 'Research Agent',
  description: 'Researches information on specific topics',
  // Use direct Gemini provider
  model: 'google/gemini-pro',
  systemMessage: 'You are a research specialist...',
});

const writer = openRouter.createAgent({
  id: 'writer',
  name: 'Content Writer',
  description: 'Writes high-quality content based on research',
  // Use direct OpenAI provider
  model: 'openai/gpt-4o',
  systemMessage: 'You are a skilled content writer...',
});

// Create and run tasks with these agents
const researchTask = openRouter.createTask({
  id: 'research-task',
  name: 'Research electric vehicles',
  description: 'Find the latest information about electric vehicles',
  assignedAgentId: 'researcher',
});

// The same CrewAI workflow works with native providers
const results = await openRouter.executeTask(researchTask, researcher);
```

### Vector Database Integration

Native providers can be used with the vector database functionality:

```typescript
// Create a vector database
const vectorDb = openRouter.createVectorDb({
  dimensions: 1536,
  maxVectors: 10000
});

// Use direct provider for embeddings
const geminiProvider = providerManager.getProvider(ProviderType.GOOGLE_GEMINI);

// Generate embeddings with direct provider and store in vector DB
const text = "This is a sample document about artificial intelligence.";
const embeddingResponse = await geminiProvider.createEmbedding({
  model: 'google/gemini-embedding',
  input: text
});

// Store in vector database
await vectorDb.addDocument({
  id: 'doc1',
  content: text,
  embedding: embeddingResponse.data[0].embedding,
  metadata: { source: 'sample' }
});

// Search the vector database
const query = "Tell me about AI";
const queryEmbedding = await geminiProvider.createEmbedding({
  model: 'google/gemini-embedding',
  input: query
});

const searchResults = await vectorDb.search({
  embedding: queryEmbedding.data[0].embedding,
  limit: 5
});
```

### Agent Memory with Native Providers

You can use agent memory systems with native providers:

```typescript
// Adding knowledge to an agent
await openRouter.addAgentKnowledge(
  'researcher',
  {
    id: 'doc1',
    content: 'Electric vehicles are becoming increasingly popular...',
    metadata: { source: 'research-report' }
  }
);

// Using direct provider for the agent
const geminiProvider = providerManager.getProvider(ProviderType.GOOGLE_GEMINI);
const response = await geminiProvider.createChatCompletion({
  model: 'google/gemini-pro',
  messages: [
    { role: 'system', content: 'Use the following context to answer the question.' },
    { role: 'user', content: 'What are the trends in electric vehicles?' }
  ]
});
```

## Conclusion

The native provider integration feature in the OpenRouter SDK gives you the best of both worlds: direct provider access when you need it, and OpenRouter's routing capabilities when you prefer them. This flexibility allows you to build more robust and efficient AI applications, while still leveraging all the powerful features of the OpenRouter SDK like CrewAI and vector database integrations.
