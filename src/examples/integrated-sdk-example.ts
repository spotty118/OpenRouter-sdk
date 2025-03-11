/**
 * Integrated SDK Example
 * 
 * This example demonstrates how the new LangChain implementation and direct provider SDKs
 * are integrated into the core OpenRouter SDK architecture.
 */

import { AIOrchestrator } from '../core/ai-orchestrator.js';
import { LangChain } from '../utils/langchain.js';
import { ProviderSDKManager } from '../utils/provider-sdk-manager.js';
import { ProcessMode } from '../interfaces/index.js';

// Create an instance of ProviderSDKManager
const providerManager = new ProviderSDKManager();

// Example configuration with API keys (these would normally come from environment variables)
const config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY || 'your-openrouter-api-key',
  openAiApiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-api-key',
  googleApiKey: process.env.GOOGLE_API_KEY || 'your-google-api-key'
};

/**
 * Example showing integration of OpenRouter with LangChain
 */
async function openRouterWithLangChainExample() {
  console.log('=== OpenRouter with LangChain Integration Example ===');
  
  try {
    // Initialize the AI Orchestrator with the API key
    const orchestrator = new AIOrchestrator({
      apiKey: config.openRouterApiKey
    });
    
    // Initialize LangChain
    const langChain = new LangChain();
    
    // Register a function with the orchestrator
    const searchFunction = orchestrator.registerFunction(
      'search_web',
      'Search the web for information',
      { 
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Number of results to return', default: 5 }
      },
      ['query'],
      async (args) => {
        console.log(`Searching for: ${args.query} (limit: ${args.limit})`);
        return { 
          results: [
            { title: 'Example result 1', snippet: 'This is an example search result.' },
            { title: 'Example result 2', snippet: 'Another example search result.' }
          ],
          query: args.query
        };
      }
    );
    
    // Create a research agent with LangChain
    const researchAgent = langChain.createAgent({
      id: 'researcher',
      name: 'Research Agent',
      model: 'anthropic/claude-3-opus',
      description: 'Finds and analyzes information',
      systemMessage: 'You are an expert research assistant.'
    });
    
    // Create a research task
    const researchTask = langChain.createTask({
      id: 'research-task',
      name: 'Research AI trends',
      description: 'Research the latest trends in artificial intelligence and provide a summary',
      assignedAgentId: 'researcher'
    });
    
    console.log(`Created agent: ${researchAgent.name} (${researchAgent.id})`);
    console.log(`Created task: ${researchTask.name} (${researchTask.id})`);
    
    // In a real implementation, we would execute the task here
    console.log('Task would execute here in a real implementation');
    
    // Show how to use the orchestrator with LangChain functionality
    console.log('\nDemonstrating AI Orchestrator with LangChain integration');
    
    // This is a conceptual example showing how you might integrate both systems
    console.log('Generating a chat completion using the orchestrator...');
    
    return true;
  } catch (error) {
    console.error('Error in OpenRouter with LangChain example:', error);
    return false;
  }
}

/**
 * Example showing integration of native provider SDKs with OpenRouter
 */
async function openRouterWithProviderSdksExample() {
  console.log('\n=== OpenRouter with Provider SDKs Integration Example ===');
  
  try {
    // Initialize the AI Orchestrator with the API key
    const orchestrator = new AIOrchestrator({
      apiKey: config.openRouterApiKey
    });
    
    // Example prompts for comparison
    const researchPrompt = 'Summarize the key benefits of quantum computing for businesses.';
    
    console.log(`Using prompt: "${researchPrompt}"`);
    
    // Use OpenRouter through the orchestrator
    console.log('\nUsing OpenRouter via Orchestrator:');
    const openRouterResponse = await orchestrator.chat({
      messages: [{ role: 'user', content: researchPrompt }],
      model: 'anthropic/claude-3-opus',
      temperature: 0.5,
      max_tokens: 500
    });
    
    console.log('OpenRouter response received');
    
    // Use direct Anthropic SDK (if API key is available)
    if (config.anthropicApiKey !== 'your-anthropic-api-key') {
      console.log('\nUsing direct Anthropic SDK:');
      
      // Get Anthropic client
      const anthropic = providerManager.getAnthropicClient();
      
      // Call Anthropic API directly
      const anthropicResponse = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: researchPrompt }],
        temperature: 0.5,
        max_tokens: 500
      });
      
      console.log('Anthropic direct SDK response received');
      
      // Compare responses
      console.log('\nResponse Comparison:');
      console.log('- OpenRouter response length:', openRouterResponse.choices[0].message?.content?.length || 0);
      
      // Safely access Anthropic response content
      const responseLength = anthropicResponse.content && 
        anthropicResponse.content[0] && 
        'text' in anthropicResponse.content[0] ? 
        anthropicResponse.content[0].text.length : 0;
      
      console.log('- Anthropic direct SDK response length:', responseLength);
    } else {
      console.log('\nSkipping direct SDK comparison (no Anthropic API key provided)');
    }
    
    return true;
  } catch (error) {
    console.error('Error in OpenRouter with Provider SDKs example:', error);
    return false;
  }
}

