/**
 * Enhanced CrewAI and Tool Calling Example
 * 
 * This example demonstrates advanced CrewAI usage with streamlined activation
 * and intelligent orchestration of agents, tools, and knowledge bases.
 */

import { AIOrchestrator } from '../core/ai-orchestrator.js';
import { CrewAI } from '../utils/crew-ai.js';
import { ProcessMode } from '../interfaces/index.js';

/**
 * One-line setup for creating a complete agent system
 */
async function quickSetupExample() {
  console.log('=== Quick Setup Agent System Example ===');
  
  // Initialize orchestrator with minimal config
  const orchestrator = new AIOrchestrator({
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key'
  });

  // One-line multi-agent system setup
  const system = await orchestrator.createMultiAgentSystem({
    name: 'Research & Analysis System',
    agents: [
      {
        id: 'researcher',
        name: 'Research Agent',
        description: 'Gathers information from various sources',
        model: 'anthropic/claude-3-opus',
        systemMessage: 'You find and collect accurate information from multiple sources.'
      },
      {
        id: 'analyst',
        name: 'Analysis Agent',
        description: 'Analyzes information and draws insights',
        model: 'openai/gpt-4o',
        systemMessage: 'You analyze information and identify key insights and patterns.'
      }
    ],
    functions: [
      {
        name: 'search_web',
        description: 'Search the web for information',
        parameters: {
          query: { type: 'string', description: 'Search query' },
          sources: { type: 'number', description: 'Number of sources to return', default: 3 }
        },
        required: ['query'],
        implementation: async (args) => {
          console.log(`Searching for: ${args.query}`);
          return { results: ['Example result 1', 'Example result 2', 'Example result 3'] };
        }
      },
      {
        name: 'save_insight',
        description: 'Save an insight to the knowledge base',
        parameters: {
          topic: { type: 'string', description: 'Topic of the insight' },
          insight: { type: 'string', description: 'The insight text' },
          confidence: { type: 'number', description: 'Confidence score (0-1)', default: 0.8 }
        },
        required: ['topic', 'insight'],
        implementation: async (args) => {
          console.log(`Saving insight on ${args.topic}: ${args.insight}`);
          return { success: true, id: `insight-${Date.now()}` };
        }
      }
    ],
    knowledgeBases: [
      {
        id: 'research-knowledge',
        config: {
          dimensions: 1536,
          persistToDisk: true,
          storagePath: './data/research-db'
        },
        documents: [
          {
            id: 'sample-1',
            content: 'AI agents can work together to solve complex problems.',
            metadata: { source: 'research', topic: 'ai-collaboration' }
          }
        ]
      }
    ]
  });

  console.log(`Created system: ${system.name} with ${system.agents.length} agents and ${system.functions.length} functions`);
  
  // Create and execute a simple task
  const task = orchestrator.createTask({
    id: 'research-ai-trends',
    name: 'Research AI Trends',
    description: 'Research current trends in AI and provide a summary',
    assignedAgentId: 'researcher',
    expectedOutput: 'A summary of current AI trends'
  });
  
  console.log(`Created task: ${task.name}`);
  
  // Execute the task (simplified for example)
  console.log('Task would execute here in a real implementation');
}

/**
 * Smart agent orchestration with adaptive processing
 */
