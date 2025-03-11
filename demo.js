/**
 * Demo script for OpenRouter SDK with advanced features
 * 
 * This script showcases the enhanced capabilities added to the SDK,
 * particularly the advanced agent memory system and streamlined CrewAI
 * agent orchestration. It connects with the UI to demonstrate functionality.
 */

/**
 * Real implementation of agent orchestration and memory systems
 * These connect to OpenRouter API endpoints for AI model access
 */

// Define memory types
const MemoryType = {
  Hybrid: 'hybrid',
  ShortTerm: 'shortTerm',
  LongTerm: 'longTerm'
};

// Define vector DB types
const VectorDBType = {
  InMemory: 'inMemory',
  Pinecone: 'pinecone',
  Milvus: 'milvus'
};

/**
 * Agent Memory System Implementation
 * Provides context-aware memory capabilities for AI agents
 */
class AgentMemory {
  constructor(agentId, config) {
    this.agentId = agentId;
    this.config = config;
    this.shortTermMemory = [];
    this.longTermMemory = [];
    this.apiKey = config.apiKey || (typeof localStorage !== 'undefined' ? 
      localStorage.getItem('openrouter_api_key') : null);
    
    // Initialize vector storage based on config
    this.vectorDb = this._initializeVectorDb(config.vectorDb);
    
    console.log(`Agent Memory system initialized for agent: ${agentId}`);
  }
  
  /**
   * Initialize the vector database for semantic storage
   * @param {Object} config - Vector DB configuration
   * @returns {Object} - Initialized vector DB object
   */
  _initializeVectorDb(config) {
    // For now, we'll use a simple in-memory implementation
    // In production, this would connect to a real vector DB
    return {
      type: config.type || VectorDBType.InMemory,
      dimensions: config.dimensions || 1536,
      items: [],
      
      // Add a vector to the store
      async addVector(embedding, metadata, content) {
        this.items.push({
          embedding: embedding,
          metadata: metadata,
          content: content
        });
        return true;
      },
      
      // Simple vector similarity search
      async search(queryVector, limit = 5) {
        // In a real implementation, this would do proper vector similarity
        return this.items.slice(0, limit).map(item => ({
          document: { content: item.content },
          metadata: item.metadata,
          score: 0.9 // Mocked similarity score
        }));
      }
    };
  }
  
  /**
   * Generate embeddings for semantic search
   * @param {string} text - Text to embed
   * @returns {Promise<Array>} - Vector embedding
   */
  async _generateEmbedding(text) {
    if (!this.apiKey || this.apiKey === 'demo-mode') {
      // Mock embedding for demo mode
      return Array(1536).fill(0).map(() => Math.random());
    }
    
    try {
      // Real implementation using OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'openai/text-embedding-ada-002',
          input: text
        })
      });
      
      const data = await response.json();
      if (data.error) {
        console.error('Embedding error:', data.error);
        throw new Error(data.error.message || 'Failed to generate embedding');
      }
      
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fallback to mock embedding
      return Array(1536).fill(0).map(() => Math.random());
    }
  }
  
  /**
   * Store a memory in the long-term storage
   * @param {string} content - Content to store
   * @param {string} type - Type of memory (fact, rule, etc.)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<boolean>} - Success status
   */
  async storeMemory(content, type, metadata) {
    try {
      // Generate embedding for the content
      const embedding = await this._generateEmbedding(content);
      
      // Store in vector DB
      await this.vectorDb.addVector(embedding, { type, ...metadata }, content);
      
      // Add to long-term memory list
      this.longTermMemory.push({
        content,
        type,
        metadata,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error storing memory:', error);
      return false;
    }
  }
  
  /**
   * Add a conversation message to short-term memory
   * @param {Object} message - Message object with role and content
   * @returns {Promise<boolean>} - Success status
   */
  async addMessage(message) {
    try {
      // Add to short-term memory
      this.shortTermMemory.push({
        ...message,
        timestamp: new Date().toISOString()
      });
      
      // Apply memory retention policy
      this._applyRetentionPolicy();
      
      return true;
    } catch (error) {
      console.error('Error adding message:', error);
      return false;
    }
  }
  
  /**
   * Apply retention policy to short-term memory
   */
  _applyRetentionPolicy() {
    const { messageLimit } = this.config.retention || { messageLimit: 10 };
    
    // Trim to message limit if needed
    if (this.shortTermMemory.length > messageLimit) {
      // In a real implementation, this would use the configured removal strategy
      // For now, just remove oldest messages
      this.shortTermMemory = this.shortTermMemory.slice(-messageLimit);
    }
  }
  
  /**
   * Generate enhanced context for a query by retrieving relevant memories
   * @param {string} query - The query to find relevant context for
   * @returns {Promise<Object>} - Context object with messages and memories
   */
  async generateEnhancedContext(query) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this._generateEmbedding(query);
      
      // Search for relevant memories
      const relevantMemories = await this.vectorDb.search(queryEmbedding, 5);
      
      return {
        messages: this.shortTermMemory,
        relevantMemories: relevantMemories
      };
    } catch (error) {
      console.error('Error generating context:', error);
      // Return minimal context on error
      return {
        messages: this.shortTermMemory,
        relevantMemories: [{
          document: {
            content: 'OpenRouter is a unified API for accessing AI models from different providers.'
          }
        }]
      };
    }
  }
}

/**
 * AI Orchestration Implementation
 * Manages multi-agent systems and workflows
 */
class AIOrchestrator {
  constructor(config) {
    this.config = config;
    this.apiKey = config.apiKey || (typeof localStorage !== 'undefined' ? 
      localStorage.getItem('openrouter_api_key') : null);
    this.agents = new Map();
    this.workflows = new Map();
    
    console.log('AI Orchestrator initialized');
  }
  
  /**
   * Register an agent in the orchestration system
   * @param {Object} agentConfig - Agent configuration
   * @returns {string} - Agent ID
   */
  registerAgent(agentConfig) {
    const { id, name, description, model } = agentConfig;
    
    // Create agent object
    const agent = {
      id,
      name,
      description,
      model,
      memory: new AgentMemory(id, {
        memoryType: MemoryType.Hybrid,
        retention: { messageLimit: 10 },
        vectorDb: { type: VectorDBType.InMemory, dimensions: 1536 },
        apiKey: this.apiKey
      }),
      status: 'idle'
    };
    
    // Store agent
    this.agents.set(id, agent);
    
    return id;
  }
  
  /**
   * Define a workflow between agents
   * @param {Object} workflowConfig - Workflow configuration
   * @returns {string} - Workflow ID
   */
  defineWorkflow(workflowConfig) {
    const { id, name, steps } = workflowConfig;
    
    // Create workflow object
    const workflow = {
      id,
      name,
      steps,
      status: 'defined'
    };
    
    // Store workflow
    this.workflows.set(id, workflow);
    
    return id;
  }
  
