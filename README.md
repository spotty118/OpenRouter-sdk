# OpenRouter SDK with Integrated AI Orchestration

This SDK provides a unified interface for working with AI models through OpenRouter, with integrated support for:

- **Function/Tool Calling**: Register and execute functions that AI models can call
- **CrewAI Agent Orchestration**: Create and manage multi-agent systems
- **Vector Databases**: Store and retrieve knowledge with semantic search
- **Workflows**: Define and execute complex AI workflows with dependencies
- **RESTful API Server**: Expose all SDK functionality through HTTP endpoints

## Features

- **Unified API**: Access all OpenRouter models through a single, consistent interface
- **Function Registry**: Register functions that AI models can call and execute
- **Agent Management**: Create, configure, and orchestrate AI agents
- **Knowledge Management**: Store and retrieve knowledge with vector databases
- **Workflow Orchestration**: Define complex workflows with multiple agents and tasks
- **API Server**: Full-featured REST API for all SDK functionality

## Installation

```bash
npm install openrouter-sdk
```

## Quick Start

```typescript
import { AIOrchestrator } from 'openrouter-sdk';

// Initialize the orchestrator
const orchestrator = new AIOrchestrator({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultModel: 'anthropic/claude-3-opus'
});

// Register a function
const weatherFunction = orchestrator.registerFunction(
  'get_weather',
  'Get current weather for a location',
  {
    location: {
      type: 'string',
      description: 'City name'
    }
  },
  ['location'],
  async (args) => {
    // Implementation to fetch weather data
    return { temperature: 22, conditions: 'sunny' };
  }
);

// Create an agent
const researchAgent = orchestrator.createAgent({
  id: 'researcher',
  name: 'Research Specialist',
  description: 'Expert at finding information',
  model: 'anthropic/claude-3-opus',
  systemMessage: 'You are a research specialist.'
});

// Create a task
const researchTask = orchestrator.createTask({
  id: 'market-research',
  name: 'Market Research',
  description: 'Research market trends',
  assignedAgentId: 'researcher'
});

// Execute the task
const result = await orchestrator.executeTask(
  researchTask,
  researchAgent
);

console.log('Task result:', result);
```

## Core Components

### AIOrchestrator

The main class that integrates OpenRouter, CrewAI, and Vector DB capabilities:

```typescript
const orchestrator = new AIOrchestrator({
  apiKey: 'your-api-key',
  defaultModel: 'anthropic/claude-3-opus'
});
```

### Function Calling

Register functions that AI models can call:

```typescript
const searchFunction = orchestrator.registerFunction(
  'search_web',
  'Search the web for information',
  {
    query: { type: 'string', description: 'Search query' }
  },
  ['query'],
  async (args) => {
    // Implementation
    return { results: ['result1', 'result2'] };
  }
);
```

### Vector Databases

Create and use vector databases for knowledge storage:

```typescript
// Create a vector database
const vectorDb = orchestrator.createVectorDb('research-knowledge', {
  dimensions: 1536,
  maxVectors: 10000
});

// Add documents
await orchestrator.addDocuments('research-knowledge', [
  {
    id: 'doc1',
    content: 'Document content...',
    metadata: { source: 'research-report' }
  }
]);

// Search
const results = await orchestrator.searchByText(
  'research-knowledge',
  'search query',
  { limit: 5 }
);
```

### Agent Orchestration

Create and manage AI agents:

```typescript
// Create agents
const researchAgent = orchestrator.createAgent({
  id: 'researcher',
  name: 'Research Specialist',
  model: 'anthropic/claude-3-opus'
});

const writerAgent = orchestrator.createAgent({
  id: 'writer',
  name: 'Content Writer',
  model: 'openai/gpt-4o'
});

// Create tasks
const researchTask = orchestrator.createTask({
  id: 'research',
  name: 'Research',
  assignedAgentId: 'researcher'
});

const writingTask = orchestrator.createTask({
  id: 'writing',
  name: 'Writing',
  assignedAgentId: 'writer'
});

// Create workflow
const workflow = orchestrator.createWorkflow({
  id: 'research-and-write',
  name: 'Research and Write',
  tasks: [researchTask, writingTask],
  dependencies: {
    'writing': ['research']
  }
});

// Execute workflow
const results = await orchestrator.executeWorkflow(workflow);
```

## API Server

This SDK includes a full-featured API server that exposes all functionality through RESTful endpoints. The API server provides:

- Authentication with API keys
- Rate limiting
- Comprehensive error handling
- Streaming support for chat completions
- File upload for audio transcription
- Batch processing endpoints

### Starting the API Server

```bash
# Start in development mode with auto-reload
npm run dev

# Start in production mode
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

For detailed documentation on all API endpoints, see [API_README.md](API_README.md).

## Examples

This SDK includes several example implementations to help you get started:

### Enhanced CrewAI and Tool Calling

The SDK provides advanced agent orchestration with streamlined activation:

```typescript
import { 
  AIOrchestrator, 
  quickSetupExample, 
  smartOrchestrationExample 
} from 'openrouter-sdk';

// One-line setup for complete agent systems
await quickSetupExample();

// Smart agent orchestration with adaptive processing
await smartOrchestrationExample();

// Create a multi-agent system in one operation
const system = await orchestrator.createMultiAgentSystem({
  name: 'Research System',
  agents: [
    { id: 'researcher', name: 'Research Agent', model: 'anthropic/claude-3-opus' },
    { id: 'writer', name: 'Content Writer', model: 'openai/gpt-4o' }
  ],
  functions: [
    {
      name: 'search_web',
      description: 'Search the web',
      parameters: { query: { type: 'string' } },
      implementation: async (args) => ({ results: ['result1'] })
    }
  ],
  knowledgeBases: [
    {
      id: 'knowledge',
      config: { dimensions: 1536 }
    }
  ]
});
```

### Advanced Agent Memory System

The SDK includes a sophisticated memory system for AI agents that provides both short-term context management and long-term knowledge retention:

```typescript
import { AgentMemory, MemoryType } from 'openrouter-sdk';

// Create an agent with advanced memory capabilities
const agentMemory = new AgentMemory('research-agent', {
  // Hybrid memory combines short-term and long-term storage
  memoryType: MemoryType.Hybrid,
  
  // Configure memory retention and retrieval
  retention: {
    messageLimit: 15,
    useCompression: true,
    removalStrategy: 'summarize',
    relevanceThreshold: 0.65
  },
  
  // Vector database for long-term storage
  vectorDb: {
    type: 'in-memory',
    dimensions: 1536,
    persistToDisk: true
  },
  
  // Enable automatic memory features
  autoIndex: true,     // Auto-index all conversations
  autoPrune: true      // Auto-prune redundant memories
});

// Store knowledge in the agent's memory
await agentMemory.storeMemory(
  'Important fact to remember later',
  'knowledge',
  { source: 'research' }
);

// Add conversation messages to memory
await agentMemory.addMessage({ 
  role: 'user', 
  content: 'What do you know about AI?' 
});

// Retrieve relevant memories based on context
const memories = await agentMemory.retrieveRelevantMemories('AI research trends');

// Generate enhanced context with relevant memories automatically included
const enhancedContext = await agentMemory.generateEnhancedContext('Current query');
```

For more detailed examples, explore the `src/examples` directory.

## License

MIT
