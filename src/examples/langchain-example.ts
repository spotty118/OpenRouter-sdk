/**
 * LangChain Integration Example
 * 
 * This example demonstrates how to use the LangChain implementation 
 * which replaces CrewAI in the OpenRouter SDK.
 */

import { LangChain } from '../utils/langchain.js';
import { ProcessMode, TaskStatus } from '../interfaces/index.js';
import { VectorDBType } from '../interfaces/vector-db.js';

// Initialize LangChain
const langChain = new LangChain();

/**
 * Basic example showing a single agent and task
 */
async function basicExample() {
  console.log('=== Basic LangChain Example ===');

  try {
    // Create a research agent
    const researchAgent = langChain.createAgent({
      id: 'researcher',
      name: 'Research Specialist',
      description: 'Finds and analyzes information',
      model: 'anthropic/claude-3-opus',
      systemMessage: 'You are an expert research assistant specialized in finding accurate information.',
      temperature: 0.3,
      maxTokens: 2000
    });

    console.log(`Created agent: ${researchAgent.name} (${researchAgent.id})`);

    // Create a research task
    const researchTask = langChain.createTask({
      id: 'research-task',
      name: 'AI Trends Research',
      description: 'Research the latest trends in artificial intelligence and provide a summary of key developments.',
      assignedAgentId: 'researcher',
      expectedOutput: 'A comprehensive report on current AI trends and developments'
    });

    console.log(`Created task: ${researchTask.name} (${researchTask.id})`);

    // Execute the task
    console.log('Executing task...');
    const result = await langChain.executeTask(researchTask, researchAgent);

    console.log('Task completed with status:', result.status);
    console.log('Output:');
    console.log('---');
    console.log(result.output);
    console.log('---');

    return true;
  } catch (error) {
    console.error('Error in basic example:', error);
    return false;
  }
}

/**
 * Example showing workflow execution with multiple agents
 */
async function workflowExample() {
  console.log('\n=== LangChain Workflow Example ===');

  try {
    // Create agents
    const researchAgent = langChain.createAgent({
      id: 'researcher',
      name: 'Research Specialist',
      description: 'Finds and analyzes information',
      model: 'anthropic/claude-3-opus',
      systemMessage: 'You are an expert research assistant specialized in finding accurate information.',
      temperature: 0.3,
      maxTokens: 2000
    });

    const writerAgent = langChain.createAgent({
      id: 'writer',
      name: 'Content Writer',
      description: 'Creates engaging content',
      model: 'openai/gpt-4o',
      systemMessage: 'You are a skilled content writer who creates engaging, accurate content based on research.',
      temperature: 0.7,
      maxTokens: 2000
    });

    const editorAgent = langChain.createAgent({
      id: 'editor',
      name: 'Content Editor',
      description: 'Refines and improves content',
      model: 'anthropic/claude-3-haiku',
      systemMessage: 'You are an expert editor who refines and improves content for clarity, accuracy, and engagement.',
      temperature: 0.4,
      maxTokens: 1000
    });

    // Create tasks
    const researchTask = langChain.createTask({
      id: 'research-task',
      name: 'AI Trends Research',
      description: 'Research the latest trends in artificial intelligence and provide detailed notes on key developments.',
      assignedAgentId: 'researcher'
    });

    const writingTask = langChain.createTask({
      id: 'writing-task',
      name: 'AI Trends Article',
      description: 'Write an engaging article based on the research notes about AI trends.',
      assignedAgentId: 'writer',
      context: 'Use the research notes from the researcher to create an engaging article about AI trends.'
    });

    const editingTask = langChain.createTask({
      id: 'editing-task',
      name: 'AI Article Editing',
      description: 'Edit and improve the article about AI trends, focusing on clarity, accuracy, and engagement.',
      assignedAgentId: 'editor'
    });

    // Create workflow
    const contentWorkflow = langChain.createWorkflow({
      id: 'ai-content-workflow',
      name: 'AI Content Creation',
      tasks: [researchTask, writingTask, editingTask],
      dependencies: {
        'writing-task': ['research-task'],
        'editing-task': ['writing-task']
      },
      processMode: ProcessMode.HIERARCHICAL
    });

    console.log(`Created workflow: ${contentWorkflow.name} with ${contentWorkflow.tasks.length} tasks`);

    // Execute workflow with task callbacks
    console.log('Executing workflow...');
    const results = await langChain.executeWorkflow(
      contentWorkflow,
      {
        'researcher': researchAgent,
        'writer': writerAgent,
        'editor': editorAgent
      },
      {
        processMode: ProcessMode.HIERARCHICAL
      },
      {
        onTaskStart: (taskId, agentId) => {
          console.log(`Starting task: ${taskId} with agent: ${agentId}`);
        },
        onTaskComplete: (result) => {
          console.log(`Completed task: ${result.taskId} with status: ${result.status}`);
        },
        onTaskError: (taskId, error) => {
          console.error(`Error in task: ${taskId}:`, error);
        }
      }
    );

    // Display results
    console.log('\nWorkflow Results:');
    for (const [taskId, result] of Object.entries(results)) {
      console.log(`\nTask: ${taskId}`);
      console.log(`Status: ${result.status}`);
      console.log(`Output (first 100 chars): ${result.output.substring(0, 100)}...`);
    }

    return true;
  } catch (error) {
    console.error('Error in workflow example:', error);
    return false;
  }
}