async function smartOrchestrationExample() {
  console.log('=== Smart Agent Orchestration Example ===');
  
  // Create CrewAI instance with intelligent defaults
  const crewAI = new CrewAI();
  
  // Create agents with one-line configuration
  const researchAgent = crewAI.createAgent({
    id: 'researcher',
    name: 'Research Specialist',
    model: 'anthropic/claude-3-opus',
    description: 'Expert at finding information',
    systemMessage: 'You excel at researching topics thoroughly.'
  });
  
  const writerAgent = crewAI.createAgent({
    id: 'writer',
    name: 'Content Writer',
    model: 'openai/gpt-4o',
    description: 'Expert at creating engaging content',
    systemMessage: 'You create compelling, accurate content based on research.'
  });
  
  const editorAgent = crewAI.createAgent({
    id: 'editor',
    name: 'Content Editor',
    model: 'anthropic/claude-3-haiku',
    description: 'Expert at refining and improving content',
    systemMessage: 'You polish and improve content for clarity and engagement.'
  });
  
  // Create tasks with intelligent defaults
  const researchTask = crewAI.createTask({
    id: 'market-research',
    name: 'Market Research',
    description: 'Research the electric vehicle market trends',
    assignedAgentId: 'researcher'
  });
  
  const writingTask = crewAI.createTask({
    id: 'article-writing',
    name: 'Article Writing',
    description: 'Write an article based on the research findings',
    assignedAgentId: 'writer'
  });
  
  const editingTask = crewAI.createTask({
    id: 'article-editing',
    name: 'Article Editing',
    description: 'Edit and improve the written article',
    assignedAgentId: 'editor'
  });
  
  // Create an intelligent workflow that adapts to task dependencies
  const smartWorkflow = crewAI.createWorkflow({
    id: 'content-creation',
    name: 'Content Creation Pipeline',
    tasks: [researchTask, writingTask, editingTask],
    dependencies: {
      'article-writing': ['market-research'],
      'article-editing': ['article-writing']
    },
    // Intelligent process mode that adapts based on task dependencies
    processMode: ProcessMode.HIERARCHICAL
  });
  
  // Create crew with smart defaults
  const contentCrew = crewAI.createCrew({
    id: 'content-team',
    name: 'Content Creation Team',
    description: 'A team that creates high-quality content',
    agents: [researchAgent, writerAgent, editorAgent],
    // Auto-detect optimal processing mode based on agent capabilities
    processMode: ProcessMode.HIERARCHICAL,
    // Smart failure handling
    failureHandling: {
      maxRetries: 3,
      continueOnFailure: true,
      onFailure: (taskId, error) => {
        console.log(`Task ${taskId} failed, applying intelligent recovery strategy`);
        // In a real implementation, this would include advanced recovery logic
      }
    },
    verbose: true
  });
  
  console.log('Smart agent orchestration setup complete');
  console.log(`Created crew: ${contentCrew.name} with ${contentCrew.agents.length} agents`);
  console.log(`Created workflow: ${smartWorkflow.name} with ${smartWorkflow.tasks.length} tasks`);
  
  // In a real implementation, we would execute the workflow here
  console.log('Workflow would execute here in a real implementation');
}

/**
 * One-line tool and function calling setup
 */
async function oneLineToolSetupExample() {
  console.log('=== One-Line Tool Setup Example ===');
  
  // Initialize orchestrator with minimal config
  const orchestrator = new AIOrchestrator({
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key'
  });
  
  // Register function with one line for each function
  const weatherFunction = orchestrator.registerFunction(
    'get_weather',
    'Get current weather for a location',
    { location: { type: 'string', description: 'City name' } },
    ['location'],
    async (args) => ({ temperature: 22, conditions: 'sunny', location: args.location })
  );
  
  const searchFunction = orchestrator.registerFunction(
    'search_web',
    'Search the web for information',
    { query: { type: 'string', description: 'Search query' } },
    ['query'],
    async (args) => ({ results: ['Result 1', 'Result 2'], query: args.query })
  );
  
  console.log('Registered functions with one-line setup');
  
  // Generate a chat completion with auto-tool setup
  // The orchestrator automatically includes registered functions as tools
  const chatSetup = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What\'s the weather in Paris?' }
    ],
    model: 'anthropic/claude-3-opus',
    temperature: 0.7
  };
  
  console.log('Setting up chat with automatic tool integration');
  console.log('In a real implementation, this would call the chat API with tools auto-configured');
  
  // Execute a function call with simplified syntax
  const simplifiedCall = {
    function: 'get_weather',
    args: { location: 'New York' }
  };
  
  console.log(`Would execute function call: ${simplifiedCall.function}`);
  console.log(`With args: ${JSON.stringify(simplifiedCall.args)}`);
}

// Main function to run all examples
async function runEnhancedExamples() {
  try {
    // Run the examples
    await quickSetupExample();
    console.log('\n');
    await smartOrchestrationExample();
    console.log('\n');
    await oneLineToolSetupExample();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runEnhancedExamples().catch(console.error);
}

export { runEnhancedExamples, quickSetupExample, smartOrchestrationExample, oneLineToolSetupExample };