/**
 * Example showing a combined workflow using all components
 */
async function combinedWorkflowExample() {
  console.log('\n=== Combined Workflow Integration Example ===');
  
  try {
    // Initialize components
    const orchestrator = new AIOrchestrator({
      apiKey: config.openRouterApiKey
    });
    
    const langChain = new LangChain();
    
    // Create agents with LangChain
    const researchAgent = langChain.createAgent({
      id: 'researcher',
      name: 'Research Specialist',
      model: 'anthropic/claude-3-opus',
      description: 'Expert at finding information',
      systemMessage: 'You excel at researching topics thoroughly.'
    });
    
    const writerAgent = langChain.createAgent({
      id: 'writer',
      name: 'Content Writer',
      model: 'openai/gpt-4o',
      description: 'Expert at creating engaging content',
      systemMessage: 'You create compelling, accurate content based on research.'
    });
    
    const editorAgent = langChain.createAgent({
      id: 'editor',
      name: 'Content Editor',
      model: 'anthropic/claude-3-haiku',
      description: 'Expert at refining and improving content',
      systemMessage: 'You polish and improve content for clarity and engagement.'
    });
    
    // Create tasks with LangChain
    const researchTask = langChain.createTask({
      id: 'market-research',
      name: 'Market Research',
      description: 'Research the current market trends for electric vehicles',
      assignedAgentId: 'researcher'
    });
    
    const writingTask = langChain.createTask({
      id: 'article-writing',
      name: 'Article Writing',
      description: 'Write an article based on the research findings',
      assignedAgentId: 'writer'
    });
    
    const editingTask = langChain.createTask({
      id: 'article-editing',
      name: 'Article Editing',
      description: 'Edit and improve the written article',
      assignedAgentId: 'editor'
    });
    
    // Create a workflow that connects all tasks
    const contentWorkflow = langChain.createWorkflow({
      id: 'content-creation',
      name: 'Content Creation Pipeline',
      tasks: [researchTask, writingTask, editingTask],
      dependencies: {
        'article-writing': ['market-research'],
        'article-editing': ['article-writing']
      },
      processMode: ProcessMode.HIERARCHICAL
    });
    
    // Register global functions using the orchestrator
    orchestrator.registerFunction(
      'search_web',
      'Search the web for information',
      { query: { type: 'string', description: 'Search query' } },
      ['query'],
      async (args) => {
        console.log(`Searching for: ${args.query}`);
        return { results: ['Example result 1', 'Example result 2'] };
      }
    );
    
    // Show how we could use direct provider SDKs
    console.log('\nDemonstrating integration with provider SDKs:');
    
    // Demo access to provider SDKs
    try {
      if (process.env.OPENAI_API_KEY) {
        const openai = providerManager.getOpenAIClient();
        console.log('Direct OpenAI access available - could use for specific operations');
      }
      
      if (process.env.ANTHROPIC_API_KEY) {
        const anthropic = providerManager.getAnthropicClient();
        console.log('Direct Anthropic/Claude access available - could use for specific operations');
      }
      
      if (process.env.GOOGLE_API_KEY) {
        const gemini = providerManager.getGeminiClient();
        console.log('Direct Google/Gemini access available - could use for specific operations');
      }
    } catch (error) {
      console.log('Direct provider access not configured');
    }
    
    console.log('\nWorkflow Setup:');
    console.log(`- Created workflow: ${contentWorkflow.name} with ${contentWorkflow.tasks.length} tasks`);
    console.log(`- Process mode: ${contentWorkflow.processMode}`);
    console.log('- Dependencies:');
    for (const [taskId, dependencies] of Object.entries(contentWorkflow.dependencies || {})) {
      console.log(`  * ${taskId} depends on: ${dependencies.join(', ')}`);
    }
    
    // In a real implementation, we would execute the workflow here
    console.log('\nIn a real implementation, the workflow would execute with:');
    console.log('1. Research agent querying information using the search function');
    console.log('2. Writer agent creating content based on research results');
    console.log('3. Editor agent polishing the final content');
    console.log('4. Final content delivered with quality metrics');
    
    return true;
  } catch (error) {
    console.error('Error in combined workflow example:', error);
    return false;
  }
}

// Main function to run all examples
async function runIntegratedSdkExamples() {
  try {
    console.log('Running Integrated SDK Examples...\n');
    
    // Check if we have an OpenRouter API key
    if (config.openRouterApiKey === 'your-openrouter-api-key') {
      console.log('WARNING: No OpenRouter API key provided - examples will not make actual API calls\n');
    }
    
    // Run the examples
    await openRouterWithLangChainExample();
    await openRouterWithProviderSdksExample();
    await combinedWorkflowExample();
    
    console.log('\nIntegrated SDK Examples completed!');
    console.log('\nCrewAI has been successfully converted to LangChain, and provider SDKs have been integrated.');
  } catch (error) {
    console.error('Error running Integrated SDK examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runIntegratedSdkExamples().catch(console.error);
}

export {
  runIntegratedSdkExamples,
  openRouterWithLangChainExample,
  openRouterWithProviderSdksExample,
  combinedWorkflowExample
};