/**
 * Example showing a crew of agents working together
 */
async function crewExample() {
  console.log('\n=== LangChain Crew Example ===');

  try {
    // Create agents
    const researchAgent = langChain.createAgent({
      id: 'researcher',
      name: 'Research Specialist',
      description: 'Finds and analyzes information',
      model: 'anthropic/claude-3-opus',
      systemMessage: 'You are an expert research assistant specialized in finding accurate information.',
      temperature: 0.3,
      maxTokens: 2000
    });

    const writerAgent = langChain.createAgent({
      id: 'writer',
      name: 'Content Writer',
      description: 'Creates engaging content',
      model: 'openai/gpt-4o',
      systemMessage: 'You are a skilled content writer who creates engaging, accurate content based on research.',
      temperature: 0.7,
      maxTokens: 2000
    });

    const editorAgent = langChain.createAgent({
      id: 'editor',
      name: 'Content Editor',
      description: 'Refines and improves content',
      model: 'anthropic/claude-3-haiku',
      systemMessage: 'You are an expert editor who refines and improves content for clarity, accuracy, and engagement.',
      temperature: 0.4,
      maxTokens: 1000
    });

    // Create crew
    const contentCrew = langChain.createCrew({
      id: 'content-crew',
      name: 'Content Creation Team',
      description: 'A team of specialists who create high-quality content',
      agents: [researchAgent, writerAgent, editorAgent],
      processMode: ProcessMode.SEQUENTIAL,
      verbose: true,
      failureHandling: {
        continueOnFailure: false,
        maxRetries: 2
      }
    });

    console.log(`Created crew: ${contentCrew.name} with ${contentCrew.agents.length} agents`);

    // Create tasks
    const researchTask = langChain.createTask({
      id: 'research-task',
      name: 'AI Trends Research',
      description: 'Research the latest trends in artificial intelligence and provide detailed notes on key developments.',
      assignedAgentId: 'researcher'
    });

    const writingTask = langChain.createTask({
      id: 'writing-task',
      name: 'AI Trends Article',
      description: 'Write an engaging article based on the research notes about AI trends.',
      assignedAgentId: 'writer',
      context: 'Use the research notes from the researcher to create an engaging article about AI trends.'
    });

    const editingTask = langChain.createTask({
      id: 'editing-task',
      name: 'AI Article Editing',
      description: 'Edit and improve the article about AI trends, focusing on clarity, accuracy, and engagement.',
      assignedAgentId: 'editor'
    });

    // Run the crew
    console.log('Running crew...');
    const status = await langChain.runCrew(
      contentCrew,
      [researchTask, writingTask, editingTask],
      {
        processMode: ProcessMode.SEQUENTIAL
      },
      {
        onTaskStart: (taskId, agentId) => {
          console.log(`Starting task: ${taskId} with agent: ${agentId}`);
        },
        onTaskComplete: (result) => {
          console.log(`Completed task: ${result.taskId} with status: ${result.status}`);
        },
        onTaskError: (taskId, error) => {
          console.error(`Error in task: ${taskId}:`, error);
        }
      }
    );

    // Display results
    console.log('\nCrew Run Status:', status.status);
    console.log(`Started: ${status.startTime}`);
    console.log(`Ended: ${status.endTime}`);

    console.log('\nTask Results:');
    for (const [taskId, result] of Object.entries(status.taskResults)) {
      console.log(`\nTask: ${taskId}`);
      console.log(`Status: ${result.status}`);
      console.log(`Output (first 100 chars): ${result.output.substring(0, 100)}...`);
    }

    return true;
  } catch (error) {
    console.error('Error in crew example:', error);
    return false;
  }
}

