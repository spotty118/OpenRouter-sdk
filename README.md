# OpenRouter SDK with Integrated AI Orchestration

This SDK provides a unified interface for working with AI models through OpenRouter, with integrated support for:

- **Function/Tool Calling**: Register and execute functions that AI models can call
- **CrewAI Agent Orchestration**: Create and manage multi-agent systems
- **Vector Databases**: Store and retrieve knowledge with semantic search
- **Workflows**: Define and execute complex AI workflows with dependencies

## Features

- **Unified API**: Access all OpenRouter models through a single, consistent interface
- **Function Registry**: Register functions that AI models can call and execute
- **Agent Management**: Create, configure, and orchestrate AI agents
- **Knowledge Management**: Store and retrieve knowledge with vector databases
- **Workflow Orchestration**: Define complex workflows with multiple agents and tasks

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

## Examples

See the `src/examples` directory for more detailed examples.

## License

MIT