  /**
   * Execute a chat completion with a specified agent
   * @param {string} agentId - Agent ID
   * @param {Array} messages - Chat messages
   * @returns {Promise<Object>} - Chat completion response
   */
  async executeAgentChat(agentId, messages) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (!this.apiKey || this.apiKey === 'demo-mode') {
      // Return mock response in demo mode
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: agent.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: `This is a demo response from ${agent.name} (${agent.id})\n\nI would analyze the following information and provide insights based on my role as ${agent.description}.`
          }
        }]
      };
    }
    
    try {
      // Real implementation using OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'OpenRouter SDK Demo'
        },
        body: JSON.stringify({
          model: agent.model,
          messages: messages
        })
      });
      
      const data = await response.json();
      if (data.error) {
        console.error('Chat completion error:', data.error);
        throw new Error(data.error.message || 'Chat completion failed');
      }
      
      return data;
    } catch (error) {
      console.error(`Error executing chat with agent ${agentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a workflow with the given input
   * @param {string} workflowId - Workflow ID
   * @param {Object} input - Input data for the workflow
   * @returns {Promise<Object>} - Workflow execution result
   */
  async executeWorkflow(workflowId, input) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    console.log(`Starting workflow: ${workflow.name} (${workflowId})`);
    workflow.status = 'running';
    
    // Process each step in sequence
    let stepOutput = input;
    const results = [];
    
    for (const step of workflow.steps) {
      console.log(`Executing step: ${step.name} with agent ${step.agentId}`);
      
      try {
        // Prepare messages for this step
        const messages = [
          {
            role: 'system',
            content: `You are ${this.agents.get(step.agentId).name}. ${step.instructions || ''}`
          },
          {
            role: 'user',
            content: typeof stepOutput === 'string' ? 
              stepOutput : 
              JSON.stringify(stepOutput)
          }
        ];
        
        // Execute the agent for this step
        const agentResponse = await this.executeAgentChat(step.agentId, messages);
        
        // Extract response content
        const responseContent = agentResponse.choices[0].message.content;
        
        // Process response based on step configuration
        stepOutput = step.outputProcessor ? 
          step.outputProcessor(responseContent) : 
          responseContent;
        
        // Record result
        results.push({
          step: step.name,
          agent: step.agentId,
          output: responseContent
        });
        
        console.log(`Step ${step.name} completed successfully`);
      } catch (error) {
        console.error(`Error in workflow step ${step.name}:`, error);
        workflow.status = 'failed';
        throw error;
      }
    }
    
    workflow.status = 'completed';
    console.log(`Workflow ${workflow.name} completed successfully`);
    
    return {
      workflowId,
      status: 'completed',
      results
    };
  }
}

/**
 * Demonstrate Agent Memory System
 */
async function demoAgentMemory() {
  console.log('\n🧠 Demonstrating Advanced Agent Memory System...');
  
  // Initialize memory system with advanced configuration
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
  
  if (enhancedContext.relevantMemories.length > 0) {
    console.log('Found relevant memories:');
    enhancedContext.relevantMemories.forEach((memory, i) => {
      if (memory.document && memory.document.content) {
        console.log(`  ${i+1}. ${memory.document.content.substring(0, 100)}${memory.document.content.length > 100 ? '...' : ''}`);
      }
    });
  }
  
  // Add visualization to the UI
  const memoryVisContainer = document.getElementById('memory-visualization');
  if (!memoryVisContainer) {
    const demoOutput = document.getElementById('demo-output');
    if (demoOutput) {
      const memoryVis = document.createElement('div');
      memoryVis.id = 'memory-visualization';
      memoryVis.className = 'mt-3 p-2 border rounded';
      memoryVis.innerHTML = `
        <h5>Memory System Structure</h5>
        <div class="d-flex justify-content-around">
          <div class="text-center p-2 border border-primary rounded">
            <strong>Short-term Memory</strong><br>
            <small>Conversation history</small>
          </div>
          <div class="text-center p-2 border border-success rounded">
            <strong>Long-term Memory</strong><br>
            <small>Vector-indexed knowledge</small>
          </div>
        </div>
      `;
      demoOutput.appendChild(memoryVis);
    }
  }
  
  console.log('✓ Memory system demonstration complete');
}

/**
 * Demonstrate Multi-Agent System Creation with real API connections
 */
async function demoCrewAISetup() {
  console.log('\n🤖 Demonstrating Enhanced CrewAI Agent Orchestration...');
  
  // Initialize orchestrator with API key from local storage
  const apiKey = typeof localStorage !== 'undefined' ? 
    localStorage.getItem('openrouter_api_key') : null;
    
  // Initialize SDK to get model preferences
  const sdk = new OpenRouter({
    apiKey: apiKey || 'demo-mode',
    debug: false
  });
  
  // Get FRESH saved model preferences directly from localStorage to ensure we have the latest selections
  // This bypasses any cached preferences that might be outdated
  let modelPreferences = {};
  try {
    const currentSelectionsResearcher = document.getElementById('researcher-model')?.value;
    const currentSelectionsAnalyst = document.getElementById('analyst-model')?.value;
    
    console.log('Current model selections:', {
      researcher: currentSelectionsResearcher || '(not selected)',
      analyst: currentSelectionsAnalyst || '(not selected)'
    });
    
    // Use the current UI selections if available
    if (currentSelectionsResearcher && currentSelectionsResearcher !== 'loading') {
      modelPreferences.researcher = currentSelectionsResearcher;
    }
    
    if (currentSelectionsAnalyst && currentSelectionsAnalyst !== 'loading') {
      modelPreferences.analyst = currentSelectionsAnalyst;
    }
    
    // If we don't have preferences from the UI, try to load from localStorage
    if (!modelPreferences.researcher || !modelPreferences.analyst) {
      const savedPreferencesRaw = localStorage.getItem('openrouter_model_preferences');
      if (savedPreferencesRaw) {
        const savedPreferences = JSON.parse(savedPreferencesRaw);
        // Only use stored preferences for values we don't have from the UI
        if (!modelPreferences.researcher && savedPreferences.researcher) {
          modelPreferences.researcher = savedPreferences.researcher;
        }
        if (!modelPreferences.analyst && savedPreferences.analyst) {
          modelPreferences.analyst = savedPreferences.analyst;
        }
      }
    }
    
    // Save these preferences back to make sure they're stored for next time
    sdk.saveModelPreferences(modelPreferences);
  } catch (error) {
    console.error('Error getting fresh model preferences:', error);
    // Fall back to standard preference loading if the direct approach fails
    modelPreferences = sdk.loadModelPreferences();
  }
    
  const orchestrator = new AIOrchestrator({
    apiKey: apiKey || 'demo-mode'
  });
  
  console.log('✓ Initialized AI Orchestrator');
  console.log('Using model preferences:', modelPreferences);
  
  // Register agents in the orchestration system
  console.log('Registering agents...');
  
  // 1. Research Agent
  const researcherId = orchestrator.registerAgent({
    id: 'researcher',
    name: 'Research Agent',
    description: 'Gathers information from various sources and provides comprehensive research results',
    model: modelPreferences.researcher || 'anthropic/claude-3-opus'
  });
  console.log(`✓ Registered Research Agent with model: ${modelPreferences.researcher || 'anthropic/claude-3-opus'}`);
  
  // 2. Analysis Agent
  const analystId = orchestrator.registerAgent({
    id: 'analyst',
    name: 'Analysis Agent',
    description: 'Analyzes information and draws insights from research data',
    model: modelPreferences.analyst || 'openai/gpt-4o'
  });
  console.log(`✓ Registered Analysis Agent (${analystId})`);
  
  // Define a workflow connecting these agents
  const workflowId = orchestrator.defineWorkflow({
    id: 'research-workflow',
    name: 'Research and Analysis Workflow',
    steps: [
      {
        name: 'Research Phase',
        agentId: 'researcher',
        instructions: 'Research the given topic thoroughly. Focus on finding the most relevant and up-to-date information. Present your findings in a clear, structured format.',
      },
      {
        name: 'Analysis Phase',
        agentId: 'analyst',
        instructions: 'Analyze the research findings provided. Identify key trends, implications, and draw meaningful insights. Provide a concise summary that highlights the most important points.',
      }
    ]
  });
  
  console.log(`✓ Defined workflow: Research and Analysis Workflow (${workflowId})`);
  
  // Add model selection UI and visualization to the UI
  const crewVisContainer = document.getElementById('crew-visualization');
  if (!crewVisContainer) {
    const demoOutput = document.getElementById('demo-output');
    if (demoOutput) {
      // First, clear any existing content
      demoOutput.innerHTML = '';
      
      // Add a section for model selection
      const modelSelection = document.createElement('div');
      modelSelection.id = 'model-selection';
      modelSelection.className = 'mt-3 p-2 border rounded';
      modelSelection.innerHTML = `
        <h5>Model Selection</h5>
        <div class="alert alert-info small">Select models for each agent. Changes will be saved automatically.</div>
        <div class="row">
          <div class="col-md-6 mb-2">
            <label for="researcher-model"><strong>Research Agent Model:</strong></label>
            <select id="researcher-model" class="form-control form-control-sm model-selector" data-agent="researcher">
              <option value="loading">Loading models...</option>
            </select>
          </div>
          <div class="col-md-6 mb-2">
            <label for="analyst-model"><strong>Analysis Agent Model:</strong></label>
            <select id="analyst-model" class="form-control form-control-sm model-selector" data-agent="analyst">
              <option value="loading">Loading models...</option>
            </select>
          </div>
        </div>
        <div class="mt-2">
          <button id="refresh-models" class="btn btn-sm btn-outline-secondary">Refresh Models</button>
          <span id="model-status" class="ml-2 small"></span>
        </div>
      `;
      demoOutput.appendChild(modelSelection);
      
      // Add event listener for the refresh button immediately after creating it
      const refreshButton = document.getElementById('refresh-models');
      if (refreshButton) {
        console.log('Adding event listener to refresh-models button');
        refreshButton.addEventListener('click', function() {
          console.log('Refresh models button clicked');
          fetchAndPopulateModels();
        });
      } else {
        console.warn('Could not find refresh-models button after creating it');
      }
      
      // Then add the visualization
      const crewVis = document.createElement('div');
      crewVis.id = 'crew-visualization';
      crewVis.className = 'mt-3 p-2 border rounded';
      crewVis.innerHTML = `
        <h5>Multi-Agent System Structure</h5>
        <div class="d-flex flex-column align-items-center">
          <div class="mb-2 p-2 border border-primary rounded text-center" style="width: 180px;">
            <strong>Orchestrator</strong>
          </div>
          <div class="d-flex justify-content-around" style="width: 100%;">
            <div class="p-2 border border-success rounded text-center" style="width: 150px;">
              <strong>Research Agent</strong><br>
              <small id="researcher-model-display">Claude 3 Opus</small>
            </div>
            <div class="p-2 border border-info rounded text-center" style="width: 150px;">
              <strong>Analysis Agent</strong><br>
              <small id="analyst-model-display">GPT-4o</small>
            </div>
          </div>
        </div>
      `;
      demoOutput.appendChild(crewVis);
      
      // Event listener already added when creating the button
    }
  }
  
  // Create status display for real-time workflow execution
  const demoOutput = document.getElementById('demo-output');
  if (demoOutput) {
    const workflowStatus = document.createElement('div');
    workflowStatus.id = 'workflow-status';
    workflowStatus.className = 'mt-3 p-2 border rounded bg-light';
    workflowStatus.innerHTML = `
      <h5>Workflow Execution</h5>
      <div id="workflow-progress" class="mb-2">
        <div class="progress">
          <div class="progress-bar progress-bar-striped progress-bar-animated" 
               role="progressbar" style="width: 0%"></div>
        </div>
      </div>
      <div class="mb-3">
        <h6>Configure Workflow Agents</h6>
        <div class="row">
          <div class="col-md-6 mb-2">
            <label for="workflow-researcher-model"><strong>Research Agent:</strong></label>
            <select id="workflow-researcher-model" class="form-control form-control-sm">
              <option value="loading">Loading models...</option>
            </select>
          </div>
          <div class="col-md-6 mb-2">
            <label for="workflow-analyst-model"><strong>Analysis Agent:</strong></label>
            <select id="workflow-analyst-model" class="form-control form-control-sm">
              <option value="loading">Loading models...</option>
            </select>
          </div>
        </div>
      </div>
      <div id="workflow-steps">
        <p>Task: Research the latest developments in quantum computing</p>
      </div>
    `;
    demoOutput.appendChild(workflowStatus);
  }
  
  // Create Run Workflow button
  const runButtonContainer = document.createElement('div');
  runButtonContainer.className = 'mb-3';
  runButtonContainer.innerHTML = `
    <button id="run-workflow-btn" class="btn btn-primary">Run Workflow</button>
    <small class="text-muted ml-2">Using current model selections</small>
  `;
  demoOutput.appendChild(runButtonContainer);
  
  // Add click event listener to the Run Workflow button
  document.getElementById('run-workflow-btn').addEventListener('click', async function() {
    this.disabled = true;
    this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running...';
    try {
      await runWorkflow();
    } catch (error) {
      console.error('Workflow execution error:', error);
    } finally {
      this.disabled = false;
      this.textContent = 'Run Workflow';
    }
  });
  
  // Automatically run the workflow once for the demo
  setTimeout(() => runWorkflow(), 1000);
}

/**
 * Execute the multi-agent workflow with the most current model selections
 */
async function runWorkflow() {
  // Get the workflow-specific model selections directly from the dropdowns
  const workflowResearcherSelect = document.getElementById('workflow-researcher-model');
  const workflowAnalystSelect = document.getElementById('workflow-analyst-model');
  
  // If workflow-specific dropdowns aren't populated yet, populate them
  if (workflowResearcherSelect && workflowResearcherSelect.options.length <= 1) {
    await populateWorkflowModelSelectors();
  }
  
  // Get the currently selected models from the workflow-specific dropdowns
  let researcherModel = 'anthropic/claude-3-opus'; // Default fallback
  let analystModel = 'openai/gpt-4o'; // Default fallback
  
  if (workflowResearcherSelect && workflowResearcherSelect.value && workflowResearcherSelect.value !== 'loading') {
    researcherModel = workflowResearcherSelect.value;
    console.log(`Using researcher model from workflow dropdown: ${researcherModel}`);
  }
  
  if (workflowAnalystSelect && workflowAnalystSelect.value && workflowAnalystSelect.value !== 'loading') {
    analystModel = workflowAnalystSelect.value;
    console.log(`Using analyst model from workflow dropdown: ${analystModel}`);
  }
  
  // Update the model displays for visual confirmation
  if (workflowResearcherSelect && workflowResearcherSelect.selectedIndex >= 0) {
    const modelName = workflowResearcherSelect.options[workflowResearcherSelect.selectedIndex].textContent;
    updateModelDisplay('researcher', modelName);
  }
  
  if (workflowAnalystSelect && workflowAnalystSelect.selectedIndex >= 0) {
    const modelName = workflowAnalystSelect.options[workflowAnalystSelect.selectedIndex].textContent;
    updateModelDisplay('analyst', modelName);
  }
  
  // Save these selections to preferences for future use
  const apiKey = localStorage.getItem('openrouter_api_key') || 'demo-mode';
  const sdk = new OpenRouter({
    apiKey: apiKey,
    debug: false
  });
  
  // Create fresh preferences object with current selections
  const modelPreferences = {
    researcher: researcherModel,
    analyst: analystModel
  };
  
  // Save to localStorage
  sdk.saveModelPreferences(modelPreferences);
  console.log('Saved current model selections:', modelPreferences);
  
  // The sample task
  const sampleTask = 'Research the latest developments in quantum computing';
  console.log(`Task: ${sampleTask}`);
  
  try {
    // Update progress indicator
    const progressBar = document.querySelector('#workflow-progress .progress-bar');
    if (progressBar) progressBar.style.width = '25%';
    
    // Create a new orchestrator with the CURRENT model preferences
    const orchestrator = new AIOrchestrator({
      apiKey: apiKey || 'demo-mode'
    });
    
    // Register agents with the CURRENT model preferences
    console.log('Registering agents with current model selections...');
    
    // 1. Research Agent with current selection
    const researcherId = orchestrator.registerAgent({
      id: 'researcher',
      name: 'Research Agent',
      description: 'Gathers information from various sources and provides comprehensive research results',
      model: researcherModel // Use the current selection
    });
    console.log(`✓ Registered Research Agent with model: ${researcherModel}`);
    
    // 2. Analysis Agent with current selection
    const analystId = orchestrator.registerAgent({
      id: 'analyst',
      name: 'Analysis Agent',
      description: 'Analyzes information and draws insights from research data',
      model: analystModel // Use the current selection
    });
    console.log(`✓ Registered Analysis Agent with model: ${analystModel}`);
    
    // Define the workflow (same as before)
    const workflowId = orchestrator.defineWorkflow({
      id: 'research-workflow',
      name: 'Research and Analysis Workflow',
      steps: [
        {
          name: 'Research Phase',
          agentId: 'researcher',
          instructions: 'Research the given topic thoroughly. Focus on finding the most relevant and up-to-date information. Present your findings in a clear, structured format.',
        },
        {
          name: 'Analysis Phase',
          agentId: 'analyst',
          instructions: 'Analyze the research findings provided. Identify key trends, implications, and draw meaningful insights. Provide a concise summary that highlights the most important points.',
        }
      ]
    });
    
    if (apiKey && apiKey !== 'demo-mode') {
      // Real workflow execution with API
      console.log('Executing workflow with real API connection...');
      await simulateDelayedLog('  • Starting workflow execution with OpenRouter API', 500);
      
      const workflowResult = await orchestrator.executeWorkflow('research-workflow', sampleTask);
      
      // Display results in the UI
      const workflowSteps = document.getElementById('workflow-steps');
      console.log('Workflow result:', JSON.stringify(workflowResult, null, 2));
      
      if (workflowSteps) {
        workflowSteps.innerHTML += '<h5 class="mt-4 mb-3">Workflow Results:</h5>';
        
        // Create a container for the results
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'workflow-results-container';
        
        // Handle different result formats
        if (workflowResult.results && Array.isArray(workflowResult.results)) {
          // Standard results format
          workflowResult.results.forEach((result, index) => {
            // Parse the output to extract sections
            const resultCard = document.createElement('div');
            resultCard.className = 'card mb-3';
            
            // Create a header for the card based on agent type
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
            
            // Different styling based on agent type
            if (result.agent === 'researcher') {
              cardHeader.className += ' bg-primary text-white';
              cardHeader.innerHTML = `
                <span><i class="fas fa-search mr-2"></i> ${result.step}</span>
                <span class="badge badge-light">Model: ${workflowResult.models?.[result.agent] || result.model || 'Unknown'}</span>
              `;
            } else if (result.agent === 'analyst') {
              cardHeader.className += ' bg-success text-white';
              cardHeader.innerHTML = `
                <span><i class="fas fa-chart-line mr-2"></i> ${result.step}</span>
                <span class="badge badge-light">Model: ${workflowResult.models?.[result.agent] || result.model || 'Unknown'}</span>
              `;
            } else {
              cardHeader.innerHTML = `
                <span>${result.step} (${result.agent})</span>
                <span class="badge badge-secondary">Model: ${workflowResult.models?.[result.agent] || result.model || 'Unknown'}</span>
              `;
            }
            resultCard.appendChild(cardHeader);
            
            // Create the content area
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            // Format the output based on structure
            const output = result.output || result.response || '';
            
            // Check if the output contains sections (numbered or with headings)
            if (output.includes('\n1.') || output.includes('\n#')) {
              // Process structured content
              cardBody.innerHTML = formatStructuredContent(output);
            } else {
              // Simple paragraph formatting
              cardBody.innerHTML = `<p class="card-text">${formatPlainContent(output)}</p>`;
            }
            
            // Add a collapse/expand button
            const collapseButton = document.createElement('button');
            collapseButton.className = 'btn btn-sm btn-outline-secondary mt-2';
            collapseButton.textContent = 'Toggle Full Content';
            collapseButton.onclick = function() {
              const detailElement = this.nextElementSibling;
              if (detailElement.style.display === 'none') {
                detailElement.style.display = 'block';
                this.textContent = 'Show Less';
              } else {
                detailElement.style.display = 'none';
                this.textContent = 'Show Full Content';
              }
            };
            
            // Add the raw content in a details section
            const rawContent = document.createElement('pre');
            rawContent.className = 'mt-3 p-2 bg-light rounded';
            rawContent.style.fontSize = '0.9rem';
            rawContent.style.display = 'none'; // Hidden by default
            rawContent.textContent = output;
            
            cardBody.appendChild(collapseButton);
            cardBody.appendChild(rawContent);
            resultCard.appendChild(cardBody);
            
            resultsContainer.appendChild(resultCard);
          });
        } else if (workflowResult.steps && Array.isArray(workflowResult.steps)) {
          // Alternative format with steps
          workflowResult.steps.forEach(step => {
            const content = step.output || step.response || step.result || '';
            resultsContainer.innerHTML += `
              <div class="card mb-3">
                <div class="card-header">
                  <strong>${step.name} (${step.agentId})</strong>
                </div>
                <div class="card-body">
                  <p class="card-text">${formatPlainContent(content)}</p>
                </div>
              </div>
            `;
          });
        } else {
          // Last resort - just show what we have
          resultsContainer.innerHTML = `
            <div class="alert alert-info">
              <h6>Workflow Completed</h6>
              <p>The workflow completed successfully, but the results format is not recognized.</p>
              <details>
                <summary>View Raw Results</summary>
                <pre class="text-muted mt-2" style="font-size: 0.8rem;">${JSON.stringify(workflowResult, null, 2)}</pre>
              </details>
            </div>
          `;
        }
        
        workflowSteps.appendChild(resultsContainer);
      }
      
      // Function to format structured content with sections into HTML
      function formatStructuredContent(content) {
        // Split by lines and process
        const lines = content.split('\n');
        let html = '';
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for headers
          if (line.match(/^#+\s/)) {
            // Markdown-style header
            const level = line.match(/^(#+)/)[0].length;
            const text = line.replace(/^#+\s/, '');
            html += `<h${level + 2} class="mt-2">${text}</h${level + 2}>`;
          } 
          // Check for numbered sections
          else if (line.match(/^\d+\.\s/)) {
            // This is a numbered section title
            const title = line.replace(/^\d+\.\s/, '');
            html += `<h6 class="mt-3 font-weight-bold">${title}</h6>`;
          }
          // Check for subsections
          else if (line.match(/^[a-z]\)\s/)) {
            // This is a subsection
            const title = line.replace(/^[a-z]\)\s/, '');
            html += `<div class="ml-3 mt-2"><strong>${title}</strong></div>`;
          }
          // Check for list items
          else if (line.match(/^-\s/)) {
            // Start list if not already in one
            if (!inList) {
              html += '<ul class="mt-2">';
              inList = true;
            }
            const item = line.replace(/^-\s/, '');
            html += `<li>${item}</li>`;
          }
          // Empty line
          else if (line.trim() === '') {
            // Close list if needed
            if (inList) {
              html += '</ul>';
              inList = false;
            }
            html += '<br>';
          }
          // Regular line
          else {
            // Close list if needed
            if (inList) {
              html += '</ul>';
              inList = false;
            }
            html += `<p>${line}</p>`;
          }
        }
        
        // Close any open lists
        if (inList) {
          html += '</ul>';
        }
        
        return html;
      }
      
      // Function to format plain text content with simple paragraph breaks
      function formatPlainContent(content) {
        return content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
      }
    } else {
      // Simulate workflow execution for demo mode
      console.log('API key not available, simulating workflow execution...');
      
      // Research phase simulation
      await simulateDelayedLog('  • Research Agent searching for information...', 600);
      if (progressBar) progressBar.style.width = '50%';
      
      await simulateDelayedLog('  • Research Agent found relevant sources on quantum computing', 800);
      if (progressBar) progressBar.style.width = '75%';
      
      // Analysis phase simulation
      await simulateDelayedLog('  • Analysis Agent processing research data...', 700);
      
      await simulateDelayedLog('  • Analysis Agent generated insights and summary', 900);
      if (progressBar) progressBar.style.width = '100%';
      
      // Add simulated results to UI
      const workflowSteps = document.getElementById('workflow-steps');
      if (workflowSteps) {
        workflowSteps.innerHTML += `
          <h6 class="mt-3">Simulated Results:</h6>
          <div class="mt-2 p-2 bg-white rounded shadow-sm">
            <strong>Research Phase (researcher)</strong>
            <p>Recent developments in quantum computing include advances in quantum error correction, new qubit technologies using trapped ions and superconducting circuits, and the achievement of quantum advantage in specific computational tasks. Companies like IBM, Google, and new startups have made significant progress in scaling quantum computers beyond 100 qubits, with IBM's roadmap targeting 4,000+ qubits by 2025.</p>
          </div>
          <div class="mt-2 p-2 bg-white rounded shadow-sm">
            <strong>Analysis Phase (analyst)</strong>
            <p>The quantum computing field is accelerating rapidly with three key trends: (1) Error correction breakthroughs making practical quantum computers more feasible, (2) Hybrid classical-quantum approaches showing immediate business value in optimization and simulation, and (3) Industry consolidation as larger companies acquire promising startups. These developments suggest quantum computing is moving from purely theoretical to practical applications in chemistry, materials science, and financial modeling much faster than previously anticipated.</p>
          </div>
        `;
      }
    }
    
    console.log('✓ Workflow execution completed successfully');
  } catch (error) {
    console.error('Error executing workflow:', error);
    
    // Update UI to show error
    const workflowSteps = document.getElementById('workflow-steps');
    if (workflowSteps) {
      workflowSteps.innerHTML += `
        <div class="alert alert-danger mt-3">
          <strong>Workflow Error:</strong> ${error.message || 'Failed to execute workflow'}
        </div>
      `;
    }
  }
  
  console.log('✓ CrewAI orchestration demonstration complete');
}

/**
 * Populate the workflow-specific model selectors with available models
 */
async function populateWorkflowModelSelectors() {
  const workflowResearcherSelect = document.getElementById('workflow-researcher-model');
  const workflowAnalystSelect = document.getElementById('workflow-analyst-model');
  
  if (!workflowResearcherSelect || !workflowAnalystSelect) {
    console.warn('Workflow model selectors not found in DOM');
    return;
  }
  
  // Clear any existing options
  workflowResearcherSelect.innerHTML = '';
  workflowAnalystSelect.innerHTML = '';
  
  try {
    // Initialize SDK
    const apiKey = localStorage.getItem('openrouter_api_key') || 'demo-mode';
    const sdk = new OpenRouter({
      apiKey: apiKey,
      debug: false
    });
    
    // Fetch models or use cached ones
    const modelsResponse = await sdk.listModels();
    const models = modelsResponse.data;
    
    if (!models || models.length === 0) {
      throw new Error('No models available');
    }
    
    // Get current preferences for default selections
    const preferences = sdk.loadModelPreferences();
    
    // Group models by provider
    const modelsByProvider = {};
    for (const model of models) {
      if (!modelsByProvider[model.provider]) {
        modelsByProvider[model.provider] = [];
      }
      modelsByProvider[model.provider].push(model);
    }
    
    // Add models to dropdowns by provider
    Object.keys(modelsByProvider).sort().forEach(provider => {
      const providerDisplayName = provider.charAt(0).toUpperCase() + provider.slice(1);
      
      // Create optgroups for each provider
      const researcherGroup = document.createElement('optgroup');
      researcherGroup.label = providerDisplayName;
      
      const analystGroup = document.createElement('optgroup');
      analystGroup.label = providerDisplayName;
      
      // Add models to the provider groups
      modelsByProvider[provider].forEach(model => {
        // Researcher option
        const researcherOption = document.createElement('option');
        researcherOption.value = model.id;
        researcherOption.textContent = model.name;
        researcherGroup.appendChild(researcherOption);
        
        // Analyst option
        const analystOption = document.createElement('option');
        analystOption.value = model.id;
        analystOption.textContent = model.name;
        analystGroup.appendChild(analystOption);
      });
      
      workflowResearcherSelect.appendChild(researcherGroup);
      workflowAnalystSelect.appendChild(analystGroup);
    });
    
    // Set default selections based on preferences
    if (preferences.researcher) {
      const option = workflowResearcherSelect.querySelector(`option[value="${preferences.researcher}"]`);
      if (option) {
        option.selected = true;
      }
    } else {
      // Default to Claude 3 Opus if no preference
      const claudeOption = workflowResearcherSelect.querySelector('option[value="anthropic/claude-3-opus"]');
      if (claudeOption) {
        claudeOption.selected = true;
      }
    }
    
    if (preferences.analyst) {
      const option = workflowAnalystSelect.querySelector(`option[value="${preferences.analyst}"]`);
      if (option) {
        option.selected = true;
      }
    } else {
      // Default to GPT-4o if no preference
      const gptOption = workflowAnalystSelect.querySelector('option[value="openai/gpt-4o"]');
      if (gptOption) {
        gptOption.selected = true;
      }
    }
    
    console.log('Workflow model selectors populated successfully');
    return true;
  } catch (error) {
    console.error('Error populating workflow model selectors:', error);
    
    // Add default options as fallback
    addDefaultOption(workflowResearcherSelect, 'anthropic/claude-3-opus', 'Claude 3 Opus');
    addDefaultOption(workflowAnalystSelect, 'openai/gpt-4o', 'GPT-4o');
    
    return false;
  }
}

/**
 * Helper function to add a default option to a select element
 */
function addDefaultOption(selectElem, value, text) {
  if (!selectElem) return;
  
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  option.selected = true;
  selectElem.appendChild(option);
}

/**
 * Global variable to track number of model loading attempts
 */
let modelLoadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

/**
 * Fetch available models from OpenRouter and populate dropdowns
 * @param {number} attempt - Current attempt number (default: 0)
 */
async function fetchAndPopulateModels(attempt = 0) {
  // Limit the number of retries to prevent infinite recursion
  if (attempt >= MAX_LOAD_ATTEMPTS) {
    console.warn(`Maximum model loading attempts (${MAX_LOAD_ATTEMPTS}) reached. Using default models only.`);
    createModelSelectorsIfNeeded();
    populateDefaultModels();
    return false;
  }
  
  console.log(`Fetching models for dropdowns... (attempt ${attempt + 1}/${MAX_LOAD_ATTEMPTS})`);
  const statusElem = document.getElementById('model-status');
  if (statusElem) statusElem.textContent = 'Loading models...';
  
  try {
    // Create model selectors if they don't exist
    createModelSelectorsIfNeeded();
    
    // Check if the model selection UI exists
    const researcherSelect = document.getElementById('researcher-model');
    const analystSelect = document.getElementById('analyst-model');
    
    if (!researcherSelect || !analystSelect) {
      console.warn('Model selectors still not available after creation attempt');
      // Try one more time after a delay, with incremented attempt counter
      if (attempt < MAX_LOAD_ATTEMPTS - 1) {
        setTimeout(() => fetchAndPopulateModels(attempt + 1), 1000);
      }
      return false;
    }

    // Initialize SDK
    const apiKey = localStorage.getItem('openrouter_api_key') || 'demo-mode';
    const sdk = new OpenRouter({
      apiKey: apiKey,
      debug: true  // Enable debug mode to help with troubleshooting
    });
    
    // Fetch models from API
    console.log('Calling listModels API...');
    const modelsResponse = await sdk.listModels();
    const models = modelsResponse.data;
    console.log(`Fetched ${models.length} models successfully from source: ${modelsResponse.source || 'unknown'}`);
    
    if (!models || models.length === 0) {
      throw new Error('No models received from API');
    }
    
    // Get model preferences
    const preferences = sdk.loadModelPreferences();
    console.log('Current model preferences:', preferences);
    
    // Directly populate the dropdowns to ensure they're updated
    researcherSelect.innerHTML = ''; // Clear loading option
    analystSelect.innerHTML = ''; // Clear loading option
    
    // Group models by provider
    const modelsByProvider = {};
    for (const model of models) {
      if (!modelsByProvider[model.provider]) {
        modelsByProvider[model.provider] = [];
      }
      modelsByProvider[model.provider].push(model);
    }
    
    // Add models to dropdowns
    Object.keys(modelsByProvider).sort().forEach(provider => {
      const providerDisplayName = provider.charAt(0).toUpperCase() + provider.slice(1);
      
      // Create optgroups for each provider
      const researcherGroup = document.createElement('optgroup');
      researcherGroup.label = providerDisplayName;
      
      const analystGroup = document.createElement('optgroup');
      analystGroup.label = providerDisplayName;
      
      // Add models to the provider groups
      modelsByProvider[provider].forEach(model => {
        // Researcher option
        const researcherOption = document.createElement('option');
        researcherOption.value = model.id;
        researcherOption.textContent = model.name;
        // Set Claude Opus as default for researcher if this is that model
        if (model.id === 'anthropic/claude-3-opus') {
          researcherOption.selected = true;
        }
        researcherGroup.appendChild(researcherOption);
        
        // Analyst option
        const analystOption = document.createElement('option');
        analystOption.value = model.id;
        analystOption.textContent = model.name;
        // Set GPT-4o as default for analyst if this is that model
        if (model.id === 'openai/gpt-4o') {
          analystOption.selected = true;
        }
        analystGroup.appendChild(analystOption);
      });
      
      researcherSelect.appendChild(researcherGroup);
      analystSelect.appendChild(analystGroup);
    });
    
    // Set selected model values based on preferences
    if (preferences.researcher) {
      const researcherOption = researcherSelect.querySelector(`option[value="${preferences.researcher}"]`);
      if (researcherOption) {
        researcherSelect.value = preferences.researcher;
      }
    }
    
    if (preferences.analyst) {
      const analystOption = analystSelect.querySelector(`option[value="${preferences.analyst}"]`);
      if (analystOption) {
        analystSelect.value = preferences.analyst;
      }
    }
    
    // Add change event listeners
    researcherSelect.addEventListener('change', function() {
      const selectedModel = this.value;
      const modelName = this.options[this.selectedIndex]?.textContent || 'Selected Model';
      console.log(`Changed researcher model to: ${selectedModel} (${modelName})`);
      saveModelPreference('researcher', selectedModel, sdk);
      updateModelDisplay('researcher', modelName);
    });
    
    analystSelect.addEventListener('change', function() {
      const selectedModel = this.value;
      const modelName = this.options[this.selectedIndex]?.textContent || 'Selected Model';
      console.log(`Changed analyst model to: ${selectedModel} (${modelName})`);
      saveModelPreference('analyst', selectedModel, sdk);
      updateModelDisplay('analyst', modelName);
    });
    
    // Update status
    if (statusElem) {
      statusElem.textContent = `✓ Loaded ${models.length} models`;
      statusElem.style.color = '#28a745';
      setTimeout(() => {
        if (statusElem) {
          statusElem.textContent = '';
          statusElem.style.color = '';
        }
      }, 3000);
    }
    
    // Update the model display in the visualization
    updateModelDisplays();
    
    return true;
  } catch (error) {
    console.error('Error fetching models:', error);
    if (statusElem) {
      statusElem.textContent = `Error: ${error.message}`;
      statusElem.style.color = '#dc3545';
    }
    return false;
  }
}

/**
 * Populate model selectors with available models
 * @param {Array} models - Available models from OpenRouter
 * @param {Object} preferences - Saved model preferences
 * @param {Object} sdk - OpenRouter SDK instance
 */
async function populateModelSelectors(models, preferences, sdk) {
  console.log('Populating model selectors...');
  
  // Wait a moment to ensure the DOM elements are created
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const researcherSelect = document.getElementById('researcher-model');
  const analystSelect = document.getElementById('analyst-model');
  
  if (!researcherSelect || !analystSelect) {
    console.error('Model selector elements not found!');
    console.log('researcher-model exists:', !!document.getElementById('researcher-model'));
    console.log('analyst-model exists:', !!document.getElementById('analyst-model'));
    return;
  }
  
  console.log('Found model selector elements, populating with models...');
  
  // Clear current options
  researcherSelect.innerHTML = '';
  analystSelect.innerHTML = '';
  
  // Sort models by provider and name
  const sortedModels = [...models].sort((a, b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return a.name.localeCompare(b.name);
  });
  
  // Group models by provider
  const providers = {};
  sortedModels.forEach(model => {
    if (!providers[model.provider]) {
      providers[model.provider] = [];
    }
    providers[model.provider].push(model);
  });
  
  // Add options to selects
  Object.keys(providers).sort().forEach(provider => {
    // Add provider as optgroup
    const researcherGroup = document.createElement('optgroup');
    researcherGroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
    researcherSelect.appendChild(researcherGroup);
    
    const analystGroup = document.createElement('optgroup');
    analystGroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
    analystSelect.appendChild(analystGroup);
    
    // Add models to the groups
    providers[provider].forEach(model => {
      const researcherOption = document.createElement('option');
      researcherOption.value = model.id;
      researcherOption.textContent = model.name;
      researcherGroup.appendChild(researcherOption);
      
      const analystOption = document.createElement('option');
      analystOption.value = model.id;
      analystOption.textContent = model.name;
      analystGroup.appendChild(analystOption);
    });
  });
  
  console.log('Setting selected values:', preferences);
  
  // Set selected models based on preferences
  if (preferences.researcher && researcherSelect.querySelector(`option[value="${preferences.researcher}"]`)) {
    researcherSelect.value = preferences.researcher;
  } else {
    // Find a fallback model if the preferred one isn't available
    const fallbackModels = ['anthropic/claude-3-opus', 'anthropic/claude-3-sonnet', 'openai/gpt-4'];
    for (const model of fallbackModels) {
      if (researcherSelect.querySelector(`option[value="${model}"]`)) {
        researcherSelect.value = model;
        break;
      }
    }
  }
  
  if (preferences.analyst && analystSelect.querySelector(`option[value="${preferences.analyst}"]`)) {
    analystSelect.value = preferences.analyst;
  } else {
    // Find a fallback model if the preferred one isn't available
    const fallbackModels = ['openai/gpt-4o', 'openai/gpt-4', 'anthropic/claude-3-haiku'];
    for (const model of fallbackModels) {
      if (analystSelect.querySelector(`option[value="${model}"]`)) {
        analystSelect.value = model;
        break;
      }
    }
  }
  
  console.log('Model selectors populated successfully!');
  
  // Add change event listeners
  researcherSelect.addEventListener('change', function() {
    const selectedModelName = this.options[this.selectedIndex]?.textContent || 'Claude 3 Opus';
    console.log(`Changed researcher model to: ${this.value} (${selectedModelName})`);
    saveModelPreference('researcher', this.value, sdk);
    updateModelDisplay('researcher', selectedModelName);
  });
  
  analystSelect.addEventListener('change', function() {
    const selectedModelName = this.options[this.selectedIndex]?.textContent || 'GPT-4o';
    console.log(`Changed analyst model to: ${this.value} (${selectedModelName})`);
    saveModelPreference('analyst', this.value, sdk);
    updateModelDisplay('analyst', selectedModelName);
  });
}

/**
 * Update all model displays using current dropdown selections
 */
function updateModelDisplays() {
  const researcherSelect = document.getElementById('researcher-model');
  const analystSelect = document.getElementById('analyst-model');
  
  if (researcherSelect) {
    const selectedIndex = researcherSelect.selectedIndex;
    const researcherModelName = selectedIndex >= 0 ? 
      researcherSelect.options[selectedIndex].textContent : 
      'Claude 3 Opus';
    updateModelDisplay('researcher', researcherModelName);
  } else {
    updateModelDisplay('researcher', 'Claude 3 Opus');
  }
  
  if (analystSelect) {
    const selectedIndex = analystSelect.selectedIndex;
    const analystModelName = selectedIndex >= 0 ? 
      analystSelect.options[selectedIndex].textContent : 
      'GPT-4o';
    updateModelDisplay('analyst', analystModelName);
  } else {
    updateModelDisplay('analyst', 'GPT-4o');
  }
}

/**
 * Save model preference to localStorage
 * @param {string} agent - Agent identifier
 * @param {string} modelId - Selected model ID
 * @param {Object} sdk - OpenRouter SDK instance
 */
function saveModelPreference(agent, modelId, sdk) {
  try {
    if (!sdk) {
      console.error('Cannot save model preference: SDK instance is not available');
      return;
    }
    
    // Get current preferences
    const preferences = sdk.loadModelPreferences();
    
    // Update preference
    preferences[agent] = modelId;
    
    // Save updated preferences
    const success = sdk.saveModelPreferences(preferences);
    
    if (success) {
      console.log(`Saved model preference for ${agent}: ${modelId}`);
      // Show a quick visual confirmation to the user
      const statusElem = document.getElementById('model-status');
      if (statusElem) {
        statusElem.textContent = `✓ Saved ${agent} model preference`;
        statusElem.style.color = '#28a745';
        setTimeout(() => {
          statusElem.textContent = '';
          statusElem.style.color = '';
        }, 2000);
      }
    } else {
      console.error(`Failed to save model preference for ${agent}`);
    }
  } catch (error) {
    console.error('Error saving model preference:', error);
  }
}

/**
 * Update model display in visualization
 * @param {string} agent - Agent identifier
 * @param {string} modelName - Model name to display
 */
function updateModelDisplay(agent, modelName) {
  const displayElem = document.getElementById(`${agent}-model-display`);
  if (displayElem) {
    displayElem.textContent = modelName;
  }
}

/**
 * Helper function to simulate delayed log messages
 * @param {string} message - Message to log
 * @param {number} delay - Delay in milliseconds
 */
async function simulateDelayedLog(message, delay) {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(message);
      resolve();
    }, delay);
  });
}

// Run the demo
async function runDemo() {
  try {
    console.log('Starting demonstration of enhanced OpenRouter SDK features...');
    
    // Clear previous output
    const demoOutput = document.getElementById('demo-output');
    if (demoOutput) demoOutput.innerHTML = '';
    
    // Run demo components
    await demoAgentMemory();
    await demoCrewAISetup();
    
    console.log('Demo completed successfully!');
    console.log('For more information, explore the SDK documentation.');
  } catch (error) {
    console.error('Error running demo:', error);
  }
}

// Wait for the DOM to be fully loaded before executing the demo
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed');
  
  // Set up UI integration
  setupUIElements();
  
  // Only run the demo if specifically requested via UI
  document.getElementById('run-demo-button')?.addEventListener('click', function() {
    runDemo();
  });
  
  // Handle API key interactions
  document.getElementById('save-key-button')?.addEventListener('click', function() {
    const keyInput = document.getElementById('api-key-input');
    if (keyInput && keyInput.value) {
      localStorage.setItem('openrouter_api_key', keyInput.value.trim());
      document.getElementById('api-key-status').textContent = 'API Key saved successfully!';
      setTimeout(() => {
        document.getElementById('api-key-status').textContent = '';
      }, 3000);
      
      // Reload models when API key changes
      setTimeout(fetchAndPopulateModels, 500);
    }
  });
  
  document.getElementById('clear-key-button')?.addEventListener('click', function() {
    localStorage.removeItem('openrouter_api_key');
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput) apiKeyInput.value = '';
    document.getElementById('api-key-status').textContent = 'API Key cleared!';
    setTimeout(() => {
      document.getElementById('api-key-status').textContent = '';
    }, 3000);
    
    // Reload models when API key is cleared
    setTimeout(fetchAndPopulateModels, 500);
  });
  
  // Create output area first to ensure the DOM elements exist
  setupUIElements();
  
  // Create model selectors and populate with defaults first
  createModelSelectorsIfNeeded();
  populateDefaultModels();
  
  // Then try to fetch real models with a slight delay
  setTimeout(() => fetchAndPopulateModels(0), 800);
});

/**
 * Setup UI integrations and event listeners
 */
function setupUIElements() {
  // Add a demo section to the UI if it doesn't exist
  const mainContainer = document.querySelector('.container');
  if (!mainContainer) return;
  
  // Check if our demo section already exists
  if (!document.getElementById('sdk-demo-section')) {
    const demoSection = document.createElement('div');
    demoSection.id = 'sdk-demo-section';
    demoSection.className = 'mt-5 card';
    demoSection.innerHTML = `
      <div class="card-header bg-primary text-white">
        <h3 class="mb-0">SDK Advanced Features Demo</h3>
      </div>
      <div class="card-body">
        <p class="lead">Demonstrate the advanced capabilities of the OpenRouter SDK:</p>
        <ul class="list-group mb-3">
          <li class="list-group-item">Agent Memory System: Store and retrieve contextual information</li>
          <li class="list-group-item">Multi-Agent Orchestration: Coordinate multiple specialized AI agents</li>
        </ul>
        <button id="run-demo-button" class="btn btn-primary">Run Demo</button>
        <button id="fetch-models-button" class="btn btn-outline-secondary ml-2">Load Models</button>
        <div id="demo-output" class="mt-3 p-3 bg-light rounded" style="max-height: 300px; overflow-y: auto;"></div>
      </div>
    `;
    
    // Add the demo section to the main container
    mainContainer.appendChild(demoSection);
    
    // Add event listener for model loading
    document.getElementById('fetch-models-button')?.addEventListener('click', fetchAndPopulateModels);
  }
  
  // Models have been loaded by the DOMContentLoaded event handler
  
  // Set up output redirection to UI
  setupConsoleRedirect();
}

/**
 * Create model selectors in the DOM if they don't already exist
 */
function createModelSelectorsIfNeeded() {
  // First check if the model selection container exists
  let modelSelection = document.getElementById('model-selection');
  
  // If not found, check if we have the demo output container to add it to
  const demoOutput = document.getElementById('demo-output');
  if (!modelSelection && demoOutput) {
    console.log('Creating model selection UI in demo output');
    
    // Create the model selection container
    modelSelection = document.createElement('div');
    modelSelection.id = 'model-selection';
    modelSelection.className = 'mt-3 p-2 border rounded';
    modelSelection.innerHTML = `
      <h5>Model Selection</h5>
      <div class="alert alert-info small">Select models for each agent. Changes will be saved automatically.</div>
      <div class="row">
        <div class="col-md-6 mb-2">
          <label for="researcher-model"><strong>Research Agent Model:</strong></label>
          <select id="researcher-model" class="form-control form-control-sm model-selector" data-agent="researcher">
            <option value="loading">Loading models...</option>
          </select>
        </div>
        <div class="col-md-6 mb-2">
          <label for="analyst-model"><strong>Analysis Agent Model:</strong></label>
          <select id="analyst-model" class="form-control form-control-sm model-selector" data-agent="analyst">
            <option value="loading">Loading models...</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div id="model-status" class="small text-muted mt-1"></div>
        </div>
      </div>
    `;
    
    // Add to the beginning of the demo output
    demoOutput.insertBefore(modelSelection, demoOutput.firstChild);
    return true;
  }
  
  return !!modelSelection; // Return true if it exists, false otherwise
}

/**
 * Redirect console output to the UI demo output area
 */
function populateDefaultModels() {
  console.log('Populating dropdowns with default models');
  
  // First ensure the selectors exist
  if (!createModelSelectorsIfNeeded()) {
    console.warn('Unable to create model selection UI');
    return false;
  }
  
  const researcherSelect = document.getElementById('researcher-model');
  const analystSelect = document.getElementById('analyst-model');
  
  if (!researcherSelect || !analystSelect) {
    console.warn('Model selection dropdowns not found in DOM');
    return false;
  }
  
  // Clear any existing options
  researcherSelect.innerHTML = '';
  analystSelect.innerHTML = '';
  
  // Use the default models defined in OpenRouter class
  const defaultModels = OpenRouter.DEFAULT_MODELS || [
    { id: 'openai/gpt-3.5-turbo', provider: 'openai', name: 'GPT-3.5 Turbo' },
    { id: 'openai/gpt-4', provider: 'openai', name: 'GPT-4' },
    { id: 'openai/gpt-4-turbo', provider: 'openai', name: 'GPT-4 Turbo' },
    { id: 'openai/gpt-4o', provider: 'openai', name: 'GPT-4o' },
    { id: 'anthropic/claude-3-opus', provider: 'anthropic', name: 'Claude 3 Opus' },
    { id: 'anthropic/claude-3-sonnet', provider: 'anthropic', name: 'Claude 3 Sonnet' },
    { id: 'anthropic/claude-3-haiku', provider: 'anthropic', name: 'Claude 3 Haiku' },
    { id: 'google/gemini-pro', provider: 'google', name: 'Gemini Pro' },
    { id: 'google/gemini-1.5-pro', provider: 'google', name: 'Gemini 1.5 Pro' }
  ];
  
  // Group by provider
  const modelsByProvider = {};
  for (const model of defaultModels) {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    modelsByProvider[model.provider].push(model);
  }
  
  // Create dropdown options
  Object.keys(modelsByProvider).sort().forEach(provider => {
    const researcherGroup = document.createElement('optgroup');
    researcherGroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
    
    const analystGroup = document.createElement('optgroup');
    analystGroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
    
    modelsByProvider[provider].forEach(model => {
      // Researcher option
      const researcherOption = document.createElement('option');
      researcherOption.value = model.id;
      researcherOption.textContent = model.name;
      if (model.id === 'anthropic/claude-3-opus') {
        researcherOption.selected = true;
      }
      researcherGroup.appendChild(researcherOption);
      
      // Analyst option
      const analystOption = document.createElement('option');
      analystOption.value = model.id;
      analystOption.textContent = model.name;
      if (model.id === 'openai/gpt-4o') {
        analystOption.selected = true;
      }
      analystGroup.appendChild(analystOption);
    });
    
    researcherSelect.appendChild(researcherGroup);
    analystSelect.appendChild(analystGroup);
  });
  
  // Add change event listeners
  const apiKey = localStorage.getItem('openrouter_api_key') || 'demo-mode';
  const sdk = new OpenRouter({
    apiKey: apiKey
  });
  
  researcherSelect.addEventListener('change', function() {
    const selectedModel = this.value;
    const modelName = this.options[this.selectedIndex]?.textContent || 'Selected Model';
    console.log(`Changed researcher model to: ${selectedModel} (${modelName})`);
    saveModelPreference('researcher', selectedModel, sdk);
    updateModelDisplay('researcher', modelName);
  });
  
  analystSelect.addEventListener('change', function() {
    const selectedModel = this.value;
    const modelName = this.options[this.selectedIndex]?.textContent || 'Selected Model';
    console.log(`Changed analyst model to: ${selectedModel} (${modelName})`);
    saveModelPreference('analyst', selectedModel, sdk);
    updateModelDisplay('analyst', modelName);
  });
  
  // Load preferences and set selected options
  try {
    const preferences = sdk.loadModelPreferences();
    
    if (preferences.researcher) {
      const option = researcherSelect.querySelector(`option[value="${preferences.researcher}"]`);
      if (option) {
        researcherSelect.value = preferences.researcher;
        updateModelDisplay('researcher', option.textContent);
      }
    }
    
    if (preferences.analyst) {
      const option = analystSelect.querySelector(`option[value="${preferences.analyst}"]`);
      if (option) {
        analystSelect.value = preferences.analyst;
        updateModelDisplay('analyst', option.textContent);
      }
    }
    
    // Update the model displays
    updateModelDisplays();
  } catch (error) {
    console.error('Error loading model preferences:', error);
  }
  
  console.log('Default models loaded into dropdowns');
}

function setupConsoleRedirect() {
  const demoOutput = document.getElementById('demo-output');
  if (!demoOutput) return;
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  
  // Redirect console.log to UI
  console.log = function() {
    // Call original console method
    originalConsole.log.apply(console, arguments);
    
    // Add to UI
    const message = Array.from(arguments).map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    appendToOutput(message);
  };
  
  // Redirect console.warn to UI
  console.warn = function() {
    // Call original console method
    originalConsole.warn.apply(console, arguments);
    
    // Add to UI with warning style
    const message = Array.from(arguments).map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    appendToOutput(`⚠️ ${message}`, 'text-warning');
  };
  
  // Redirect console.error to UI
  console.error = function() {
    // Call original console method
    originalConsole.error.apply(console, arguments);
    
    // Add to UI with error style
    const message = Array.from(arguments).map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    appendToOutput(`❌ ${message}`, 'text-danger');
  };
  
  // Helper function to append message to output area
  function appendToOutput(message, className = '') {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = message;
    demoOutput.appendChild(line);
    demoOutput.scrollTop = demoOutput.scrollHeight;
  }
}
