/**
 * Demo script for OpenRouter SDK with advanced features
 * 
 * This script showcases the enhanced capabilities added to the SDK,
 * particularly the advanced agent memory system and streamlined CrewAI
 * agent orchestration.
 */

import { AIOrchestrator } from './dist/core/ai-orchestrator.js';
import { AgentMemory, MemoryType } from './dist/utils/agent-memory.js';
import { VectorDBType } from './dist/utils/vector-db.js';

console.log('===== OpenRouter SDK Enhanced Features Demo =====');

/**
 * Demonstrate Agent Memory System
 */
async function demoAgentMemory() {
  console.log('\n1. Advanced Agent Memory System:');
  console.log('-------------------------------');
  
  const agentMemory = new AgentMemory('demo-agent', {
    memoryType: MemoryType.Hybrid,
    retention: {
      messageLimit: 10,
      useCompression: true,
      removalStrategy: 'summarize'
    },
    vectorDb: {
      type: VectorDBType.InMemory,
      dimensions: 1536,
      persistToDisk: false
    },
    autoIndex: true
  });
  
  console.log('✓ Created agent with advanced memory capabilities');
  
  // Store some initial knowledge
  await agentMemory.storeMemory(
    'OpenRouter is a unified API for accessing AI models from different providers.',
    'fact',
    { topic: 'openrouter', source: 'documentation' }
  );
  
  console.log('✓ Stored knowledge in long-term memory');
  
  // Add conversation messages
  await agentMemory.addMessage({ role: 'user', content: 'What is OpenRouter?' });
  await agentMemory.addMessage({ 
    role: 'assistant', 
    content: 'OpenRouter is a unified API that provides access to various AI models through a single, consistent interface.' 
  });
  
  console.log('✓ Added conversation messages to memory');
  
  // Retrieve relevant knowledge
  const query = 'Tell me about OpenRouter capabilities';
  const enhancedContext = await agentMemory.generateEnhancedContext(query);
  
  console.log(`✓ Retrieved relevant memories for query: "${query}"`);
  console.log(`  - Short-term messages: ${enhancedContext.messages.length}`);
  console.log(`  - Relevant long-term memories: ${enhancedContext.relevantMemories.length}`);
  
  if (enhancedContext.relevantMemories.length > 0) {
    console.log('\nRelevant memories found:');
    enhancedContext.relevantMemories.forEach((memory, i) => {
      console.log(`  ${i+1}. ${memory.document.content.substring(0, 100)}...`);
    });
  }
  
  console.log('\n✓ Advanced agent memory demonstration complete');
}

/**
 * Demonstrate Multi-Agent System Creation
 */
async function demoCrewAISetup() {
  console.log('\n2. Enhanced CrewAI Agent Orchestration:');
  console.log('------------------------------------');
  
  // Initialize orchestrator with minimal config
  const orchestrator = new AIOrchestrator({
    apiKey: process.env.OPENROUTER_API_KEY || 'demo-mode' 
  });
  
  console.log('✓ Initialized AIOrchestrator');
  
  // Create a simple multi-agent system (in demo mode without actual execution)
  const system = {
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
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    ],
    knowledgeBases: [
      {
        id: 'research-knowledge',
        config: {
          dimensions: 1536,
          persistToDisk: false
        }
      }
    ]
  };
  
  console.log('✓ Created multi-agent system configuration');
  console.log(`  - System name: ${system.name}`);
  console.log(`  - Agents: ${system.agents.map(a => a.name).join(', ')}`);
  console.log(`  - Functions: ${system.functions.map(f => f.name).join(', ')}`);
  console.log(`  - Knowledge bases: ${system.knowledgeBases.map(kb => kb.id).join(', ')}`);
  
  console.log('\n✓ Enhanced CrewAI orchestration demo complete');
}

// Run the demo
async function runDemo() {
  try {
    console.log('Starting demonstration of enhanced OpenRouter SDK features...\n');
    
    await demoAgentMemory();
    await demoCrewAISetup();
    
    console.log('\nDemo completed successfully!');
    console.log('For more details, explore the src/examples directory.');
  } catch (error) {
    console.error('Error running demo:', error);
  }
}

// Run the demo
runDemo();
