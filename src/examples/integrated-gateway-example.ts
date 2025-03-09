/**
 * Integrated Gateway Example
 * 
 * This example demonstrates how the EndpointRouter gateway can be used
 * with other OpenRouter SDK features like CrewAI and vector databases.
 */

import { EndpointRouter, EndpointConfig } from '../core/endpoint-router.js';
import { ProviderManager } from '../utils/provider-manager.js';
import { ProviderType } from '../interfaces/provider.js';
import { ProcessMode } from '../interfaces/crew-ai.js';

/**
 * Example showing how to integrate the endpoint router with other SDK features
 */
async function main() {
  console.log('OpenRouter SDK Integrated Gateway Example');
  console.log('----------------------------------------\n');

  // ------------- SETUP GATEWAY -------------

  // Define provider configurations for direct access
  const providerManager = new ProviderManager({
    openai: {
      apiKey: 'OPENAI_API_KEY'
    },
    gemini: {
      apiKey: 'GEMINI_API_KEY'
    },
    anthropic: {
      apiKey: 'ANTHROPIC_API_KEY'
    }
  });

  // Define endpoints
  const endpoints: Record<string, EndpointConfig> = {
    'openrouter': {
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'OPENROUTER_API_KEY',
      type: 'openrouter'
    },
    'openai': {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'OPENAI_API_KEY',
      type: 'openai'
    },
    'anthropic': {
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: 'ANTHROPIC_API_KEY',
      type: 'anthropic'
    }
  };

  // Create endpoint router
  const gateway = new EndpointRouter({
    defaultEndpointId: 'openrouter',
    endpoints,
    providerManager,
    logLevel: 'info'
  });

  // ------------- FEATURE 1: CREWAI WITH ENDPOINT GATEWAY -------------

  console.log('Example 1: Using CrewAI with different endpoints');
  console.log('------------------------------------------------');
  
  // Create a vector database for agent memory
  console.log('Creating vector database for agent memory...');
  const vectorDb = {
    dimensions: 1536,
    maxVectors: 10000,
    addDocument: async (doc: any) => {
      console.log(`Added document: ${doc.id} to vector database`);
      return true;
    },
    search: async (query: any) => {
      console.log(`Searched for documents similar to query`);
      return [
        { id: 'doc1', score: 0.92, content: 'Tesla is leading in EV sales globally' },
        { id: 'doc2', score: 0.85, content: 'BYD has increased market share significantly' }
      ];
    }
  };
  
  // Create agents with different endpoints
  console.log('Creating a crew with different endpoint configurations...');
  const researcherAgent = {
    id: 'researcher',
    name: 'Research Specialist',
    description: 'Expert at finding information',
    model: 'anthropic/claude-3-sonnet',
    systemMessage: 'You are a research specialist who excels at finding accurate information.',
    endpoint: 'anthropic' // Using direct Anthropic endpoint
  };
  
  const writerAgent = {
    id: 'writer',
    name: 'Content Writer',
    description: 'Writes high-quality content based on research',
    model: 'openai/gpt-4o',
    systemMessage: 'You are a skilled content writer who creates engaging content.',
    endpoint: 'openai' // Using direct OpenAI endpoint
  };
  
  const editorAgent = {
    id: 'editor',
    name: 'Content Editor',
    description: 'Edits and improves content',
    model: 'meta-llama/llama-3-70b-instruct',
    systemMessage: 'You are an editor who improves content quality and accuracy.',
    endpoint: 'openrouter' // Using OpenRouter for this model
  };
  
  // Create tasks
  console.log('Creating tasks for the agents...');
  const researchTask = {
    id: 'research-task',
    name: 'Research Electric Vehicles',
    description: 'Research the current state of electric vehicles market',
    assignedAgentId: 'researcher',
    expectedOutput: 'A comprehensive report on EV market trends and statistics'
  };
  
  const writingTask = {
    id: 'writing-task',
    name: 'Write Article',
    description: 'Write an engaging article about electric vehicles',
    assignedAgentId: 'writer',
    expectedOutput: 'A well-written article about EVs'
  };
  
  const editingTask = {
    id: 'editing-task',
    name: 'Edit Article',
    description: 'Edit and improve the EV article',
    assignedAgentId: 'editor',
    expectedOutput: 'A polished, error-free article ready for publication'
  };
  
  // Create workflow
  console.log('Creating workflow with dependencies...');
  const workflow = {
    id: 'content-workflow',
    name: 'Research and Write Content',
    tasks: [researchTask, writingTask, editingTask],
    dependencies: {
      'writing-task': ['research-task'],
      'editing-task': ['writing-task']
    },
    processMode: ProcessMode.SEQUENTIAL
  };
  
  // Executing a task would look like this:
  console.log('\nExecuting task with different endpoints:');
  console.log('1. For the researcher agent');
  console.log(`   - Using Anthropic API endpoint for model: ${researcherAgent.model}`);
  
  /*
  // The actual code would look like this:
  async function executeAgentTask(task, agent) {
    // Use the gateway with the agent's selected endpoint
    const response = await gateway.createChatCompletion({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.systemMessage },
        { role: 'user', content: task.description }
      ]
    }, {
      endpointId: agent.endpoint // Use agent's specified endpoint
    });
    
    return response.choices[0].message.content;
  }
  
  // Execute the research task
  const researchResult = await executeAgentTask(researchTask, researcherAgent);
  console.log('Research Task Result:', researchResult);
  
  // Continue with writing task using a different endpoint
  const writingResult = await executeAgentTask(writingTask, writerAgent);
  console.log('Writing Task Result:', writingResult);
  */
  
  console.log('Simulated research result using Anthropic endpoint');
  console.log('Simulated writing result using OpenAI endpoint');
  console.log('Simulated editing result using OpenRouter endpoint');
  
  // ------------- FEATURE 2: VECTOR DATABASE WITH ENDPOINT GATEWAY -------------
  
  console.log('\n\nExample 2: Using Vector Database with different endpoints');
  console.log('----------------------------------------------------------');
  
  console.log('Creating document embeddings with different providers:');
  
  // Sample document
  const document = {
    id: 'doc1',
    content: 'Electric vehicles are becoming increasingly popular worldwide.'
  };
  
  // Generate embeddings using different endpoints
  console.log('\n1. Using OpenAI endpoint for embeddings:');
  /*
  // In a real implementation:
  const openaiEmbedding = await gateway.createEmbedding({
    model: 'openai/text-embedding-3-small',
    input: document.content
  }, {
    endpointId: 'openai' // Use OpenAI endpoint
  });
  
  // Store in vector database
  await vectorDb.addDocument({
    id: document.id,
    content: document.content,
    embedding: openaiEmbedding.data[0].embedding
  });
  */
  console.log('Generated embedding with OpenAI endpoint');
  console.log('Stored document with embedding in vector database');
  
  console.log('\n2. Using different endpoint for query embeddings:');
  /*
  // Generate query embedding using different provider
  const query = "Tell me about electric cars";
  const queryEmbedding = await gateway.createEmbedding({
    model: 'google/text-embedding-gecko',
    input: query
  }, {
    endpointId: 'gemini' // Use Gemini endpoint
  });
  
  // Search using the embedding
  const searchResults = await vectorDb.search({
    embedding: queryEmbedding.data[0].embedding,
    limit: 5
  });
  */
  console.log('Generated query embedding with Gemini endpoint');
  console.log('Searched vector database using the embedding');
  console.log('Matched documents: doc1, doc2');
  
  // ------------- FEATURE 3: FUNCTION CALLING WITH ENDPOINT GATEWAY -------------
  
  console.log('\n\nExample 3: Function Calling with different endpoints');
  console.log('----------------------------------------------------');
  
  // Define functions
  const weatherFunction = {
    name: 'get_weather',
    description: 'Get the current weather in a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state, e.g. San Francisco, CA'
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'The temperature unit to use'
        }
      },
      required: ['location']
    }
  };
  
  console.log('Using function calling with OpenAI endpoint:');
  
  /*
  // In a real implementation:
  const functionCallResult = await gateway.createChatCompletion({
    model: 'openai/gpt-4o',
    messages: [
      { role: 'user', content: 'What\'s the weather like in San Francisco?' }
    ],
    functions: [weatherFunction],
    function_call: 'auto'
  }, {
    endpointId: 'openai' // Use OpenAI endpoint
  });
  
  // Handle the function call
  if (functionCallResult.choices[0].message.function_call) {
    const functionCall = functionCallResult.choices[0].message.function_call;
    const functionArgs = JSON.parse(functionCall.arguments);
    
    // Call the actual weather API
    const weatherData = await getWeatherData(functionArgs.location, functionArgs.unit);
    
    // Continue the conversation with the result
    const finalResult = await gateway.createChatCompletion({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'user', content: 'What\'s the weather like in San Francisco?' },
        { 
          role: 'assistant', 
          content: null,
          function_call: functionCall
        },
        {
          role: 'function',
          name: 'get_weather',
          content: JSON.stringify(weatherData)
        }
      ]
    }, {
      endpointId: 'openai' // Use OpenAI endpoint
    });
    
    console.log(finalResult.choices[0].message.content);
  }
  */
  
  console.log('Function call: get_weather(location: "San Francisco", unit: "celsius")');
  console.log('Function response: "68°F, partly cloudy"');
  console.log('Final response: "The weather in San Francisco is currently 68°F (20°C) and partly cloudy."');
  
  // ------------- BENEFITS OF THE GATEWAY ARCHITECTURE -------------
  
  console.log('\n\n--------------------------------------------------');
  console.log('Benefits of the Gateway Architecture with SDK Integration:');
  console.log('1. Use different endpoints for different agents in CrewAI');
  console.log('2. Generate embeddings with any provider but use same vector database');
  console.log('3. Use function calling capabilities with any compatible endpoint');
  console.log('4. Full compatibility with all SDK features while having endpoint flexibility');
  console.log('5. Easy provider switching without changing application code');
  console.log('--------------------------------------------------');
}

// Run the examples
if (require.main === module) {
  main().catch(console.error);
}

export default main;
