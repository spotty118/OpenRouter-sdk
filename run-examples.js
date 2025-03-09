/**
 * Run examples for OpenRouter SDK with enhanced features
 * 
 * This script demonstrates the advanced capabilities added to the OpenRouter SDK.
 */

// ==== Example 1: Agent Memory System ====
console.log('===== Example 1: Advanced Agent Memory System =====');

// Example code for creating and using agent memory
console.log(`
// Import the AgentMemory class and related types
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

// Storing knowledge directly in long-term memory
await agentMemory.storeMemory(
  'Tesla was founded in 2003 by Martin Eberhard and Marc Tarpenning.',
  'fact',
  { topic: 'electric-vehicles', source: 'knowledge-base' }
);

// Adding conversation to memory (automatically indexed)
await agentMemory.addMessage({ 
  role: 'user', 
  content: 'What do you know about Tesla?' 
});

await agentMemory.addMessage({ 
  role: 'assistant', 
  content: 'Tesla is an electric vehicle manufacturer founded in 2003.' 
});

// Getting agent's current conversation context
const messages = agentMemory.getMessages();

// Retrieving relevant memories based on query
const memories = await agentMemory.retrieveRelevantMemories('Tesla founder');

// Generating enhanced context with relevant memories included
const enhancedContext = await agentMemory.generateEnhancedContext('Who founded Tesla?');
`);

// Running memory simulation
console.log('\n🔄 Running Memory Simulation:');

console.log('\n1. Agent receives question: "Who founded Tesla?"');

console.log('\n2. Agent searches long-term memory storage:');
console.log('   ✓ Found stored fact: "Tesla was founded in 2003 by Martin Eberhard and Marc Tarpenning."');
console.log('   ✓ Found conversation snippet: "Tesla is an electric vehicle manufacturer founded in 2003."');

console.log('\n3. Agent enhances response context with memories:');
console.log('   Adding system message: "Relevant information from your memory:"');
console.log('   - Tesla was founded in 2003 by Martin Eberhard and Marc Tarpenning.');
console.log('   - Tesla is an electric vehicle manufacturer founded in 2003.');

console.log('\n4. Agent generates response with enhanced context:');
console.log('   "Tesla was founded in 2003 by Martin Eberhard and Marc Tarpenning,');
console.log('    although Elon Musk is often associated with the company as an early');
console.log('    investor who later became CEO and the face of the company."');

console.log('\n5. Agent adds response to memory, where it becomes available for future questions.');

// ==== Example 2: Enhanced CrewAI Agent Orchestration ====
console.log('\n\n===== Example 2: Enhanced CrewAI Agent Orchestration =====');

// Example code for creating multi-agent systems
console.log(`
// Import the orchestrator
import { AIOrchestrator } from 'openrouter-sdk';

// Initialize orchestrator with minimal config
const orchestrator = new AIOrchestrator({
  apiKey: process.env.OPENROUTER_API_KEY
});

// One-line multi-agent system setup
const system = await orchestrator.createMultiAgentSystem({
  name: 'Research & Analysis System',
  agents: [
    {
      id: 'researcher',
      name: 'Research Agent',
      description: 'Gathers information from various sources',
      model: 'anthropic/claude-3-opus'
    },
    {
      id: 'analyst',
      name: 'Analysis Agent',
      description: 'Analyzes information and draws insights',
      model: 'openai/gpt-4o'
    }
  ],
  functions: [
    {
      name: 'search_web',
      description: 'Search the web for information',
      parameters: {
        query: { type: 'string', description: 'Search query' },
        sources: { type: 'number', description: 'Number of sources', default: 3 }
      },
      implementation: async (args) => {
        // Search implementation
        return { results: ['result1', 'result2', 'result3'] };
      }
    }
  ],
  knowledgeBases: [
    {
      id: 'research-knowledge',
      config: {
        dimensions: 1536,
        persistToDisk: true
      }
    }
  ]
});

// Create a task for the research agent
const researchTask = orchestrator.createTask({
  id: 'market-research',
  name: 'Market Research',
  description: 'Research current trends in AI and provide a summary',
  assignedAgentId: 'researcher',
  expectedOutput: 'A summary of current AI trends'
});

// Create a task for the analyst agent that depends on the research
const analysisTask = orchestrator.createTask({
  id: 'trend-analysis',
  name: 'Trend Analysis',
  description: 'Analyze the market research and identify key opportunities',
  assignedAgentId: 'analyst',
  expectedOutput: 'Analysis of key opportunities in AI'
});

// Create a workflow with dependencies
const workflow = orchestrator.createWorkflow({
  id: 'market-analysis',
  name: 'Market Analysis',
  tasks: [researchTask, analysisTask],
  dependencies: {
    'trend-analysis': ['market-research'] // Analysis depends on research
  },
  processMode: 'hierarchical' // Smart execution based on dependencies
});

// Execute the workflow
const results = await orchestrator.executeWorkflow(workflow);
`);

// Running orchestration simulation
console.log('\n🔄 Running Orchestration Simulation:');

console.log('\n1. System initialized with two agents and one function:');
console.log('   ✓ Research Agent: Gathers information (Claude 3 Opus)');
console.log('   ✓ Analysis Agent: Analyzes information (GPT-4o)');
console.log('   ✓ search_web function: Queries external sources');

console.log('\n2. Workflow execution begins:');
console.log('   ✓ Detecting dependencies: Analysis task depends on Research task');
console.log('   ✓ Processing order determined: Research → Analysis');

console.log('\n3. Research task execution:');
console.log('   ✓ Research Agent assigned task "Market Research"');
console.log('   ✓ Agent calls search_web function with query "current AI trends"');
console.log('   ✓ Agent synthesizes information into comprehensive report');
console.log('   ✓ Task completed: "A summary of current AI market trends"');

console.log('\n4. Analysis task execution:');
console.log('   ✓ Analysis Agent assigned task "Trend Analysis"');
console.log('   ✓ Agent receives Research task output as input');
console.log('   ✓ Agent analyzes trends and identifies opportunities');
console.log('   ✓ Task completed: "Analysis of key opportunities in AI market"');

console.log('\n5. Workflow results returned to user');

// Final notes
console.log('\n===== Notes on Implementation =====');
console.log('✓ Advanced Agent Memory: src/utils/agent-memory.ts');
console.log('✓ Enhanced CrewAI Orchestration: integrated with AIOrchestrator');
console.log('✓ Example implementations: src/examples/ directory');
console.log('✓ Documentation: Updated in README.md');

console.log('\nThese enhancements make it easier to build sophisticated AI agent systems');
console.log('with persistent knowledge and streamlined task orchestration.');
