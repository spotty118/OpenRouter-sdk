/**
 * Enhanced Agent Memory Example
 * 
 * This example demonstrates the advanced memory capabilities for AI agents,
 * which provide sophisticated context management, long-term knowledge retention,
 * and automatic memory reflection.
 */

import { AIOrchestrator } from '../core/ai-orchestrator.js';
import { AgentMemory, MemoryType } from '../utils/agent-memory.js';
import { VectorDBType } from '../interfaces/index.js';
import { ChatMessage } from '../interfaces/index.js';

/**
 * Example of using enhanced agent memory capabilities
 */
async function runAgentMemoryExample() {
  console.log('=== Enhanced Agent Memory Example ===');
  
  // Initialize the orchestrator
  const orchestrator = new AIOrchestrator({
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key',
    defaultModel: 'anthropic/claude-3-opus'
  });

  // Create a agent memory with hybrid memory system
  console.log('Creating agent with enhanced memory capabilities...');
  const agentMemory = new AgentMemory('research-agent', {
    memoryType: MemoryType.Hybrid,
    retention: {
      messageLimit: 15,
      useCompression: true,
      removalStrategy: 'summarize',
      relevanceThreshold: 0.65,
      maxRecallItems: 7
    },
    vectorDb: {
      type: VectorDBType.IN_MEMORY,
      dimensions: 1536,
      persistToDisk: true,
      storagePath: './data/agent-memories'
    },
    namespace: 'research-knowledge',
    autoIndex: true,
    autoPrune: true
  });

  // Store some initial knowledge in the agent's memory
  console.log('Adding knowledge to agent memory...');
  await agentMemory.storeMemory(
    'Electric vehicles use rechargeable batteries instead of gasoline or diesel.',
    'fact',
    { topic: 'electric-vehicles', source: 'knowledge-base' }
  );
  
  await agentMemory.storeMemory(
    'Tesla was founded in 2003 by Martin Eberhard and Marc Tarpenning.',
    'fact',
    { topic: 'electric-vehicles', source: 'knowledge-base' }
  );
  
  await agentMemory.storeMemory(
    'The range of electric vehicles has been increasing steadily, with some models now exceeding 400 miles on a single charge.',
    'fact',
    { topic: 'electric-vehicles', source: 'knowledge-base' }
  );

  // Simulate a conversation with the agent
  console.log('Simulating a conversation with the agent...');
  const conversation: ChatMessage[] = [
    { role: 'system', content: 'You are a research assistant specializing in electric vehicles.' },
    { role: 'user', content: 'What can you tell me about electric vehicles?' },
    { role: 'assistant', content: 'Electric vehicles (EVs) use electric motors powered by batteries instead of internal combustion engines. They produce zero direct emissions and are becoming increasingly popular as battery technology improves.' },
    { role: 'user', content: 'What about their range?' },
    { role: 'assistant', content: 'The range of EVs has improved significantly in recent years. Many modern EVs can travel over 200 miles on a single charge, with premium models exceeding 300-400 miles.' }
  ];

  // Add the conversation to memory
  for (const message of conversation) {
    await agentMemory.addMessage(message);
  }

  // Now ask a question that will benefit from both short-term context and long-term memory
  console.log('Generating enhanced context for a new query...');
  const query = 'Who founded Tesla and how does their range compare to other EVs?';
  
  const enhancedContext = await agentMemory.generateEnhancedContext(query);
  
  console.log('Enhanced Context:');
  console.log(`* Short-term memory messages: ${enhancedContext.messages.length}`);
  console.log(`* Relevant long-term memories: ${enhancedContext.relevantMemories.length}`);
  
  if (enhancedContext.relevantMemories.length > 0) {
    console.log('\nRetrieved relevant memories:');
    enhancedContext.relevantMemories.forEach((memory, index) => {
      console.log(`${index + 1}. ${memory.document.content} (Score: ${memory.score.toFixed(2)})`);
    });
  }

  // Use the enhanced context to generate a response
  console.log('\nGenerating response with enhanced context...');
  
  // In a real implementation, we would pass the enhanced context to the model
  // Here we'll simulate the model's response
  const simulatedResponse = `
Based on our conversation and my knowledge, I can tell you that Tesla was founded in 2003 by Martin Eberhard and Marc Tarpenning, although Elon Musk is often associated with the company as an early investor who later became CEO.

Regarding range, Tesla vehicles generally offer some of the best ranges in the EV market. Their premium models like the Model S Long Range can exceed 400 miles on a single charge, which is at the top end of the market. Most other EV manufacturers offer vehicles with ranges between 200-300 miles, though this is steadily improving across the industry as battery technology advances.
`;

  console.log('Response:');
  console.log(simulatedResponse);

  // Add this response to the memory for future context
  await agentMemory.addMessage({ role: 'assistant', content: simulatedResponse });

  // Demonstrate memory reflection
  console.log('\nDemonstrating memory reflection capability...');
  
  // Add several more messages to trigger reflection
  for (let i = 0; i < 5; i++) {
    await agentMemory.addMessage({ 
      role: i % 2 === 0 ? 'user' : 'assistant', 
      content: `This is message ${i + 1} to trigger reflection` 
    });
  }
  
  console.log('Memory reflection has been triggered automatically based on conversation length.');
  
  // Clear short-term memory but retain long-term memories
  console.log('\nClearing short-term memory...');
  agentMemory.clearShortTermMemory();
  
  // Retrieve memories based on a query after clearing short-term memory
  console.log('Retrieving memories after clearing short-term context...');
  const memories = await agentMemory.retrieveRelevantMemories('Tesla founder');
  
  console.log('Retrieved memories:');
  memories.forEach((memory, index) => {
    console.log(`${index + 1}. ${memory.document.content} (Score: ${memory.score.toFixed(2)})`);
  });
  
  console.log('\nEnhanced Agent Memory demonstration complete.');
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAgentMemoryExample().catch(console.error);
}

export { runAgentMemoryExample };
