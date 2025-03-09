# OpenRouter API Server

This API server provides RESTful endpoints for interacting with the OpenRouter SDK, allowing you to access various AI models through a unified interface.

## Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

### Running the Server

Start the server in production mode:
```bash
npm start
```

Start the server in development mode with auto-reload:
```bash
npm run dev
```

Or use the dedicated API script:
```bash
npm run api
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Authentication

All API endpoints require authentication using an OpenRouter API key. Include the API key in the `Authorization` header of your requests:

```
Authorization: Bearer your_api_key_here
```

## API Endpoints

### Chat Completions

#### Create a chat completion

```
POST /api/v1/chat/completions
```

Request body:
```json
{
  "model": "openai/gpt-4",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "What is the capital of France?" }
  ],
  "temperature": 0.7,
  "max_tokens": 100
}
```

#### Stream chat completions

```
POST /api/v1/chat/completions/stream
```

Request body: Same as the chat completion endpoint.

### Embeddings

#### Generate embeddings

```
POST /api/v1/embedding
```

Request body:
```json
{
  "model": "openai/text-embedding-3-small",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

#### Batch process embeddings

```
POST /api/v1/embedding/batch
```

Request body:
```json
{
  "requests": [
    {
      "model": "openai/text-embedding-3-small",
      "input": "The quick brown fox jumps over the lazy dog"
    },
    {
      "model": "openai/text-embedding-3-small",
      "input": "The five boxing wizards jump quickly"
    }
  ],
  "concurrency": 2
}
```

### Image Generation

#### Generate images

```
POST /api/v1/image/generations
```

Request body:
```json
{
  "model": "openai/dall-e-3",
  "prompt": "A serene lake surrounded by mountains at sunset",
  "size": "1024x1024",
  "quality": "hd"
}
```

#### Batch generate images

```
POST /api/v1/image/generations/batch
```

Request body:
```json
{
  "requests": [
    {
      "model": "openai/dall-e-3",
      "prompt": "A serene lake surrounded by mountains at sunset",
      "size": "1024x1024"
    },
    {
      "model": "openai/dall-e-3",
      "prompt": "A futuristic city with flying cars",
      "size": "1024x1024"
    }
  ]
}
```

### Audio Transcription

#### Transcribe audio

```
POST /api/v1/audio/transcriptions
```

Form data:
- `file`: Audio file (multipart/form-data)
- `model`: Model ID (e.g., "openai/whisper-1")
- `language`: (optional) Language code
- `prompt`: (optional) Transcription prompt
- `response_format`: (optional) Response format
- `temperature`: (optional) Temperature

#### Transcribe audio from URL

```
POST /api/v1/audio/transcriptions/url
```

Request body:
```json
{
  "url": "https://example.com/audio.mp3",
  "model": "openai/whisper-1",
  "language": "en"
}
```

### Models

#### List models

```
GET /api/v1/model
```

#### Get model information

```
GET /api/v1/model/:modelId
```

#### Filter models by capability

```
GET /api/v1/model/capability/:capability
```

Valid capabilities: `chat`, `embeddings`, `images`, `audio`, `tools`, `json_mode`, `vision`

#### Estimate cost

```
POST /api/v1/model/:modelId/cost
```

Request body:
```json
{
  "promptTokens": 100,
  "completionTokens": 50
}
```

### Agent Orchestration

#### Create an agent

```
POST /api/v1/agent
```

Request body:
```json
{
  "id": "researcher",
  "name": "Research Specialist",
  "description": "Expert at finding and analyzing information",
  "model": "anthropic/claude-3-opus-20240229",
  "systemMessage": "You are a research specialist who excels at finding accurate information."
}
```

#### Create a task

```
POST /api/v1/agent/task
```

Request body:
```json
{
  "id": "market-research",
  "name": "Market Research",
  "description": "Research the current market trends for electric vehicles",
  "assignedAgentId": "researcher",
  "expectedOutput": "A comprehensive report on EV market trends with key statistics"
}
```

#### Create a workflow

```
POST /api/v1/agent/workflow
```

Request body:
```json
{
  "id": "research-workflow",
  "name": "Research and Summarize",
  "tasks": [
    {
      "id": "research-task",
      "name": "Research",
      "description": "Research the topic",
      "assignedAgentId": "researcher"
    },
    {
      "id": "summary-task",
      "name": "Summarize",
      "description": "Summarize the research",
      "assignedAgentId": "writer"
    }
  ],
  "dependencies": {
    "summary-task": ["research-task"]
  }
}
```

#### Execute a task

```
POST /api/v1/agent/task/execute
```

Request body:
```json
{
  "task": {
    "id": "market-research",
    "name": "Market Research",
    "description": "Research the current market trends for electric vehicles",
    "assignedAgentId": "researcher"
  },
  "agent": {
    "id": "researcher",
    "name": "Research Specialist",
    "model": "anthropic/claude-3-opus-20240229"
  },
  "config": {
    "maxIterations": 3
  }
}
```

#### Execute a workflow

```
POST /api/v1/agent/workflow/execute
```

Request body:
```json
{
  "workflow": {
    "id": "research-workflow",
    "name": "Research and Summarize",
    "tasks": [
      {
        "id": "research-task",
        "name": "Research",
        "description": "Research the topic",
        "assignedAgentId": "researcher"
      },
      {
        "id": "summary-task",
        "name": "Summarize",
        "description": "Summarize the research",
        "assignedAgentId": "writer"
      }
    ],
    "dependencies": {
      "summary-task": ["research-task"]
    }
  },
  "agents": {
    "researcher": {
      "id": "researcher",
      "name": "Research Specialist",
      "model": "anthropic/claude-3-opus-20240229"
    },
    "writer": {
      "id": "writer",
      "name": "Content Writer",
      "model": "anthropic/claude-3-sonnet-20240229"
    }
  }
}
```

#### Add knowledge to an agent

```
POST /api/v1/agent/:agentId/knowledge
```

Request body:
```json
{
  "document": {
    "id": "doc1",
    "content": "Electric vehicles are becoming increasingly popular...",
    "metadata": {
      "source": "research-report",
      "topic": "electric-vehicles"
    }
  },
  "namespace": "ev-research"
}
```

#### Add batch knowledge to an agent

```
POST /api/v1/agent/:agentId/knowledge/batch
```

Request body:
```json
{
  "documents": [
    {
      "id": "doc1",
      "content": "Electric vehicles are becoming increasingly popular...",
      "metadata": {
        "source": "research-report",
        "topic": "electric-vehicles"
      }
    },
    {
      "id": "doc2",
      "content": "The global market for electric vehicles is expected to grow...",
      "metadata": {
        "source": "market-analysis",
        "topic": "electric-vehicles"
      }
    }
  ],
  "namespace": "ev-research"
}
```

#### Search agent knowledge

```
GET /api/v1/agent/:agentId/knowledge/search?query=electric%20vehicles&limit=5&min_score=0.7&namespace=ev-research
```

#### Get agent knowledge document

```
GET /api/v1/agent/:agentId/knowledge/:documentId?namespace=ev-research
```

#### Delete agent knowledge document

```
DELETE /api/v1/agent/:agentId/knowledge/:documentId?namespace=ev-research
```

### Vector Database

#### Create a vector database

```
POST /api/v1/vector-db
```

Request body:
```json
{
  "dimensions": 1536,
  "similarityMetric": "cosine",
  "maxVectors": 10000
}
```

#### Add document to vector database

```
POST /api/v1/vector-db/:id/documents
```

Request body:
```json
{
  "document": {
    "id": "doc1",
    "content": "Electric vehicles are becoming increasingly popular...",
    "metadata": {
      "source": "research-report",
      "topic": "electric-vehicles"
    }
  }
}
```

#### Add multiple documents to vector database

```
POST /api/v1/vector-db/:id/documents/batch
```

Request body:
```json
{
  "documents": [
    {
      "id": "doc1",
      "content": "Electric vehicles are becoming increasingly popular...",
      "metadata": {
        "source": "research-report",
        "topic": "electric-vehicles"
      }
    },
    {
      "id": "doc2",
      "content": "The global market for electric vehicles is expected to grow...",
      "metadata": {
        "source": "market-analysis",
        "topic": "electric-vehicles"
      }
    }
  ]
}
```

#### Search vector database by text

```
GET /api/v1/vector-db/:id/search?query=electric%20vehicles&limit=5&min_score=0.7&namespace=default
```

#### Get document from vector database

```
GET /api/v1/vector-db/:id/documents/:documentId?namespace=default
```

#### Delete document from vector database

```
DELETE /api/v1/vector-db/:id/documents/:documentId?namespace=default
```

## Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

## Error Handling

All API endpoints return appropriate HTTP status codes and error messages in the following format:

```json
{
  "error": {
    "message": "Error message",
    "type": "error_type",
    "code": 400,
    "data": {}
  }
}
```

Common error types:
- `authentication_error`: Invalid or missing API key
- `invalid_request_error`: Invalid request parameters
- `not_found_error`: Requested resource not found
- `rate_limit_error`: Rate limit exceeded
- `server_error`: Internal server error