/**
 * Example usage of the AIOrchestrator class
 */

import { AIOrchestrator } from '../core/ai-orchestrator.js';
import { ProcessMode } from '../interfaces/index.js';

/**
 * This example demonstrates how to use the AIOrchestrator class to:
 * 1. Create and register functions for AI models to call
 * 2. Create and orchestrate agents with different capabilities
 * 3. Use vector databases for knowledge storage and retrieval
 * 4. Execute workflows with multiple agents
 */
async function runExample() {
  // Initialize the orchestrator with OpenRouter API key
  const orchestrator = new AIOrchestrator({
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key',
    defaultModel: 'anthropic/claude-3-opus'
  });

  console.log('Creating functions...');
  
  // Register a function for weather information
  const weatherFunction = orchestrator.registerFunction(
    'get_weather',
    'Get current weather for a location',
    {
      location: {
        type: 'string',
        description: 'City name'
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    ['location'],
    async (args) => {
      // Mock implementation - in a real app, this would call a weather API
      console.log(`Getting weather for ${args.location}`);
      return {
        temperature: 22,
        conditions: 'sunny',
        humidity: 65,
        location: args.location,
        units: args.units || 'celsius'
      };
    }
  );

  // Register a function for web search
  const searchFunction = orchestrator.registerFunction(
    'search_web',
    'Search the web for information',
    {
      query: {
        type: 'string',
        description: 'Search query'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 5
      }
    },
    ['query'],
    async (args) => {
      // Mock implementation - in a real app, this would call a search API
      console.log(`Searching for: ${args.query}`);
      return {
        results: [
          { title: 'Result 1', snippet: 'This is the first result' },
          { title: 'Result 2', snippet: 'This is the second result' }
        ],
        query: args.query
      };
    }
  );

  console.log('Creating vector database...');
  
  // Create a vector database for knowledge storage
  const vectorDb = orchestrator.createVectorDb('research-knowledge', {
    dimensions: 1536,
    maxVectors: 10000,
    similarityMetric: 'cosine',
    persistToDisk: true,
    storagePath: './data/research-db'
  });

  // Add some documents to the vector database
  await orchestrator.addDocuments('research-knowledge', [
    {
      id: 'doc1',
      content: 'Electric vehicles are becoming increasingly popular as battery technology improves.',
      metadata: { source: 'research-report', topic: 'electric-vehicles' }
    },
    {
      id: 'doc2',
      content: 'The global market for electric vehicles is expected to grow significantly in the next decade.',
      metadata: { source: 'market-analysis', topic: 'electric-vehicles' }
    }
  ]);

  console.log('Creating agents...');
  
  // Create a research agent
  const researchAgent = orchestrator.createAgent({
    id: 'researcher',
    name: 'Research Specialist',
    description: 'Expert at finding and analyzing information',
    model: 'anthropic/claude-3-opus',
    systemMessage: 'You are a research specialist who excels at finding accurate information.',
    temperature: 0.2,
    tools: [
      {
        type: 'function',
        function: searchFunction
      }
    ]
  });

  // Create a writer agent
  const writerAgent = orchestrator.createAgent({
    id: 'writer',
    name: 'Content Writer',
    description: 'Expert at creating engaging content',
    model: 'openai/gpt-4o',
    systemMessage: 'You are a content writer who creates engaging and informative content.',
    temperature: 0.7
  });

  console.log('Creating tasks...');
  
  // Create tasks for the agents
  const researchTask = orchestrator.createTask({
    id: 'market-research',
    name: 'Market Research',
    description: 'Research the current market trends for electric vehicles',
    assignedAgentId: 'researcher',
    expectedOutput: 'A comprehensive report on EV market trends with key statistics'
  });

  const writingTask = orchestrator.createTask({
    id: 'content-creation',
    name: 'Content Creation',
    description: 'Create an engaging blog post about electric vehicles based on the research',
    assignedAgentId: 'writer',
    expectedOutput: 'A 500-word blog post about electric vehicles'
  });

  console.log('Creating workflow...');
  
  // Create a workflow connecting the tasks
  const workflow = orchestrator.createWorkflow({
    id: 'research-and-write',
    name: 'Research and Write',
    tasks: [researchTask, writingTask],
    dependencies: {
      'content-creation': ['market-research'] // Writing task depends on research task
    },
    processMode: ProcessMode.HIERARCHICAL
  });

  console.log('Executing workflow...');
  
  // Execute the workflow
  const results = await orchestrator.executeWorkflow(workflow);

  console.log('Workflow results:');
  console.log(JSON.stringify(results, null, 2));

  // Example of using the chat function with function calling
  console.log('Testing chat with function calling...');
  
  const chatResponse = await orchestrator.chat({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What\'s the weather like in Paris?' }
    ],
    model: 'anthropic/claude-3-opus',
    temperature: 0.7
  });

  console.log('Chat response:');
  console.log(JSON.stringify(chatResponse, null, 2));

  // If the model made tool calls, execute them
  // Check if the model response includes tool calls
  // Using type assertion since the interface might not be fully updated
  if ((chatResponse.choices?.[0]?.message as any)?.tool_calls) {
    // Type assertion needed because the interface might not be fully updated
    const toolCalls = (chatResponse.choices[0].message as any).tool_calls;
    const toolResults = await orchestrator.executeToolCalls(toolCalls);
    
    console.log('Tool results:');
    console.log(JSON.stringify(toolResults, null, 2));
  }

  // Example of searching the vector database
  console.log('Searching vector database...');
  
  const searchResults = await orchestrator.searchByText(
    'research-knowledge',
    'electric vehicle market growth',
    { limit: 5, minScore: 0.7 }
  );

  console.log('Search results:');
  console.log(JSON.stringify(searchResults, null, 2));
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample };