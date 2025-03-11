/**
 * Agent Wizard Examples
 * Shows how to use Function Wizard to create and manage AI agents
 */

import { FunctionWizard } from '../utils/function-wizard.js';

// Create wizard instance with debug mode
const wizard = FunctionWizard.create({ debug: true });

// Example 1: Simple Research Agent
wizard.defineFunction('researchAgent')
  .description('AI Agent that performs web research on a given topic')
  .parameter('topic', 'string', 'Research topic to investigate', true)
  .parameter('depth', 'number', 'Research depth (1-5)', false)
  .parameter('format', 'string', 'Output format (summary/detailed/bullet)', false)
  .implement(async ({ topic, depth = 3, format = 'summary' }) => {
    // Simulated agent behavior
    const results = await simulateWebResearch(topic, depth);
    return formatResults(results, format);
  })
  .register();

// Example 2: Data Analysis Agent
wizard.defineFunction('analysisAgent')
  .description('AI Agent that analyzes data and provides insights')
  .parameter('data', 'string', 'JSON data to analyze', true)
  .parameter('metrics', 'string', 'Metrics to calculate (comma-separated)', true)
  .parameter('visualize', 'boolean', 'Generate visualizations', false)
  .implement(async ({ data, metrics, visualize = false }) => {
    const parsedData = JSON.parse(data);
    const metricsList = metrics.split(',').map(m => m.trim());
    return await analyzeData(parsedData, metricsList, visualize);
  })
  .register();

// Example 3: Conversational Agent
wizard.defineFunction('chatAgent')
  .description('AI Agent that maintains context and engages in conversation')
  .parameter('message', 'string', 'User message', true)
  .parameter('context', 'string', 'Previous conversation context', false)
  .parameter('personality', 'string', 'Agent personality type', false)
  .implement(async ({ message, context = '', personality = 'friendly' }) => {
    // Update conversation context
    const updatedContext = addToContext(context, message);
    // Generate response based on personality and context
    return await generateResponse(message, updatedContext, personality);
  })
  .register();

// Example 4: Task Automation Agent
wizard.defineFunction('automationAgent')
  .description('AI Agent that automates sequences of tasks')
  .parameter('tasks', 'string', 'JSON array of tasks to perform', true)
  .parameter('dependencies', 'string', 'JSON object of task dependencies', false)
  .parameter('parallel', 'boolean', 'Execute tasks in parallel if possible', false)
  .implement(async ({ tasks, dependencies = '{}', parallel = false }) => {
    const taskList = JSON.parse(tasks);
    const deps = JSON.parse(dependencies);
    return await executeTaskSequence(taskList, deps, parallel);
  })
  .register();

// Example 5: Learning Agent
wizard.defineFunction('learningAgent')
  .description('AI Agent that learns from interactions and improves over time')
  .parameter('input', 'string', 'Input data or query', true)
  .parameter('feedback', 'string', 'Previous interaction feedback', false)
  .parameter('modelPath', 'string', 'Path to trained model', false)
  .implement(async ({ input, feedback = '', modelPath = 'default' }) => {
    // Process input using current model
    const result = await processWithModel(input, modelPath);
    // Update model if feedback provided
    if (feedback) {
      await updateModel(modelPath, feedback);
    }
    return result;
  })
  .register();

// Helper functions (simulated)
async function simulateWebResearch(topic, depth) {
  return {
    mainFindings: `Key findings about ${topic}...`,
    sources: ['source1.com', 'source2.com'],
    confidence: depth * 20
  };
}

function formatResults(results, format) {
  switch (format) {
    case 'summary':
      return results.mainFindings;
    case 'detailed':
      return JSON.stringify(results, null, 2);
    case 'bullet':
      return `• Main Findings: ${results.mainFindings}\n• Sources: ${results.sources.join(', ')}`;
    default:
      return results;
  }
}

async function analyzeData(data, metrics, visualize) {
  const results = {
    summary: 'Data analysis summary...',
    metrics: metrics.map(m => ({
      name: m,
      value: Math.random() * 100
    }))
  };

  if (visualize) {
    results.charts = ['chart1.png', 'chart2.png'];
  }

  return results;
}

function addToContext(context, message) {
  const timestamp = new Date().toISOString();
  return context + `\n[${timestamp}] User: ${message}`;
}

async function generateResponse(message, context, personality) {
  const responses = {
    friendly: 'Thanks for your message! I understand you said...',
    professional: 'I appreciate your inquiry regarding...',
    casual: 'Hey there! About what you mentioned...'
  };

  return {
    response: responses[personality] || responses.friendly,
    updatedContext: context + `\n[${new Date().toISOString()}] Agent: ${responses[personality]}`
  };
}

async function executeTaskSequence(tasks, dependencies, parallel) {
  return {
    completed: tasks.map(t => ({
      task: t,
      status: 'completed',
      duration: Math.random() * 1000
    })),
    parallel: parallel,
    totalDuration: Math.random() * 5000
  };
}

async function processWithModel(input, modelPath) {
  return {
    output: `Processed ${input} using model at ${modelPath}`,
    confidence: Math.random(),
    modelVersion: '1.0.0'
  };
}

async function updateModel(modelPath, feedback) {
  return {
    status: 'updated',
    modelPath: modelPath,
    improvements: ['accuracy', 'response_time']
  };
}

// Example usage
async function runExamples() {
  try {
    // Research agent example
    const research = await wizard.execute('researchAgent', {
      topic: 'artificial intelligence trends',
      depth: 4,
      format: 'bullet'
    });
    console.log('Research Results:', research);

    // Analysis agent example
    const analysis = await wizard.execute('analysisAgent', {
      data: JSON.stringify([
        { value: 10, category: 'A' },
        { value: 20, category: 'B' }
      ]),
      metrics: 'mean,median,trend',
      visualize: true
    });
    console.log('Analysis Results:', analysis);

    // Chat agent example
    const chat = await wizard.execute('chatAgent', {
      message: 'Tell me about AI agents',
      personality: 'professional'
    });
    console.log('Chat Response:', chat);

    // Automation agent example
    const automation = await wizard.execute('automationAgent', {
      tasks: JSON.stringify(['fetch_data', 'analyze', 'report']),
      parallel: true
    });
    console.log('Automation Results:', automation);

    // Learning agent example
    const learning = await wizard.execute('learningAgent', {
      input: 'How to improve task efficiency?',
      feedback: 'Previous response was helpful'
    });
    console.log('Learning Agent Response:', learning);

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples
runExamples();