/**
 * Example showing vector search and knowledge management
 */
async function knowledgeExample() {
  console.log('\n=== LangChain Knowledge Management Example ===');

  try {
    // Create an agent with vector database
    const researchAgent = langChain.createAgent({
      id: 'researcher',
      name: 'Research Specialist',
      description: 'Finds and analyzes information',
      model: 'anthropic/claude-3-opus',
      systemMessage: 'You are an expert research assistant specialized in finding accurate information.',
      temperature: 0.3,
      maxTokens: 2000,
      memory: {
        vectorDb: {
          type: VectorDBType.IN_MEMORY,
          dimensions: 1536
        }
      }
    });

    console.log(`Created agent: ${researchAgent.name} with vector database memory`);

    // Add documents to agent's knowledge base
    const docIds = await langChain.addKnowledgeBatch(
      'researcher',
      [
        {
          id: 'ai-trends-1',
          content: 'Generative AI is transforming industries by enabling automation of creative tasks. Companies are rapidly adopting AI solutions to improve productivity and create new products.',
          metadata: { source: 'research-report', topic: 'ai-trends' }
        },
        {
          id: 'ai-trends-2',
          content: 'Multimodal AI systems that can process and generate text, images, audio, and video are becoming increasingly sophisticated. These systems can understand and create content across different formats.',
          metadata: { source: 'market-analysis', topic: 'ai-trends' }
        },
        {
          id: 'ai-ethics',
          content: 'AI ethics is becoming a critical consideration as AI systems become more pervasive. Issues of bias, privacy, transparency, and accountability need to be addressed to ensure AI benefits everyone.',
          metadata: { source: 'policy-paper', topic: 'ai-ethics' }
        }
      ]
    );

    console.log(`Added ${docIds.length} documents to knowledge base`);

    // Search the knowledge base
    console.log('\nSearching for information about multimodal AI...');
    const searchResults = await langChain.searchKnowledge(
      'researcher',
      'multimodal AI systems',
      { limit: 3 }
    );

    console.log(`Found ${searchResults.length} results`);
    searchResults.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log(`Score: ${result.score}`);
      console.log(`Content: ${result.document.content}`);
      console.log(`Metadata: ${JSON.stringify(result.document.metadata)}`);
    });

    // Create a task with relevant context from the knowledge base
    const researchTask = langChain.createTask({
      id: 'multimodal-ai-research',
      name: 'Multimodal AI Research',
      description: 'Provide a detailed analysis of multimodal AI systems and their applications.',
      assignedAgentId: 'researcher',
      // Use the relevant search result as context
      context: searchResults[0].document.content
    });

    console.log('\nExecuting task with knowledge context...');
    const result = await langChain.executeTask(researchTask, researchAgent);

    console.log('Task completed with status:', result.status);
    console.log('Output:');
    console.log('---');
    console.log(result.output);
    console.log('---');

    return true;
  } catch (error) {
    console.error('Error in knowledge example:', error);
    return false;
  }
}

// Main function to run all examples
async function runLangChainExamples() {
  try {
    console.log('Running LangChain Examples...\n');

    // Check if API keys are set
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.log('WARNING: OPENROUTER_API_KEY not set, examples will not make actual API calls\n');
    }

    // Run the examples
    await basicExample();
    await workflowExample();
    await crewExample();
    await knowledgeExample();

    console.log('\nLangChain Examples completed!');
  } catch (error) {
    console.error('Error running LangChain examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runLangChainExamples().catch(console.error);
}

export { runLangChainExamples, basicExample, workflowExample, crewExample, knowledgeExample };
