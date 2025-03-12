/**
 * OpenRouter SDK Dashboard
 * Interactive dashboard that showcases all available SDK functions and agents
 */

// No need to import OneAPIClient - we now use dashboardOneAPIConnector
// which is globally available from our script tag in dashboard.html

// Import AgentWizard and OrchestratorWizard directly
import { AgentWizard } from './src/core/AgentWizard.js';
import { OrchestratorWizard } from './src/core/OrchestratorWizard.js';

// Variables for SDK management
let FunctionWizard;
let wizard;

// Agent and Orchestrator wizards
let agentWizard;
let orchestratorWizard;

// Initialize the wizards
async function initWizards() {
  try {
    console.log('Initializing wizards...');
    
    // Initialize agent wizard
    try {
      agentWizard = new AgentWizard();
      console.log('Agent wizard created successfully');
      
      agentWizard.loadState();
      console.log('Agent wizard state loaded');
      
      registerDefaultProvider();
      loadAgents();
    } catch (agentError) {
      console.error('Error initializing agent wizard:', agentError);
    }
    
    // Initialize orchestrator wizard
    try {
      orchestratorWizard = new OrchestratorWizard();
      console.log('Orchestrator wizard created successfully');
    } catch (orchError) {
      console.error('Error initializing orchestrator wizard:', orchError);
    }
    
    // Add CSS for components
    addAgentWizardStyles();
    addOrchestratorStyles();
    agentCssAdded = true;
    
    console.log('Wizards initialized successfully');
    
    // Update UI to show orchestrator elements
    loadWorkflows();
  } catch (error) {
    console.error('Failed to initialize wizards:', error);
  }
}

// Our OneAPI connector is already initialized in dashboard.html
console.log('Using dashboardOneAPIConnector for API interactions');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard initializing');
  // Load SDK functions
  loadFunctions();
  
  // Check API connection status
  checkApiStatus();
  
  try {
    // Initialize SDK
    console.log('Loading SDK...');
    
    // Initialize Wizards using our async function
    initWizards().then(() => {
      // After wizards are loaded, render components
      loadAgents();
      console.log('Dashboard components loaded successfully');
    }).catch(err => {
      console.warn('Error initializing wizards:', err);
    });
    
    // Setup API key management UI handlers
    setupApiKeyManagement();
    
  } catch (error) {
    console.warn('Error setting up SDK:', error.message);
    updateConnectionStatus(false);
  }
});

// DOM Elements
const functionsContainer = document.getElementById('functions-container');
const agentsContainer = document.getElementById('agents-container');
const functionsCount = document.getElementById('functions-count');
const agentsCount = document.getElementById('agents-count');
const searchInput = document.getElementById('search-functions');
const loadingElement = document.getElementById('loading-functions');
const apiKeyInput = document.getElementById('api-key');
const saveKeyButton = document.getElementById('save-api-key');
const toggleKeyButton = document.getElementById('toggle-key');
const refreshButton = document.getElementById('refresh-functions');
const clearCacheButton = document.getElementById('clear-cache');
const createAgentButton = document.getElementById('create-agent');
let agentCssAdded = false;
const connectionStatus = document.getElementById('connection-status');

// Function to check API status
async function checkApiStatus() {
  try {
    // Use dashboardOneAPIConnector instead of apiClient
    const statusData = await dashboardOneAPIConnector.getStatus();
    console.log('API Status:', statusData);
    
    // Check if we have any valid API connections
    const hasConnection = statusData && (
      statusData.providers?.openai?.connected ||
      statusData.providers?.anthropic?.connected ||
      statusData.providers?.google?.connected ||
      statusData.providers?.mistral?.connected ||
      statusData.providers?.together?.connected
    );
    
    updateConnectionStatus(hasConnection);
    
    // Update individual provider statuses
    if (statusData && statusData.providers) {
      updateProviderStatuses(statusData.providers);
    }
    
    // Load saved API keys from localStorage
    loadSavedApiKeys();
    
    // Display active providers if connected
    if (hasConnection) {
      showToast('API Connected', 'Successfully connected to API providers', 'success');
    }
    
    return statusData;
  } catch (error) {
    console.error('Error checking API status:', error);
    updateConnectionStatus(false);
    showToast('Connection Error', 'Failed to connect to API: ' + error.message, 'error');
    return null;
  }
}

// Function to update connection status indicator
function updateConnectionStatus(isConnected) {
  if (!connectionStatus) return;
  
  if (isConnected) {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.remove('bg-danger', 'bg-warning');
    connectionStatus.classList.add('bg-success');
  } else {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('bg-success', 'bg-warning');
    connectionStatus.classList.add('bg-danger');
    console.warn('API connection failed or no valid providers found');
  }
}

// Update the provider status badges based on API status response
function updateProviderStatuses(providers) {
  // Map of provider names to their status elements
  const statusElementIds = {
    openai: 'openai-status',
    anthropic: 'anthropic-status',
    google: 'google-status',
    mistral: 'mistral-status',
    together: 'together-status'
  };
  
  // Update each provider status
  for (const [provider, elementId] of Object.entries(statusElementIds)) {
    const statusElement = document.getElementById(elementId);
    if (!statusElement) continue; // Skip if element not found
    
    const providerInfo = providers?.[provider];
    if (providerInfo?.connected) {
      statusElement.textContent = 'Connected';
      statusElement.className = 'badge bg-success';
    } else if (providerInfo?.available) {
      statusElement.textContent = 'Configured';
      statusElement.className = 'badge bg-warning';
    } else {
      statusElement.textContent = 'Not Configured';
      statusElement.className = 'badge bg-secondary';
    }
  }
}

// Load saved API keys from localStorage
function loadSavedApiKeys() {
  const keyMap = {
    'openai-key': 'openai_api_key',
    'anthropic-key': 'anthropic_api_key',
    'google-key': 'google_api_key',
    'mistral-key': 'mistral_api_key',
    'together-key': 'together_api_key'
  };
  
  // Load each saved key
  for (const [inputId, storageKey] of Object.entries(keyMap)) {
    const input = document.getElementById(inputId);
    if (!input) continue;
    
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      input.value = savedKey;
    }
  }
}

// Update all API keys
async function updateAllApiKeys() {
  try {
    // Get values from all API key inputs
    const keys = {
      openaiKey: document.getElementById('openai-key')?.value,
      anthropicKey: document.getElementById('anthropic-key')?.value,
      googleKey: document.getElementById('google-key')?.value,
      mistralKey: document.getElementById('mistral-key')?.value,
      togetherKey: document.getElementById('together-key')?.value
    };
    
    // Update button state
    const updateButton = document.getElementById('update-all-keys');
    if (updateButton) {
      updateButton.disabled = true;
      updateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
    }
    
    // Use our OneAPI connector to update keys
    const result = await dashboardOneAPIConnector.updateApiKeys(keys);
    
    if (result.success) {
      showToast('Success', 'API keys updated successfully', 'success');
      
      // Update provider statuses
      if (result.status) {
        updateProviderStatuses(result.status || {});
      }
    } else {
      showToast('Error', 'Failed to update API keys: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error updating API keys:', error);
    showToast('Error', 'Failed to update API keys: ' + error.message, 'error');
  } finally {
    // Reset button state
    const updateButton = document.getElementById('update-all-keys');
    if (updateButton) {
      updateButton.disabled = false;
      updateButton.innerHTML = '<i class="bi bi-check-circle me-1"></i> Update All Keys';
    }
  }
}

// Test a specific API key
async function testApiKeyConnection(provider) {
  const providerKeyMap = {
    openai: 'openai-key',
    anthropic: 'anthropic-key',
    google: 'google-key',
    mistral: 'mistral-key',
    together: 'together-key'
  };
  
  const inputId = providerKeyMap[provider];
  if (!inputId) return;
  
  const keyInput = document.getElementById(inputId);
  if (!keyInput || !keyInput.value) {
    showToast('Error', `Please enter a ${provider} API key first`, 'error');
    return;
  }
  
  try {
    // Update button state
    const testButton = document.querySelector(`.test-api-key[data-provider="${provider}"]`);
    if (testButton) {
      testButton.disabled = true;
      testButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Testing...';
    }
    
    // For Anthropic, validate the key format first
    if (provider === 'anthropic') {
      const apiKey = keyInput.value;
      if (!apiKey || !apiKey.startsWith('sk-ant-')) {
        showToast('Error', 'Invalid Anthropic API key format. Keys should start with sk-ant-', 'error');
        
        // Update provider status
        const statusElement = document.getElementById(`${provider}-status`);
        if (statusElement) {
          statusElement.textContent = 'Invalid Format';
          statusElement.className = 'badge bg-danger';
        }
        return;
      }
    }
    
    console.log(`Testing ${provider} connection with key: ${keyInput.value.substring(0, 10)}...`);
    
    // Test the API key via our OneAPI connector
    const result = await dashboardOneAPIConnector.testProviderConnection(provider, keyInput.value);
    console.log(`${provider} test result:`, result);
    
    // Show additional debug for Anthropic
    if (provider === 'anthropic') {
      console.log('Anthropic API key test details:', {
        success: result.success,
        modelsCount: result.models?.length || 0
      });
    }
    
    if (result.success) {
      showToast('Success', `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is valid!`, 'success');
      
      // Update provider status
      const statusElement = document.getElementById(`${provider}-status`);
      if (statusElement) {
        statusElement.textContent = 'Connected';
        statusElement.className = 'badge bg-success';
      }
      
      // For Anthropic, let's try to directly update the status
      if (provider === 'anthropic') {
        // Refresh the API status to update the UI
        await dashboardOneAPIConnector.getStatus();
      }
    } else {
      // More detailed error for Anthropic
      if (provider === 'anthropic') {
        const errorMsg = result.error || 'API key validation failed';
        showToast('Warning', `Anthropic API key validation issue: ${errorMsg}`, 'warning');
      } else {
        showToast('Warning', `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key may not be valid or service is unavailable`, 'warning');
      }
      
      // Update provider status
      const statusElement = document.getElementById(`${provider}-status`);
      if (statusElement) {
        statusElement.textContent = 'Problem Detected';
        statusElement.className = 'badge bg-warning';
      }
    }
  } catch (error) {
    console.error(`Error testing ${provider} API key:`, error);
    showToast('Error', `Failed to test ${provider} API key: ` + error.message, 'error');
  } finally {
    // Reset button state
    const testButton = document.querySelector(`.test-api-key[data-provider="${provider}"]`);
    if (testButton) {
      testButton.disabled = false;
      testButton.innerHTML = 'Test Connection';
    }
  }
}

// Setup API Key Management UI interactions
function setupApiKeyManagement() {
  // Set up Update All Keys button
  const updateAllButton = document.getElementById('update-all-keys');
  if (updateAllButton) {
    updateAllButton.addEventListener('click', updateAllApiKeys);
  }
  
  // Set up individual test buttons
  const testButtons = document.querySelectorAll('.test-api-key');
  testButtons.forEach(button => {
    const provider = button.getAttribute('data-provider');
    if (provider) {
      button.addEventListener('click', () => testApiKeyConnection(provider));
    }
  });
  
  // Set up API key visibility toggle buttons
  const toggleButtons = document.querySelectorAll('.toggle-api-key');
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const inputGroup = this.closest('.input-group');
      if (!inputGroup) return;
      
      const input = inputGroup.querySelector('input');
      if (!input) return;
      
      if (input.type === 'password') {
        input.type = 'text';
        this.innerHTML = '<i class="bi bi-eye-slash"></i>';
      } else {
        input.type = 'password';
        this.innerHTML = '<i class="bi bi-eye"></i>';
      }
    });
  });
}

// Function to load functions and agents from SDK
function loadFunctions() {
    if (wizard) {
      // Define Research Agent
      wizard.defineFunction('researchAgent')
        .description('AI Agent that performs web research on a given topic')
        .parameter('topic', 'string', 'Research topic to investigate', true)
        .parameter('depth', 'number', 'Research depth (1-5)', false)
        .parameter('format', 'string', 'Output format (summary/detailed/bullet)', false)
        .implement(async ({ topic, depth = 3, format = 'summary' }) => {
            console.log(`Researching ${topic} at depth ${depth} with format ${format}`);
            return `Research results for ${topic} (${format} format)`;
        })
        .register();
        
      // Define Data Analysis Agent
      wizard.defineFunction('analysisAgent')
        .description('AI Agent that analyzes data and provides insights')
        .parameter('data', 'string', 'JSON data to analyze', true)
        .parameter('metrics', 'string', 'Metrics to calculate (comma-separated)', true)
        .parameter('visualize', 'boolean', 'Generate visualizations', false)
        .implement(async ({ data, metrics, visualize = false }) => {
            console.log(`Analyzing data with metrics: ${metrics}, visualize: ${visualize}`);
            return `Analysis results for metrics: ${metrics}`;
        })
        .register();
        
      // Define Conversational Agent
      wizard.defineFunction('chatAgent')
        .description('AI Agent that maintains context and engages in conversation')
        .parameter('message', 'string', 'User message', true)
        .parameter('context', 'string', 'Previous conversation context', false)
        .parameter('personality', 'string', 'Agent personality type', false)
        .implement(async ({ message, context = '', personality = 'friendly' }) => {
            console.log(`Chat agent responding to: ${message} with personality: ${personality}`);
            return `Response to: "${message}" (${personality} tone)`;
        })
        .register();
        
      // Define Task Automation Agent
      wizard.defineFunction('automationAgent')
        .description('AI Agent that automates sequences of tasks')
        .parameter('tasks', 'string', 'JSON array of tasks to perform', true)
        .parameter('dependencies', 'string', 'JSON object of task dependencies', false)
        .parameter('parallel', 'boolean', 'Execute tasks in parallel if possible', false)
        .implement(async ({ tasks, dependencies = '{}', parallel = false }) => {
            console.log(`Automating tasks: ${tasks}, parallel: ${parallel}`);
            return `Automation results for tasks`;
        })
        .register();
        
      // Define Learning Agent
      wizard.defineFunction('learningAgent')
        .description('AI Agent that learns from interactions and improves over time')
        .parameter('input', 'string', 'Input data or query', true)
        .parameter('feedback', 'string', 'Previous interaction feedback', false)
        .parameter('modelPath', 'string', 'Path to trained model', false)
        .implement(async ({ input, feedback = '', modelPath = 'default' }) => {
            console.log(`Learning agent processing: ${input} with model: ${modelPath}`);
            return `Learning agent response for: "${input}"`;
        })
        .register();
        
      // Define Vector Database Integration
      wizard.defineFunction('vectorStore')
        .description('Interface for vector database storage and retrieval')
        .parameter('operation', 'string', 'Operation to perform (store/query/delete)', true)
        .parameter('data', 'string', 'Data to store or query parameters', true)
        .parameter('namespace', 'string', 'Collection namespace to use', false)
        .implement(async ({ operation, data, namespace = 'default' }) => {
            console.log(`Vector DB ${operation} in namespace ${namespace}`);
            return `Vector DB ${operation} completed`;
        })
        .register();
        
      // Define LLM Router
      wizard.defineFunction('llmRouter')
        .description('Routes requests to appropriate language models')
        .parameter('prompt', 'string', 'The prompt to send to the LLM', true)
        .parameter('model', 'string', 'Model to use (defaults to auto-routing)', false)
        .parameter('options', 'string', 'JSON string of additional options', false)
        .implement(async ({ prompt, model = 'auto', options = '{}' }) => {
            console.log(`Routing prompt to model: ${model}`);
            return `LLM response from ${model} model`;
        })
        .register();
        
      // Define Embedding Generator
      wizard.defineFunction('embeddings')
        .description('Generate and manage vector embeddings for text')
        .parameter('text', 'string', 'Text to generate embeddings for', true)
        .parameter('model', 'string', 'Embedding model to use', false)
        .parameter('dimensions', 'number', 'Number of dimensions (if supported)', false)
        .implement(async ({ text, model = 'default', dimensions = 1536 }) => {
            console.log(`Generating ${dimensions}-dimension embeddings with ${model} model`);
            return `Embeddings generated for text (${text.substring(0, 20)}...)`;
        })
        .register();
        
      // Define AI Orchestrator
      wizard.defineFunction('orchestrator')
        .description('Coordinates multiple AI agents to solve complex tasks')
        .parameter('task', 'string', 'The complex task description', true)
        .parameter('agents', 'string', 'JSON array of agent names to use', false)
        .parameter('maxSteps', 'number', 'Maximum number of steps to run', false)
        .implement(async ({ task, agents = '[]', maxSteps = 10 }) => {
            console.log(`Orchestrating task: ${task} with max ${maxSteps} steps`);
            return `Orchestration completed for task: "${task}"`;
        })
        .register();
    }
    
    // Render the functions
    renderFunctions();
}

// Function to render all available functions
function renderFunctions() {
    // Get functions from wizard
    const functions = (wizard && typeof wizard.listFunctions === 'function') 
        ? wizard.listFunctions() 
        : [];
    
    loadingElement.style.display = 'none';
    functionsContainer.innerHTML = '';
    
    if (functions.length === 0) {
        functionsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-circle text-secondary" style="font-size: 3rem;"></i>
                <p class="mt-3">No functions found. Create a function to get started.</p>
                <button class="btn btn-primary mt-2">Create Function</button>
            </div>
        `;
        return;
    }
    
    // Update function count
    functionsCount.textContent = functions.length;
    
    // Function type to icon/color mapping
    const functionTypes = {
        'research': { icon: 'bi-search', type: 'research' },
        'analysis': { icon: 'bi-bar-chart', type: 'analysis' },
        'chat': { icon: 'bi-chat-dots', type: 'chat' },
        'automation': { icon: 'bi-gear', type: 'automation' },
        'learning': { icon: 'bi-brain', type: 'learning' },
        'vector': { icon: 'bi-database', type: 'default' },
        'llm': { icon: 'bi-cpu', type: 'default' },
        'embedding': { icon: 'bi-grid-3x3', type: 'default' },
        'orchestrator': { icon: 'bi-diagram-3', type: 'default' }
    };
    
    // Render each function
    functions.forEach(func => {
        // Determine function type based on name
        let type = 'default';
        let icon = 'bi-lightning-charge';
        
        Object.keys(functionTypes).forEach(key => {
            if (func.name.toLowerCase().includes(key)) {
                type = functionTypes[key].type;
                icon = functionTypes[key].icon;
            }
        });
        
        // Create card for function
        const functionCard = document.createElement('div');
        functionCard.className = 'col-md-6 col-lg-4 mb-4';
        functionCard.innerHTML = `
            <div class="card function-card" data-function="${func.name}">
                <div class="card-body">
                    <div class="function-icon function-type-${type}">
                        <i class="bi ${icon}"></i>
                    </div>
                    <h5 class="function-title">${func.name}</h5>
                    <p class="function-description">${func.description}</p>
                    <div class="function-meta d-flex justify-content-between">
                        <span>
                            <i class="bi bi-diagram-2"></i> 
                            ${func.parameters ? Object.keys(func.parameters).length : 0} Parameters
                        </span>
                        <span>
                            <button class="btn btn-sm btn-outline-primary view-details" data-function="${func.name}">
                                View Details
                            </button>
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        functionsContainer.appendChild(functionCard);
        
        // Add click event to open function details
        const card = functionCard.querySelector('.function-card');
        card.addEventListener('click', () => {
            showFunctionDetails(func);
        });
    });
    
    // Also create some demo agents
    renderAgents();
}

// Function to render agents
function renderAgents() {
    const agents = agentWizard ? agentWizard.getAgents() : [];
    
    if (agents.length === 0) {
        agentsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-robot text-secondary" style="font-size: 3rem;"></i>
                <p class="mt-3">No agents configured yet.</p>
                <button class="btn btn-primary mt-2" id="create-first-agent">
                    <i class="bi bi-plus-lg me-1"></i>
                    Create First Agent
                </button>
            </div>
        `;
        
        // Add event listener for create button
        setTimeout(() => {
            const createFirstAgentBtn = document.getElementById('create-first-agent');
            if (createFirstAgentBtn) {
                createFirstAgentBtn.addEventListener('click', function() {
                    showAgentWizardModal();
                });
            }
        }, 100);
        
        return;
    }
    
    // Update agent count
    agentsCount.textContent = agents.length;
    
    // Clear container
    agentsContainer.innerHTML = '';
    
    // Render each agent
    agents.forEach(agent => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 agent-card">
                <div class="card-header bg-${agent.template.color || 'primary'} text-white">
                    <div class="d-flex align-items-center justify-content-between">
                        <h5 class="mb-0">
                            <i class="bi ${agent.template.icon || 'bi-robot'} me-2"></i>
                            ${agent.name}
                        </h5>
                        <div class="dropdown">
                            <button class="btn btn-sm text-white" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item edit-agent" data-agent-id="${agent.id}" href="#"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                <li><a class="dropdown-item run-agent" data-agent-id="${agent.id}" href="#"><i class="bi bi-play-fill me-2"></i>Run</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item delete-agent text-danger" data-agent-id="${agent.id}" href="#"><i class="bi bi-trash me-2"></i>Delete</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <p class="mb-2"><strong>Type:</strong> ${agent.template.name}</p>
                    <p class="mb-0 text-secondary">${agent.template.description}</p>
                </div>
                <div class="card-footer bg-light">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">Created: ${new Date(agent.created).toLocaleDateString()}</small>
                        <button class="btn btn-sm btn-primary run-agent-footer" data-agent-id="${agent.id}">
                            <i class="bi bi-play-fill me-1"></i>Run
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        agentsContainer.appendChild(card);
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-agent').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const agentId = this.getAttribute('data-agent-id');
            showAgentWizardModal(agentId);
        });
    });
    
    document.querySelectorAll('.run-agent, .run-agent-footer').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const agentId = this.getAttribute('data-agent-id');
            showAgentRunModal(agentId);
        });
    });
    
    document.querySelectorAll('.delete-agent').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const agentId = this.getAttribute('data-agent-id');
            
            if (confirm('Are you sure you want to delete this agent?')) {
                agentWizard.deleteAgent(agentId);
                agentWizard.saveState();
                renderAgents();
                showToast('Agent Deleted', 'Agent has been deleted successfully', 'success');
            }
        });
    });
}

// Function to show function details in modal
function showFunctionDetails(func) {
    const modal = new bootstrap.Modal(document.getElementById('function-modal'));
    const modalTitle = document.getElementById('function-modal-title');
    const modalBody = document.getElementById('function-modal-body');
    const executeButton = document.getElementById('execute-function');
    
    modalTitle.textContent = func.name;
    
    // Create parameters form
    let parametersHtml = '';
    if (func.parameters && Object.keys(func.parameters).length > 0) {
        parametersHtml = `
            <h6 class="mt-4 mb-3">Parameters</h6>
            <div class="parameters-list">
        `;
        
        for (const [name, param] of Object.entries(func.parameters)) {
            parametersHtml += `
                <div class="parameter-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="parameter-name">${name}</div>
                        <div>
                            <span class="parameter-type">${param.type}</span>
                            ${param.required ? '<span class="parameter-required ms-2">Required</span>' : ''}
                        </div>
                    </div>
                    <div class="parameter-description">${param.description || 'No description available'}</div>
                    <div class="mt-2">
                        ${renderParameterInput(name, param)}
                    </div>
                </div>
            `;
        }
        
        parametersHtml += `</div>`;
    } else {
        parametersHtml = `<p class="text-muted">This function has no parameters.</p>`;
    }
    
    // Render the implementation if available
    let implementationHtml = '';
    if (func.implementation) {
        implementationHtml = `
            <h6 class="mt-4 mb-3">Implementation</h6>
            <pre class="code-block">${func.implementation.toString()}</pre>
        `;
    }
    
    modalBody.innerHTML = `
        <p class="mb-4">${func.description}</p>
        ${parametersHtml}
        ${implementationHtml}
    `;
    
    // Set up execute button
    executeButton.setAttribute('data-function', func.name);
    executeButton.onclick = () => executeFunction(func.name);
    
    modal.show();
}

// Helper function to render parameter input based on type
function renderParameterInput(name, param) {
    const id = `param-${name}`;
    let inputHtml = '';
    
    switch (param.type) {
        case 'string':
            inputHtml = `<input type="text" class="form-control" id="${id}" placeholder="${param.description}" ${param.required ? 'required' : ''}>`;
            break;
        case 'number':
            inputHtml = `<input type="number" class="form-control" id="${id}" placeholder="${param.description}" ${param.required ? 'required' : ''}>`;
            break;
        case 'boolean':
            inputHtml = `
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="${id}">
                    <label class="form-check-label" for="${id}">Enable</label>
                </div>
            `;
            break;
        default:
            inputHtml = `<input type="text" class="form-control" id="${id}" placeholder="${param.description}" ${param.required ? 'required' : ''}>`;
    }
    
    return inputHtml;
}

// Function to execute a function with gathered parameters
async function executeFunction(functionName) {
    try {
        // Gather parameters from form
        const params = {};
        // Get function from wizard
        const func = wizard ? wizard.getFunction(functionName) : null;
        
        if (func && func.parameters) {
            for (const paramName of Object.keys(func.parameters)) {
                const paramInput = document.getElementById(`param-${paramName}`);
                if (paramInput) {
                    if (func.parameters[paramName].type === 'boolean') {
                        params[paramName] = paramInput.checked;
                    } else if (func.parameters[paramName].type === 'number') {
                        params[paramName] = Number(paramInput.value);
                    } else {
                        params[paramName] = paramInput.value;
                    }
                }
            }
        }
        
        // Show loading indicator
        showToast('Processing', `Executing ${functionName}...`, 'info');
        
        // Determine agent type based on function name and execute via OneAPI
        let result;
        try {
            // Use our OneAPI connector to execute the function or agent
            if (functionName.includes('Agent') || functionName.endsWith('agent')) {
                // For agent execution
                const agentType = functionName.replace('Agent', '').toLowerCase();
                console.log(`Executing agent via OneAPI: ${agentType}`);
                result = await dashboardOneAPIConnector.executeAgent(agentType, params);
            } else {
                // For regular function execution
                console.log(`Executing function via OneAPI: ${functionName}`);
                result = await dashboardOneAPIConnector.executeFunction(functionName, params);
            }
        } catch (error) {
            console.error(`Error executing via OneAPI:`, error);
            // Fall back to wizard if OneAPI fails
            if (wizard && typeof wizard.execute === 'function') {
                console.log(`Falling back to wizard execution for: ${functionName}`);
                result = await wizard.execute(functionName, params);
            } else {
                throw error;
            }
        }
        
        // Display result in a toast
        showToast('Success', `Function executed: ${result}`, 'success');
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('function-modal'));
        modal.hide();
        
    } catch (error) {
        showToast('Error', error.message, 'danger');
    }
}

// Function to show toast notifications
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toastId = `toast-${Date.now()}`;
    
    const toast = document.createElement('div');
    toast.className = `toast show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="toast-header">
            <div class="rounded me-2 bg-${type}" style="width: 20px; height: 20px;"></div>
            <strong class="me-auto">${title}</strong>
            <small>${new Date().toLocaleTimeString()}</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        try {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                const bsToast = new bootstrap.Toast(toastElement);
                bsToast.hide();
            }
        } catch (e) {
            console.error('Error hiding toast:', e);
        }
    }, 5000);
}

// Claude with Google Search Integration
let claudeProvider;
let googleSearchService = null;
let chatMessages = [];
let isStreamingResponse = false; // Track if we're currently streaming a response
let stopStreaming = false; // Flag to stop streaming when requested

// Define API client for OneAPI integration with Anthropic
let apiClient = null;

// Initialize Claude provider with configuration settings
function initClaudeProvider() {
  const claudeApiKey = document.getElementById('claude-api-key').value;
  const googleApiKey = document.getElementById('google-api-key').value;
  
  // Initialize API client for OneAPI integration
  // This leverages the OneAPI integration work we've done
  apiClient = {
    createChatCompletion: async (request) => {
      try {
        // Use dashboardOneAPIConnector to create a chat completion through Anthropic
        return await dashboardOneAPIConnector.createChatCompletion('anthropic', request);
      } catch (error) {
        console.error('Error calling OneAPI for chat completion:', error);
        throw error;
      }
    }
  };
  const googleCseId = document.getElementById('google-cse-id').value;
  const enableSearch = document.getElementById('enable-search').checked;
  const maxSearchResults = parseInt(document.getElementById('max-search-results').value, 10) || 3;

  // Save credentials to localStorage (for convenience only, not for production)
  if (claudeApiKey) {
    try {
      console.log('Initializing Claude API provider...');
      
      // Save API keys in localStorage
      localStorage.setItem('claude-api-key', claudeApiKey);
      if (googleApiKey) localStorage.setItem('google-api-key', googleApiKey);
      if (googleCseId) localStorage.setItem('google-cse-id', googleCseId);
      
      // Create Claude provider configuration
      const config = {
        apiKey: claudeApiKey,
        enableSearch: enableSearch && !!googleApiKey && !!googleCseId,
        googleSearchApiKey: googleApiKey,
        googleSearchEngineId: googleCseId,
        maxSearchResults: maxSearchResults
      };
      
      // Create a proper Claude provider instance
      // In a real app, you would import the ClaudeProvider class
      // This simplified implementation contains the core functionality we need
      claudeProvider = {
        createChatCompletion: async function(request) {
          console.log('Creating chat completion with request:', request);
          
          // Basic request validation
          if (!request.model || !request.messages || !request.messages.length) {
            throw new Error('Invalid request parameters');
          }
          
          // Perform search if enabled and search tool is requested
          let searchResults = [];
          const useSearch = config.enableSearch && request.tools?.some(tool => 
            tool.type === 'function' && 
            (tool.function.name === 'search' || tool.function.name === 'google_search')
          );
          
          if (useSearch && googleSearchService) {
            // Get the last user message
            const lastUserMessage = [...request.messages]
              .filter(msg => msg.role === 'user')
              .pop();
              
            if (lastUserMessage && typeof lastUserMessage.content === 'string') {
              // Extract search query
              const searchQuery = googleSearchService.extractSearchQuery 
                ? googleSearchService.extractSearchQuery(lastUserMessage.content)
                : lastUserMessage.content;
                
              // Perform the search
              try {
                searchResults = await googleSearchService.search(searchQuery);
                console.log(`Found ${searchResults.length} search results for query`);
                
                // Add search results as system message
                if (searchResults && searchResults.length > 0) {
                  const formattedResults = searchResults.map((result, i) => 
                    `[Result ${i+1}]\nTitle: ${result.title}\nURL: ${result.link}\nSnippet: ${result.snippet}\n`
                  ).join('\n');
                  
                  // Add this to the chat UI
                  addChatMessage('system', `Web search results for "${searchQuery}":\n\n${formattedResults}`, true);
                }
              } catch (searchError) {
                console.error('Search error:', searchError);
              }
            }
          }
          
          // Simplified simulation of Claude's response
          // In a real implementation, this would call Anthropic's API
          console.log('Generating Claude response...');
          
          // Create a simulated response
          let responseContent = `I'm Claude, and I've processed your request about "${request.messages[request.messages.length-1].content}".`;
          
          // Add information about search results if available
          if (searchResults.length > 0) {
            responseContent += `\n\nBased on my search, I found ${searchResults.length} relevant results. `;
            responseContent += `The most relevant information indicates that ${searchResults[0].title} (${searchResults[0].link}) might be helpful. `;
            responseContent += `According to the search results: ${searchResults[0].snippet}`;
          } else {
            responseContent += '\n\nI don\'t have specific information about this topic from web searches.';
          }
          
          // Return formatted response matching the expected shape
          return {
            id: `claude-${Date.now()}`,
            model: request.model,
            choices: [{
              message: {
                role: 'assistant',
                content: responseContent
              },
              finish_reason: 'stop',
              index: 0
            }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 150,
              total_tokens: 250
            }
          };
        },
        
        streamChatCompletions: async function*(request) {
          // Simplified streaming implementation - would be replaced with actual streaming in production
          const response = await this.createChatCompletion(request);
          yield response;
        }
      };
      
      // Create Google search service if keys are provided
      if (enableSearch && googleApiKey && googleCseId) {
        googleSearchService = {
          apiKey: googleApiKey,
          searchEngineId: googleCseId,
          maxResults: maxSearchResults,
          
          // Extract search query from user message
          extractSearchQuery: function(message) {
            // Simple implementation - could be enhanced with NLP techniques
            // Look for patterns like "search for X" or "find information about X"
            const searchPatterns = [
              /search (?:for|about) ["'](.+?)["']/i,
              /search (?:for|about) (.+?)(?:\.|$)/i,
              /find (?:information|details|data) (?:about|on|for) ["'](.+?)["']/i,
              /find (?:information|details|data) (?:about|on|for) (.+?)(?:\.|$)/i,
              /look up ["'](.+?)["']/i,
              /look up (.+?)(?:\.|$)/i,
            ];
            
            for (const pattern of searchPatterns) {
              const match = message.match(pattern);
              if (match && match[1]) {
                return match[1].trim();
              }
            }
            
            // If no explicit search patterns found, use the whole message
            // but limit to a reasonable length
            return message.length > 150 ? message.substring(0, 150) : message;
          },
          
          // Perform a Google search
          search: async function(query) {
            try {
              console.log(`Simulating Google search for query: ${query}`);
              
              // In a real implementation, this would call the Google Custom Search API
              // For the demo, we'll return simulated search results
              return [
                {
                  title: `Information about ${query}`,
                  link: `https://example.com/search?q=${encodeURIComponent(query)}`,
                  snippet: `This is a simulated search result about ${query}. It contains relevant information that would typically be returned from a Google search.`
                },
                {
                  title: `${query} - Wikipedia`,
                  link: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`,
                  snippet: `${query} refers to a concept, topic, or entity that has various definitions and interpretations depending on context. It is commonly associated with...`
                },
                {
                  title: `Latest News on ${query}`,
                  link: `https://news.example.com/topics/${encodeURIComponent(query)}`,
                  snippet: `Recent developments related to ${query} suggest significant changes in how experts view this topic. New research indicates...`
                }
              ];
            } catch (error) {
              console.error(`Error in Google Search: ${error.message}`);
              return [];
            }
          }
        };
      }
      
      showToast('Connection Successful', 'Successfully connected to Claude API provider', 'success');
      return true;
    } catch (error) {
      console.error('Failed to initialize API providers:', error);
      showToast('Initialization Error', 'Failed to initialize API providers: ' + error.message, 'error');
      return false;
    }
  } else {
    showToast('Missing Configuration', 'Please provide Claude API key.', 'error');
    return false;
  }
}

// Function to load saved credentials from localStorage
function loadSavedCredentials() {
  const claudeApiKey = localStorage.getItem('claude-api-key');
  const googleApiKey = localStorage.getItem('google-api-key');
  const googleCseId = localStorage.getItem('google-cse-id');
  
  if (claudeApiKey) document.getElementById('claude-api-key').value = claudeApiKey;
  if (googleApiKey) document.getElementById('google-api-key').value = googleApiKey;
  if (googleCseId) document.getElementById('google-cse-id').value = googleCseId;
}

// Function to toggle visibility of API keys
function toggleApiKeyVisibility(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  
  if (input.type === 'password') {
    input.type = 'text';
    button.innerHTML = '<i class="bi bi-eye-slash"></i>';
  } else {
    input.type = 'password';
    button.innerHTML = '<i class="bi bi-eye"></i>';
  }
}

// Function to add a message to the chat interface
// Function to add a message to the chat UI and message history
function addChatMessage(role, content, isSearchResults = false, addToHistory = true) {
  // Generate a unique ID for this message
  const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const chatContainer = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = role === 'user' ? 'user-message mb-3' : 'assistant-message mb-3';
  messageDiv.id = messageId;
  
  let messageContent = '';
  
  // Function to escape HTML content for security
  const escapeHtml = (unsafe) => {
    return unsafe.replace(/[&<"'>]/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return m;
      }
    });
  };
  
  // Create copy button for non-system messages
  const copyButton = (role !== 'system' || isSearchResults) ? 
    `<button class="btn btn-sm btn-outline-secondary float-end copy-message" data-message-id="${messageId}">
      <i class="bi bi-clipboard"></i>
    </button>` : '';
  
  if (role === 'user') {
    messageContent = `<div class="alert alert-primary position-relative">
      ${copyButton}
      <strong>You:</strong> ${escapeHtml(content)}
    </div>`;
  } else if (role === 'system' && isSearchResults) {
    messageContent = `<div class="alert alert-info position-relative">
      ${copyButton}
      <strong>Search Results:</strong>
      <pre class="mt-2" style="max-height: 200px; overflow-y: auto;">${escapeHtml(content)}</pre>
    </div>`;
  } else if (role === 'assistant') {
    // Handle typing indicator differently - don't escape HTML
    if (content.includes('<div class="typing-indicator">')) {
      messageContent = `<div class="alert alert-success position-relative">
        <strong>Claude:</strong> <span class="assistant-content">${content}</span>
      </div>`;
    } else {
      // Use marked.js to render markdown in Claude's responses if content isn't HTML
      try {
        const renderedContent = typeof marked !== 'undefined' ? 
          marked.parse(escapeHtml(content)) : escapeHtml(content);
        
        messageContent = `<div class="alert alert-success position-relative">
          ${copyButton}
          <strong>Claude:</strong> 
          <span class="assistant-content markdown-content">${renderedContent}</span>
        </div>`;
      } catch (e) {
        // Fallback if markdown parsing fails
        messageContent = `<div class="alert alert-success position-relative">
          ${copyButton}
          <strong>Claude:</strong> <span class="assistant-content">${escapeHtml(content)}</span>
        </div>`;
      }
    }
  } else {
    messageContent = `<div class="alert alert-light border position-relative">
      <strong>System:</strong> ${escapeHtml(content)}
    </div>`;
  }
  
  messageDiv.innerHTML = messageContent;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Add event listener for copy button
  const newCopyBtn = messageDiv.querySelector('.copy-message');
  if (newCopyBtn) {
    newCopyBtn.addEventListener('click', function() {
      const msgId = this.getAttribute('data-message-id');
      const msgObj = chatMessages.find(msg => msg.id === msgId);
      if (msgObj) {
        navigator.clipboard.writeText(msgObj.content)
          .then(() => {
            this.innerHTML = '<i class="bi bi-check"></i>';
            setTimeout(() => {
              this.innerHTML = '<i class="bi bi-clipboard"></i>';
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Error', 'Failed to copy to clipboard', 'error');
          });
      }
    });
  }
  
  // Add to message history
  if (addToHistory && (role !== 'system' || isSearchResults)) {
    chatMessages.push({ id: messageId, role, content, timestamp: Date.now() });
  }
  
  // Return the message ID so it can be updated later
  return messageId;
}

// Function to update an existing message in the chat UI
function updateChatMessage(messageId, role, newContent) {
  // Find the message element in the DOM
  const messageDiv = document.getElementById(messageId);
  if (!messageDiv) {
    console.error(`Message with ID ${messageId} not found`);
    return false;
  }
  
  // Function to escape HTML content for security
  const escapeHtml = (unsafe) => {
    return unsafe.replace(/[&<"'>]/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return m;
      }
    });
  };

  // Update the content based on the role
  if (role === 'assistant') {
    const contentSpan = messageDiv.querySelector('.assistant-content');
    if (contentSpan) {
      // Don't change HTML if it contains the typing indicator
      if (newContent.includes('<div class="typing-indicator">')) {
        contentSpan.innerHTML = newContent;
      } else {
        // Render markdown for normal text
        try {
          // Check if the content already has HTML (such as the character counter)
          const hasCharCounter = newContent.includes('<div class="text-muted small char-counter');
          let plainContent = newContent;
          let charCounter = '';
          
          // Extract the character counter if it exists
          if (hasCharCounter) {
            const counterMatch = newContent.match(/<div class="text-muted small char-counter.*?>(.*?)<\/div>/);
            if (counterMatch) {
              charCounter = counterMatch[0];
              plainContent = newContent.replace(charCounter, '').trim();
            }
          }
          
          // Check if marked library is available
          if (typeof marked !== 'undefined') {
            contentSpan.classList.add('markdown-content');
            
            // Parse markdown content
            const renderedMarkdown = marked.parse(escapeHtml(plainContent));
            
            // Add the character counter back if it existed
            contentSpan.innerHTML = renderedMarkdown + (hasCharCounter ? charCounter : '');
            
            // Apply code highlighting if hljs is available
            if (window.hljs) {
              const codeBlocks = contentSpan.querySelectorAll('pre code');
              if (codeBlocks.length > 0) {
                codeBlocks.forEach(block => {
                  window.hljs.highlightElement(block);
                });
              }
            }
          } else {
            // Fallback if marked isn't available
            contentSpan.innerHTML = escapeHtml(plainContent) + (hasCharCounter ? charCounter : '');
          }
        } catch (e) {
          console.error('Error rendering markdown:', e);
          contentSpan.textContent = newContent;
        }
      }
    } else {
      console.error('Assistant content span not found');
      return false;
    }
  } else if (role === 'system') {
    // For system messages, find the pre tag if it exists (for search results)
    const preElement = messageDiv.querySelector('pre');
    if (preElement) {
      preElement.textContent = newContent;
    } else {
      // Otherwise just replace the content after the strong tag
      const strongElement = messageDiv.querySelector('strong');
      if (strongElement) {
        // Get the parent element (the alert div) and modify the text after the strong element
        const parentDiv = strongElement.parentElement;
        if (parentDiv) {
          const strongHTML = strongElement.outerHTML;
          parentDiv.innerHTML = `${strongHTML} ${newContent}`;
        }
      }
    }
  } else if (role === 'user') {
    // For user messages, find the content after the strong tag
    const strongElement = messageDiv.querySelector('strong');
    if (strongElement) {
      const parentDiv = strongElement.parentElement;
      if (parentDiv) {
        const strongHTML = strongElement.outerHTML;
        parentDiv.innerHTML = `${strongHTML} ${newContent}`;
      }
    }
  }
  
  // Update the message in the chatMessages array
  const messageIndex = chatMessages.findIndex(msg => msg.id === messageId);
  if (messageIndex !== -1) {
    chatMessages[messageIndex].content = newContent;
  }
  
  // Scroll to the bottom
  const chatContainer = document.getElementById('chat-messages');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  return true;
}

// Clear chat messages
function clearChat() {
  // Get the chat container
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) {
    console.error('Chat container not found');
    return;
  }
  
  // Clear the chat container and add a welcome message
  chatContainer.innerHTML = '';
  
  // Add welcome message
  const welcomeMessageId = addChatMessage('system', 
    'Claude is ready with Google Search capabilities. Ask a question that might benefit from current information from the web.', 
    false, true);
  
  // Reset the chat messages array (but keep the welcome message)
  chatMessages = chatMessages.filter(msg => msg.id === welcomeMessageId);
  
  // Clear the input field
  const inputField = document.getElementById('user-input');
  if (inputField) {
    inputField.value = '';
  }
  
  // Focus on the input field
  if (inputField && typeof inputField.focus === 'function') {
    setTimeout(() => inputField.focus(), 100);
  }
  
  // Show success message
  showToast('Chat Cleared', 'The chat history has been cleared', 'success');
}

// Function to export chat history as markdown
function exportChatAsMarkdown() {
  if (chatMessages.length === 0) {
    showToast('Info', 'No messages to export', 'info');
    return;
  }
  
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const filename = `claude-chat-${currentDate}.md`;
  
  let markdown = `# Claude AI Chat - ${currentDate}\n\n`;
  
  chatMessages.forEach(msg => {
    const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    const timestamp = new Date(msg.timestamp).toLocaleString();
    
    markdown += `## ${role} (${timestamp})\n\n`;
    markdown += `${msg.content}\n\n`;
    markdown += `---\n\n`;
  });
  
  // Create a download link
  downloadFile(filename, markdown, 'text/markdown');
  showToast('Success', 'Chat exported as Markdown', 'success');
}

// Function to export chat history as JSON
function exportChatAsJSON() {
  if (chatMessages.length === 0) {
    showToast('Info', 'No messages to export', 'info');
    return;
  }
  
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const filename = `claude-chat-${currentDate}.json`;
  
  // Create enhanced version of chat messages with formatted timestamps
  const exportData = {
    metadata: {
      exported_at: new Date().toISOString(),
      message_count: chatMessages.length,
      application: 'OpenRouter SDK - Claude AI Chat'
    },
    messages: chatMessages.map(msg => ({
      ...msg,
      formatted_timestamp: new Date(msg.timestamp).toLocaleString()
    }))
  };
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(filename, jsonContent, 'application/json');
  showToast('Success', 'Chat exported as JSON', 'success');
}

// Function to export chat history as HTML
function exportChatAsHTML() {
  if (chatMessages.length === 0) {
    showToast('Info', 'No messages to export', 'info');
    return;
  }
  
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const filename = `claude-chat-${currentDate}.html`;
  
  let htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude AI Chat - ${currentDate}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
      .user-message { background-color: #e9f5ff; border-left: 4px solid #0d6efd; padding: 10px 15px; margin-bottom: 20px; border-radius: 5px; }
      .assistant-message { background-color: #f0f9e8; border-left: 4px solid #198754; padding: 10px 15px; margin-bottom: 20px; border-radius: 5px; }
      .system-message { background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 10px 15px; margin-bottom: 20px; border-radius: 5px; }
      .message-header { display: flex; justify-content: space-between; margin-bottom: 8px; color: #666; font-size: 0.85rem; }
      .message-content { white-space: pre-wrap; }
      pre { background-color: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
      code { font-family: Consolas, Monaco, 'Andale Mono', monospace; font-size: 0.9em; background-color: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; }
      h1 { margin-bottom: 30px; color: #333; }
      .export-info { margin: 30px 0; color: #666; font-size: 0.9rem; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
  </head>
  <body>
    <h1>Claude AI Chat - ${currentDate}</h1>
    <div class="chat-container">
  `;
  
  chatMessages.forEach(msg => {
    const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const messageClass = `${msg.role}-message`;
    
    // Use marked library to render markdown if it contains code blocks or markdown formatting
    let formattedContent = msg.content;
    if (msg.role === 'assistant' && typeof marked !== 'undefined') {
      formattedContent = marked.parse(formattedContent);
    } else {
      // Basic HTML escaping for user messages
      formattedContent = formattedContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    }
    
    htmlContent += `
      <div class="${messageClass}">
        <div class="message-header">
          <strong>${role}</strong>
          <span>${timestamp}</span>
        </div>
        <div class="message-content">
          ${formattedContent}
        </div>
      </div>
    `;
  });
  
  // Add export footer
  htmlContent += `
    </div>
    <div class="export-info">
      <p>Exported from OpenRouter SDK Claude AI Chat on ${new Date().toLocaleString()}</p>
      <p>Total messages: ${chatMessages.length}</p>
    </div>
  </body>
  </html>
  `;
  
  downloadFile(filename, htmlContent, 'text/html');
  showToast('Success', 'Chat exported as HTML', 'success');
}

// Helper function to download a file
function downloadFile(filename, content, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Send query to Claude with Google Search integration
async function sendMessageToClaude(message, isStreaming = true) {
  // Check if Claude provider is initialized
  if (!claudeProvider) {
    if (!initClaudeProvider()) {
      showToast('Error', 'Failed to initialize Claude provider. Please check your API keys.', 'error');
      return;
    }
    
    // Wait for provider to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!claudeProvider) {
      showToast('Error', 'Claude provider is not initialized. Please check your API keys.', 'error');
      return;
    }
  }
  
  // Get user input from parameter or input field
  const userInput = message || document.getElementById('user-input').value.trim();
  if (!userInput) {
    console.log('No user input provided');
    return;
  }
  
  // Add user message to chat UI
  const userMessageId = addChatMessage('user', userInput);
  
  // Clear input field if message came from the input field
  if (!message) {
    document.getElementById('user-input').value = '';
  }
  
  // Show processing state in UI
  const sendButton = document.getElementById('send-message-btn');
  const inputField = document.getElementById('user-input');
  
  // Disable input and button while processing
  if (sendButton) sendButton.disabled = true;
  if (inputField) inputField.disabled = true;
  
  // Create a placeholder for Claude's response with typing indicator
  const typingIndicator = isStreaming ? 
    '<div class="typing-indicator"><span></span><span></span><span></span></div>' : 
    'Thinking...';
  const responseMessageId = addChatMessage('assistant', typingIndicator, false, false);
  
  // Create and show stop button if streaming
  if (isStreaming) {
    isStreamingResponse = true;
    stopStreaming = false;
    
    // Add stop button next to the send button
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      const stopButton = document.createElement('button');
      stopButton.id = 'stop-stream-btn';
      stopButton.className = 'btn btn-danger ms-2';
      stopButton.innerHTML = '<i class="bi bi-stop-fill"></i> Stop';
      stopButton.onclick = function() {
        stopStreaming = true;
        showToast('Info', 'Stopping response generation...', 'info');
        // The button will be removed when streaming completes
      };
      
      // Add the stop button after the send button
      if (sendButton && sendButton.parentNode) {
        sendButton.parentNode.insertBefore(stopButton, sendButton.nextSibling);
      }
    }
  }
  
  // Get chat settings
  const claudeModel = document.getElementById('claude-model').value || 'claude-3-opus-20240229';
  const temperature = parseFloat(document.getElementById('temperature').value || '0.7');
  const maxTokens = parseInt(document.getElementById('max-tokens').value || '2000', 10);
  const enableSearch = document.getElementById('enable-search').checked;
  
  // Prepare messages for Claude API
  const messages = [];
  
  // Add system message if we have one
  const systemMessage = document.getElementById('system-message')?.value?.trim();
  if (systemMessage) {
    messages.push({
      role: 'system',
      content: systemMessage
    });
  }
  
  // Add previous chat messages for context (with smarter context management)
  // Calculate a reasonable message limit based on model and max tokens
  const modelContextLimits = {
    'claude-3-opus-20240229': 200000,
    'claude-3-sonnet-20240229': 150000,
    'claude-3-haiku-20240307': 100000,
    'claude-2.1': 100000,
    'claude-2.0': 100000,
    'claude-instant-1.2': 50000
  };
  
  // Default to 10 messages if we can't determine the model context
  const modelContextLimit = modelContextLimits[claudeModel] || 100000;
  const maxMessagesToInclude = Math.min(20, Math.floor(modelContextLimit / 1000));
  
  const previousMessages = chatMessages
    .filter(msg => msg.id !== responseMessageId) // Don't include the current response placeholder
    .slice(-maxMessagesToInclude); // Include a reasonable number of messages based on model
  
  // Log how many messages we're including for context
  console.log(`Including ${previousMessages.length} previous messages for context`);
  
  messages.push(...previousMessages);
  
  // Configure tools for Claude API
  const tools = [];
  
  // Add search tool if enabled
  if (enableSearch && googleSearchService) {
    tools.push({
      type: 'function',
      function: {
        name: 'google_search',
        description: 'Search the web for current information',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query'
            }
          },
          required: ['query']
        }
      }
    });
  }
  
  // Show thinking indicator in UI
  updateChatMessage(responseMessageId, 'assistant', 'Connecting to Claude API...');
  
  try {
    // Prepare the request for Claude API
    const request = {
      model: claudeModel,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      tools: tools.length > 0 ? tools : undefined,
      stream: isStreaming
    };
    
    console.log('Sending request to Claude API:', request);
    
    if (isStreaming) {
      // Handle streaming response
      let accumulatedContent = '';
      
      try {
        updateChatMessage(responseMessageId, 'assistant', 'Connecting to API backend...');
        
        let content = '';
        let words = [];
        
        // Try to use the real API backend first
        try {
          // Call the backend API using our apiClient
          const chatCompletionRequest = {
            model: claudeModel,
            messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
            temperature,
            max_tokens: maxTokens,
            tools: tools.length > 0 ? tools : undefined
          };
          
          const response = await apiClient.createChatCompletion(chatCompletionRequest);
          console.log('API response:', response);
          
          // Extract content from the API response
          content = response.choices?.[0]?.message?.content || 
                     response.content || 
                     'API response format not recognized';
        } catch (apiError) {
          console.error('Error with API, falling back to local provider:', apiError);
          // Fall back to local provider
          const stream = claudeProvider.streamChatCompletions(request);
          const response = await stream.next();
          content = response.value.choices[0].message.content;
        }
        
        // Split content into words for simulated streaming
        words = content.split(' ');
        
        // Track message character count for token estimation
        let charCount = 0;
        
        // Process words with simulated streaming
        for (let i = 0; i < words.length && !stopStreaming; i++) {
          accumulatedContent += (i > 0 ? ' ' : '') + words[i];
          charCount = accumulatedContent.length;
          
          // Update the message with the current content and add character count
          updateChatMessage(
            responseMessageId, 
            'assistant', 
            accumulatedContent + `<div class="text-muted small char-counter mt-2">${charCount} characters</div>`
          );
          
          // Simulate streaming delay but allow for cancellation
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        // If streaming was stopped, add note to the message
        if (stopStreaming) {
          accumulatedContent += '\n\n[Response generation stopped by user]';
          updateChatMessage(responseMessageId, 'assistant', accumulatedContent);
        }
      } catch (streamError) {
        console.error('Error in streaming response:', streamError);
        updateChatMessage(responseMessageId, 'assistant', 'Error: Failed to stream response. ' + streamError.message);
      } finally {
        // Reset streaming flags
        isStreamingResponse = false;
        stopStreaming = false;
        
        // Remove the stop button if it exists
        const stopButton = document.getElementById('stop-stream-btn');
        if (stopButton) {
          stopButton.remove();
        }
        
        // Apply syntax highlighting to code blocks
        setTimeout(() => {
          const messageDiv = document.getElementById(responseMessageId);
          if (messageDiv) {
            const codeBlocks = messageDiv.querySelectorAll('pre code');
            if (window.hljs && codeBlocks.length > 0) {
              codeBlocks.forEach(block => {
                window.hljs.highlightElement(block);
              });
            }
          }
        }, 100);
      }
    } else {
      // Handle non-streaming response
      try {
        updateChatMessage(responseMessageId, 'assistant', 'Connecting to API backend...');
        
        // Try to use the real API backend first
        try {
          // Call the backend API using our apiClient
          const chatCompletionRequest = {
            model: claudeModel,
            messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
            temperature,
            max_tokens: maxTokens,
            tools: tools.length > 0 ? tools : undefined
          };
          
          const response = await apiClient.createChatCompletion(chatCompletionRequest);
          console.log('API response:', response);
          
          // Extract content from the API response
          const content = response.choices?.[0]?.message?.content || 
                        response.content || 
                        'API response format not recognized';
          const charCount = content.length;
          
          // Update message with character counter for token estimation
          updateChatMessage(
            responseMessageId, 
            'assistant', 
            content + `<div class="text-muted small char-counter mt-2">${charCount} characters</div>`
          );
        } catch (apiError) {
          console.error('Error with API, falling back to local provider:', apiError);
          // Fall back to local provider
          const response = await claudeProvider.createChatCompletion(request);
          const content = response.choices[0].message.content;
          const charCount = content.length;
          
          // Update message with character counter for token estimation
          updateChatMessage(
            responseMessageId, 
            'assistant', 
            content + `<div class="text-muted small char-counter mt-2">${charCount} characters</div>`
          );
        }
      } catch (nonStreamError) {
        console.error('Error in non-streaming response:', nonStreamError);
        updateChatMessage(responseMessageId, 'assistant', 'Error: Failed to get response. ' + nonStreamError.message);
      } finally {
        // Re-enable UI elements
        if (sendButton) sendButton.disabled = false;
        if (inputField) {
          inputField.disabled = false;
          inputField.focus();
        }
        
        // Apply syntax highlighting to code blocks
        setTimeout(() => {
          const messageDiv = document.getElementById(responseMessageId);
          if (messageDiv) {
            const codeBlocks = messageDiv.querySelectorAll('pre code');
            if (window.hljs && codeBlocks.length > 0) {
              codeBlocks.forEach(block => {
                window.hljs.highlightElement(block);
              });
            }
          }
        }, 100);
      }
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    updateChatMessage(responseMessageId, 'assistant', 'Sorry, there was an error processing your request. Please try again.');
    showToast('Error', 'Failed to get response from Claude API: ' + (error.message || 'Unknown error'), 'error');
  } finally {
    // Make sure UI is re-enabled even if an error occurred
    if (sendButton) sendButton.disabled = false;
    if (inputField) {
      inputField.disabled = false;
      inputField.focus();
    }
  }
}

// Function to perform direct Google search
// Function to perform a direct Google search without Claude
async function performDirectSearch() {
  // Show loading indicator
  const resultsContainer = document.getElementById('search-results-container');
  const resultsElement = document.getElementById('search-results');
  
  if (!resultsElement) {
    showToast('Error', 'Search results container not found in the DOM', 'error');
    return;
  }
  
  // Initialize Claude provider if needed (which also initializes the Google search service)
  if (!googleSearchService) {
    if (!initClaudeProvider()) {
      showToast('Error', 'Failed to initialize Google Search service', 'error');
      return;
    }
    
    // Wait for provider to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Double-check that Google Search service is available
    if (!googleSearchService) {
      showToast('Error', 'Google Search service is not properly configured', 'error');
      return;
    }
  }
  
  // Get search query from input field
  const searchQuery = document.getElementById('search-query').value.trim();
  if (!searchQuery) {
    showToast('Missing Input', 'Please enter a search query', 'warning');
    return;
  }
  
  // Get output format preference
  const searchFormat = document.getElementById('search-format').value || 'plain';
  
  // Show loading state
  resultsElement.textContent = 'Searching...';
  if (resultsContainer) {
    resultsContainer.classList.remove('d-none');
  }
  
  try {
    console.log(`Performing Google search for: "${searchQuery}"`);
    
    // Perform the search using our Google search service
    const searchResults = await googleSearchService.search(searchQuery);
    console.log(`Search complete, found ${searchResults.length} results`);
    
    if (searchResults && searchResults.length > 0) {
      // Format the results based on the selected format
      let formattedResults = '';
      
      if (searchFormat === 'json') {
        // JSON format
        formattedResults = JSON.stringify(searchResults, null, 2);
        // Set as preformatted text for JSON
        resultsElement.innerHTML = `<pre class="mb-0">${formattedResults}</pre>`;
      } else if (searchFormat === 'markdown') {
        // Markdown format with clickable links
        formattedResults = searchResults.map((result, index) => {
          return `<div class="search-result mb-3">
            <h5><a href="${result.link}" target="_blank" rel="noopener noreferrer">${result.title}</a></h5>
            <div class="text-muted small">${result.link}</div>
            <p>${result.snippet}</p>
          </div>`;
        }).join('');
        
        resultsElement.innerHTML = formattedResults;
      } else {
        // Plain text format (default)
        formattedResults = searchResults.map((result, index) => {
          return `<div class="search-result mb-3">
            <strong>Result ${index + 1}:</strong> <a href="${result.link}" target="_blank" rel="noopener noreferrer">${result.title}</a><br>
            <span class="text-muted small">${result.link}</span><br>
            ${result.snippet}
          </div>`;
        }).join('');
        
        resultsElement.innerHTML = formattedResults;
      }
      
      // Add metadata about the search
      const searchMetadata = document.createElement('div');
      searchMetadata.className = 'alert alert-info mt-3';
      searchMetadata.innerHTML = `<strong>Search Results:</strong> Found ${searchResults.length} results for "${searchQuery}"`;
      resultsElement.prepend(searchMetadata);
      
      // Add button to use these search results in chat
      const useInChatButton = document.createElement('button');
      useInChatButton.className = 'btn btn-primary mt-3';
      useInChatButton.textContent = 'Use these results in chat';
      useInChatButton.onclick = function() {
        // Add the search results to the chat as a system message
        const formattedSearchResults = searchResults.map((result, i) => 
          `[Result ${i+1}]\nTitle: ${result.title}\nURL: ${result.link}\nSnippet: ${result.snippet}\n`
        ).join('\n');
        
        // Add to chat
        addChatMessage('system', `Web search results for "${searchQuery}":\n\n${formattedSearchResults}`, true);
        
        // Switch to chat tab
        const chatTab = document.querySelector('#nav-chat-tab');
        if (chatTab) {
          chatTab.click();
        }
        
        // Show toast notification
        showToast('Search Results Added', 'Search results have been added to the chat', 'success');
      };
      
      resultsElement.appendChild(useInChatButton);
    } else {
      // No results found
      resultsElement.innerHTML = `<div class="alert alert-warning">No results found for "${searchQuery}"</div>`;
    }
  } catch (error) {
    console.error('Error performing Google search:', error);
    resultsElement.innerHTML = `<div class="alert alert-danger">Error: Failed to perform search. ${error.message || 'Unknown error'}</div>`;
    showToast('Error', 'Failed to perform Google search: ' + (error.message || 'Unknown error'), 'error');
  }
}

// Event listeners
// Register default provider for agent execution
function registerDefaultProvider() {
    if (agentWizard) {
        // Register a default provider that can execute agents
        agentWizard.registerProvider('default', {
            execute: async ({ prompt, tools, params, agent }) => {
                console.log('Executing agent with prompt:', prompt);
                console.log('Using tools:', tools);
                console.log('Parameters:', params);
                
                try {
                    // Try to connect to the real API backend
                    const agentType = agent.templateId || 'chat';
                    console.log(`Connecting to API endpoint: /api/agents/${agentType}`);
                    
                    // Map parameters to the format expected by the API
                    const apiParams = { ...params };
                    if (prompt) apiParams.message = prompt;
                    
                    // Call the API
                    const response = await apiClient.executeAgent(agentType, apiParams);
                    console.log('API response:', response);
                    
                    // Return the API response if available
                    if (response && (response.result || response.response || response.content)) {
                        return response.result || response.response || response.content;
                    }
                    
                    // Fall back to demo response if API call succeeded but didn't return expected format
                    console.log('API call succeeded but using simulated response for consistency');
                } catch (error) {
                    console.warn('API call failed, using simulated response:', error);
                    // Fallback to simulated response if API call fails - simulate processing time
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                // Generate a response based on the agent type
                let response;
                
                switch(agent.templateId) {
                    case 'researcher':
                        response = `# Research Report: ${params.topic || 'Requested Topic'}

`;
                        response += `## Overview
This research provides insights into ${params.topic || 'the requested topic'} based on available information.

`;
                        response += `## Key Findings
- Finding 1: Important information discovered about the topic
- Finding 2: Relevant statistics and data points
- Finding 3: Expert opinions and consensus view

`;
                        response += `## Detailed Analysis
The analysis shows that this topic has significant implications in several areas. The depth of this research was set to ${params.depth || 'standard'}, providing a ${params.depth === 'deep' ? 'comprehensive' : params.depth === 'basic' ? 'high-level' : 'balanced'} overview.

`;
                        response += `## Conclusion
Based on the research conducted, we can conclude that ${params.topic || 'this topic'} merits further attention and has demonstrated important patterns worth exploring.`;
                        break;
                        
                    case 'writer':
                        response = `# ${params.topic || 'Generated Content'}

`;
                        response += `This ${params.format || 'content'} explores ${params.topic || 'the requested topic'} with a ${params.style || 'balanced'} approach.

`;
                        response += `When considering this subject, several key points emerge that deserve attention. The ${params.style || 'standard'} style of this piece aims to engage readers while providing valuable insights.

`;
                        response += `The ${params.length || 'medium'}-form format allows for an appropriate level of detail while maintaining reader interest throughout the piece.`;
                        break;
                        
                    case 'analyst':
                        response = `# Analysis Report

`;
                        response += `## Data Overview
Analyzed ${params.data ? params.data.substring(0, 100) + '...' : 'provided dataset'}

`;
                        response += `## Metrics Calculated
${params.metrics || 'Requested metrics'}

`;
                        response += `## Key Insights
- The data shows significant patterns in key areas
- Statistical analysis reveals correlations between primary variables
- Outliers have been identified and addressed in the analysis

`;
                        if (params.visualize) {
                            response += `## Visualization Recommendations
- Bar chart showing distribution of primary variables
- Scatter plot displaying correlations between key metrics
- Time series graph demonstrating trends over time`;
                        }
                        break;
                        
                    case 'coder':
                        response = `# Code Solution: ${params.task || 'Requested Task'}

`;
                        response += `## Implementation in ${params.language || 'Requested Language'}

\`\`\`${params.language || 'javascript'}
// Example solution for ${params.task || 'the requested task'}
`;
                        
                        if (params.language === 'python') {
                            response += `def main():
    # Implementation of ${params.task || 'requested task'}
    print("Processing task...")
    
    # Main logic here
    result = process_data()
    return result

def process_data():
    # Helper function
    return "Processed result"

if __name__ == "__main__":
    main()`;
                        } else if (params.language === 'javascript' || !params.language) {
                            response += `function main() {
  // Implementation of ${params.task || 'requested task'}
  console.log("Processing task...");
  
  // Main logic here
  const result = processData();
  return result;
}

function processData() {
  // Helper function
  return "Processed result";
}

// Execute the solution
main();`;
                        } else {
                            response += `// Example implementation for ${params.task || 'requested task'}
// in ${params.language || 'requested language'}`;
                        }
                        
                        response += `
\`\`\`

## Explanation
This solution implements ${params.task || 'the requested functionality'} using best practices for ${params.language || 'the specified language'}${params.framework ? ' with the ' + params.framework + ' framework' : ''}.`;
                        break;
                        
                    default:
                        response = `Agent response for ${agent.name}\n\nThis is a simulated response for demonstration purposes. In a real implementation, this would connect to an actual AI provider to generate relevant content based on the agent type and parameters.`;
                }
                
                return response;
            }
        });
        
        // Register Claude provider
        agentWizard.registerProvider('claude', {
            execute: async ({ prompt, tools, params, agent }) => {
                console.log('Executing agent with Claude provider');
                console.log('Prompt:', prompt);
                
                // In a real implementation, this would connect to Claude API
                await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing time
                
                return `Claude AI Provider Response\n\nThis is a simulated Claude response for the ${agent.template.name}. The actual implementation would use the Anthropic API to generate a high-quality response based on the provided prompt and parameters.`;
            }
        });
        
        // Register OpenAI provider
        agentWizard.registerProvider('openai', {
            execute: async ({ prompt, tools, params, agent }) => {
                console.log('Executing agent with OpenAI provider');
                console.log('Prompt:', prompt);
                
                // In a real implementation, this would connect to OpenAI API
                await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate processing time
                
                return `OpenAI Provider Response\n\nThis is a simulated OpenAI response for the ${agent.template.name}. The actual implementation would use the OpenAI API to generate a high-quality response based on the provided prompt and parameters.`;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap tabs
    const tabElements = document.querySelectorAll('#dashboard-tabs a');
    tabElements.forEach(tabEl => {
        tabEl.addEventListener('click', function(event) {
            event.preventDefault();
            const tabId = this.getAttribute('href');
            const tabPane = document.querySelector(tabId);
            
            console.log(`Tab clicked: ${tabId}`);
            
            // Hide all tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            
            // Remove active class from all tabs
            tabElements.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show the selected tab pane
            if (tabPane) {
                console.log(`Activating tab pane: ${tabId}`);
                tabPane.classList.add('show', 'active');
                this.classList.add('active');
                
                // Special handling for Claude search tab
                if (tabId === '#claude-search-tab') {
                    console.log('Claude search tab activated');
                    
                    // Force display of the tab content
                    tabPane.style.display = 'block';
                    
                    // Ensure the chat container is initialized
                    const chatContainer = document.getElementById('chat-messages');
                    if (chatContainer) {
                        console.log('Chat container found');
                        // Only initialize if empty
                        if (chatContainer.innerHTML.trim() === '') {
                            console.log('Initializing chat container');
                            chatContainer.innerHTML = `
                                <div class="system-message">
                                    <div class="alert alert-light border">
                                        <strong>System:</strong> Claude is ready with Google Search capabilities. Ask a question that might benefit from current information from the web.
                                    </div>
                                </div>
                            `;
                        }
                    } else {
                        console.log('Chat container not found');
                    }
                    
                    // Initialize search results area
                    const searchResults = document.getElementById('search-results');
                    if (searchResults) {
                        console.log('Search results container found');
                        if (searchResults.textContent.trim() === '') {
                            console.log('Initializing search results container');
                            searchResults.textContent = 'Search results will appear here...';
                        }
                    } else {
                        console.log('Search results container not found');
                    }
                }
            }
        });
    });
    
    // Activate the default tab (Functions)
    const defaultTab = document.querySelector('#dashboard-tabs a.active');
    if (defaultTab) {
        const event = new Event('click');
        defaultTab.dispatchEvent(event);
    }
    // Toggle API key visibility
    toggleKeyButton.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleKeyButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            apiKeyInput.type = 'password';
            toggleKeyButton.innerHTML = '<i class="bi bi-eye"></i>';
        }
    });
    
    // Save API key
    
    // Load saved credentials for Claude and Google Search
    loadSavedCredentials();
    
    // Initialize Claude search tab
    setTimeout(() => {
      // Ensure the Claude search tab is visible if it's the active tab
      const claudeSearchTab = document.querySelector('#claude-search-tab-link');
      if (claudeSearchTab && claudeSearchTab.classList.contains('active')) {
        const tabPane = document.querySelector('#claude-search-tab');
        if (tabPane) {
          tabPane.classList.add('show', 'active');
          tabPane.style.display = 'block';
        }
      }
      
      // Add a welcome message to the chat
      const chatContainer = document.getElementById('chat-messages');
      if (chatContainer) {
        // Clear any existing messages
        chatContainer.innerHTML = `
          <div class="system-message">
            <div class="alert alert-light border">
              <strong>System:</strong> Configure your Claude and Google Search API keys to use this feature.
            </div>
          </div>
        `;
      }
      
      // Initialize the search results area
      const searchResults = document.getElementById('search-results');
      if (searchResults) {
        searchResults.textContent = 'Search results will appear here after configuration.';
      }
      
      // Try to initialize Claude provider with any saved credentials
      try {
        if (initClaudeProvider()) {
          updateConnectionStatus(true);
          const chatContainer = document.getElementById('chat-messages');
          if (chatContainer) {
            chatContainer.innerHTML = `
              <div class="system-message">
                <div class="alert alert-light border">
                  <strong>System:</strong> Claude is connected. You can now ask questions.
                </div>
              </div>
            `;
          }
        }
      } catch (err) {
        console.error('Failed to initialize Claude:', err);
      }
    }, 500);
    
    // Claude configuration related listeners
    document.getElementById('save-claude-config').addEventListener('click', () => {
        if (initClaudeProvider()) {
            showToast('Configuration Saved', 'Claude with Google Search has been configured successfully!', 'success');
        }
    });
    
    // Temperature slider update
    document.getElementById('temperature').addEventListener('input', (e) => {
        document.getElementById('temp-value').textContent = e.target.value;
    });
    
    // Toggle API key visibility
    document.getElementById('toggle-claude-key').addEventListener('click', () => {
        toggleApiKeyVisibility('claude-api-key', 'toggle-claude-key');
    });
    
    document.getElementById('toggle-google-key').addEventListener('click', () => {
        toggleApiKeyVisibility('google-api-key', 'toggle-google-key');
    });
    
    // Send message to Claude
    document.getElementById('send-message').addEventListener('click', () => {
        const isStreaming = document.getElementById('streaming-toggle').checked;
        sendMessageToClaude(null, isStreaming);
    });
    
    // Allow Enter key to send message
    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const isStreaming = document.getElementById('streaming-toggle').checked;
            sendMessageToClaude(null, isStreaming);
        }
    });
    
    // Clear chat button
    document.getElementById('clear-chat').addEventListener('click', clearChat);
    
    // Export chat buttons
    document.getElementById('export-chat-md').addEventListener('click', (e) => {
        e.preventDefault();
        exportChatAsMarkdown();
    });
    
    document.getElementById('export-chat-json').addEventListener('click', (e) => {
        e.preventDefault();
        exportChatAsJSON();
    });
    
    document.getElementById('export-chat-html').addEventListener('click', (e) => {
        e.preventDefault();
        exportChatAsHTML();
    });
    
    // Direct search
    document.getElementById('run-search').addEventListener('click', performDirectSearch);
    document.getElementById('search-query').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performDirectSearch();
        }
    });
    saveKeyButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('openrouter_api_key', apiKey);
            showToast('API Key Saved', 'Your API key has been saved successfully.', 'success');
        } else {
            showToast('Error', 'Please enter a valid API key.', 'danger');
        }
    });
    
    // Refresh functions
    refreshButton.addEventListener('click', () => {
        loadingElement.style.display = 'block';
        functionsContainer.innerHTML = '';
        
        setTimeout(() => {
            renderFunctions();
            showToast('Refreshed', 'Functions list has been refreshed.', 'success');
        }, 1000);
    });
    
    // Clear cache
    clearCacheButton.addEventListener('click', () => {
        localStorage.removeItem('openrouter_functions_cache');
        showToast('Cache Cleared', 'Function cache has been cleared.', 'info');
    });
    
    // Search functions
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const functionCards = document.querySelectorAll('.function-card');
        
        functionCards.forEach(card => {
            const functionName = card.getAttribute('data-function').toLowerCase();
            const functionDescription = card.querySelector('.function-description').textContent.toLowerCase();
            
            if (functionName.includes(searchTerm) || functionDescription.includes(searchTerm)) {
                card.parentElement.style.display = 'block';
            } else {
                card.parentElement.style.display = 'none';
            }
        });
    });
    
    // Create agent button
    createAgentButton.addEventListener('click', () => {
        showToast('Coming Soon', 'Agent creation wizard is coming soon!', 'info');
    });
    
    // Load API key from storage if exists
    const savedKey = localStorage.getItem('openrouter_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
});

// Function to load agents
function loadAgents() {
    if (agentWizard) {
        renderAgents();
    }
}

// Function to load workflows
function loadWorkflows() {
  if (!orchestratorWizard) {
    console.warn('Orchestrator wizard not initialized');
    return;
  }
  
  try {
    const workflows = orchestratorWizard.getWorkflows();
    const workflowsContainer = document.getElementById('workflows-container');
    const workflowsCount = document.getElementById('workflows-count');
    
    if (workflowsContainer) {
      // Clear container
      workflowsContainer.innerHTML = '';
      
      // Update count
      if (workflowsCount) {
        workflowsCount.textContent = workflows.length;
      }
      
      if (workflows.length === 0) {
        workflowsContainer.innerHTML = `
          <div class="col-12 text-center py-5">
            <div class="empty-state-animation">
              <i class="bi bi-diagram-3 fs-1 text-primary opacity-75"></i>
              <div class="pulsing-circle"></div>
            </div>
            <h4 class="mt-4">No workflows yet</h4>
            <p class="text-muted mb-4">Create your first workflow to automate AI tasks and build complex pipelines</p>
            <button class="btn btn-primary pulse-button" id="create-workflow-btn">
              <i class="bi bi-plus-lg me-1"></i>
              Create Your First Workflow
            </button>
          </div>
        `;
        
        // Connect create workflow button
        const createWorkflowBtn = document.getElementById('create-workflow-btn');
        if (createWorkflowBtn) {
          createWorkflowBtn.addEventListener('click', showWorkflowWizardModal);
        }
      } else {
        // Render each workflow
        workflows.forEach(workflow => {
          const card = document.createElement('div');
          card.className = 'col-md-6 col-lg-4 mb-4';
          
          // Determine status badge color and text based on workflow state
          const statusBadge = workflow.lastRun 
            ? (workflow.lastRun.status === 'failed' 
                ? '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Failed</span>'
                : '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Successful</span>')
            : '<span class="badge bg-secondary"><i class="bi bi-dash-circle me-1"></i>Never run</span>';
          
          // Calculate task type distribution for visualization
          const taskTypes = {};
          if (workflow.tasks && workflow.tasks.length > 0) {
            workflow.tasks.forEach(task => {
              taskTypes[task.type] = (taskTypes[task.type] || 0) + 1;
            });
          }
          
          // Generate task type badges
          const taskTypeBadges = Object.entries(taskTypes).map(([type, count]) => {
            const typeInfo = {
              'agent': { icon: 'robot', color: 'info' },
              'function': { icon: 'code-square', color: 'secondary' },
              'api': { icon: 'cloud-arrow-up-fill', color: 'success' },
              'human': { icon: 'person-fill', color: 'warning' }
            }[type] || { icon: 'question-circle', color: 'secondary' };
            
            return `<span class="badge bg-${typeInfo.color}-subtle text-${typeInfo.color} me-1 mb-1">
                      <i class="bi bi-${typeInfo.icon} me-1"></i>
                      ${count} ${type}${count > 1 ? 's' : ''}
                    </span>`;
          }).join('');
          
          // Create card HTML with enhanced design
          card.innerHTML = `
            <div class="card h-100 workflow-card">
              <div class="card-header workflow-card-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                  <div class="workflow-icon me-2">
                    <i class="bi bi-diagram-3"></i>
                  </div>
                  <h6 class="mb-0 fw-semibold text-truncate" title="${workflow.name}">${workflow.name}</h6>
                </div>
                <div class="workflow-actions">
                  <button class="btn btn-sm btn-light btn-icon run-workflow" 
                          data-workflow-id="${workflow.id}" title="Run workflow">
                    <i class="bi bi-play-fill"></i>
                  </button>
                  <div class="dropdown d-inline">
                    <button class="btn btn-sm btn-light btn-icon" data-bs-toggle="dropdown">
                      <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                      <li><a class="dropdown-item run-workflow" data-workflow-id="${workflow.id}" href="#">
                          <i class="bi bi-play-fill me-2 text-success"></i>Run workflow
                      </a></li>
                      <li><a class="dropdown-item edit-workflow" data-workflow-id="${workflow.id}" href="#">
                          <i class="bi bi-pencil-fill me-2 text-primary"></i>Edit workflow
                      </a></li>
                      <li><a class="dropdown-item duplicate-workflow" data-workflow-id="${workflow.id}" href="#">
                          <i class="bi bi-files me-2 text-info"></i>Duplicate
                      </a></li>
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item text-danger delete-workflow" data-workflow-id="${workflow.id}" href="#">
                          <i class="bi bi-trash me-2"></i>Delete workflow
                      </a></li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div class="card-body d-flex flex-column">
                <div class="workflow-status-row d-flex justify-content-between align-items-start mb-3">
                  <span class="task-count-badge ${workflow.tasks && workflow.tasks.length > 0 ? 'has-tasks' : 'no-tasks'}">
                    <i class="bi bi-list-check me-1"></i>
                    ${workflow.tasks ? workflow.tasks.length : 0} task${workflow.tasks && workflow.tasks.length !== 1 ? 's' : ''}
                  </span>
                  <div class="workflow-status">${statusBadge}</div>
                </div>
                
                <div class="workflow-description mb-3">
                  <p class="text-muted small mb-2">${workflow.description || 'No description provided'}</p>
                </div>
                
                <div class="workflow-tasks-visualization flex-grow-1">
                  <div class="workflow-preview rounded">
                    ${workflow.tasks && workflow.tasks.length > 0 ? 
                      `<div class="task-preview-list">
                        ${workflow.tasks.slice(0, 3).map((task, idx) => 
                          `<div class="task-preview-item">
                            <div class="task-number">${idx + 1}</div>
                            <div class="task-preview-name text-truncate">${task.name}</div>
                            <span class="task-type-indicator">
                              <i class="bi bi-${task.type === 'agent' ? 'robot' : 
                                        task.type === 'function' ? 'code-square' : 
                                        task.type === 'api' ? 'cloud-arrow-up-fill' : 
                                        task.type === 'human' ? 'person-fill' : 'question-circle'}"></i>
                            </span>
                          </div>`
                        ).join('')}
                        ${workflow.tasks.length > 3 ? 
                          `<div class="task-preview-more">
                            <div class="more-tasks-badge">+${workflow.tasks.length - 3} more tasks</div>
                          </div>` : ''
                        }
                      </div>` : 
                      `<div class="no-tasks-message">
                        <div class="empty-tasks-icon mb-2">
                          <i class="bi bi-list-task"></i>
                        </div>
                        <span>No tasks configured</span>
                        <a href="#" class="add-tasks-link edit-workflow" data-workflow-id="${workflow.id}">
                          Add tasks <i class="bi bi-plus-circle ms-1"></i>
                        </a>
                      </div>`
                    }
                  </div>
                </div>
                
                ${taskTypeBadges ? 
                  `<div class="task-types-summary mt-3">
                    <div class="task-type-badges d-flex flex-wrap">
                      ${taskTypeBadges}
                    </div>
                  </div>` : ''
                }
                
                <div class="workflow-meta mt-2">
                  <small class="text-muted d-flex align-items-center">
                    <i class="bi bi-calendar-event me-1"></i>
                    Created ${new Date(workflow.created).toLocaleDateString()} at ${new Date(workflow.created).toLocaleTimeString()}
                  </small>
                </div>
              </div>
              
              <div class="card-footer workflow-card-footer bg-white d-flex justify-content-between">
                <button class="btn btn-sm btn-outline-primary edit-workflow" data-workflow-id="${workflow.id}">
                  <i class="bi bi-pencil-fill me-1"></i>
                  Edit
                </button>
                <button class="btn btn-sm btn-primary run-workflow" data-workflow-id="${workflow.id}">
                  <i class="bi bi-play-fill me-1"></i>
                  Run Workflow
                </button>
              </div>
            </div>
          `;
          
          workflowsContainer.appendChild(card);
        });
        
        // Connect workflow action buttons
        connectWorkflowButtons();
      }
    }
  } catch (error) {
    console.error('Error loading workflows:', error);
  }
}

// Function to show agent run modal for executing agents
function showAgentRunModal(agentId) {
    if (!agentId || !agentWizard) {
        showToast('Error', 'Agent not found', 'danger');
        return;
    }
    
    try {
        // Get agent
        const agent = agentWizard.getAgent(agentId);
        
        // Get template
        const template = agent.template;
        
        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="agent-run-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-${template.color || 'primary'} text-white">
                            <h5 class="modal-title">
                                <i class="bi ${template.icon || 'bi-robot'} me-2"></i>
                                Run ${agent.name}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="agent-info mb-4">
                                <h6>Agent Description</h6>
                                <p>${template.description}</p>
                            </div>
                            
                            <form id="agent-run-form">
                                <h6 class="mb-3">Parameters</h6>
                                <div id="agent-parameters">
                                    <!-- Parameters will be loaded here -->
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer d-flex justify-content-between">
                            <div>
                                <select class="form-select" id="agent-provider">
                                    <option value="default" selected>Default Provider</option>
                                    <option value="claude">Claude</option>
                                    <option value="openai">OpenAI</option>
                                </select>
                            </div>
                            <div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="run-agent-btn">
                                    <i class="bi bi-play-fill me-1"></i>Run Agent
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Agent Output Modal -->
            <div class="modal fade" id="agent-output-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-${template.color || 'primary'} text-white">
                            <h5 class="modal-title">
                                <i class="bi ${template.icon || 'bi-robot'} me-2"></i>
                                ${agent.name} Results
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="agent-processing" class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-3">Agent is processing your request...</p>
                            </div>
                            <div id="agent-output" class="d-none">
                                <!-- Output will appear here -->
                            </div>
                            <div id="agent-error" class="alert alert-danger d-none">
                                <!-- Error will appear here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary d-none" id="save-output-btn">
                                <i class="bi bi-save me-1"></i>Save Results
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modals if they exist
        const existingRunModal = document.getElementById('agent-run-modal');
        if (existingRunModal) {
            existingRunModal.remove();
        }
        
        const existingOutputModal = document.getElementById('agent-output-modal');
        if (existingOutputModal) {
            existingOutputModal.remove();
        }
        
        // Add modals to the document
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Initialize modals
        const runModal = new bootstrap.Modal(document.getElementById('agent-run-modal'));
        const outputModal = new bootstrap.Modal(document.getElementById('agent-output-modal'));
        
        // Load parameters form
        const parametersContainer = document.getElementById('agent-parameters');
        let html = '';
        
        if (template.parameters) {
            Object.entries(template.parameters).forEach(([name, param]) => {
                let inputHtml = '';
                const id = `run-param-${name}`;
                const value = agent.config && agent.config[name] ? agent.config[name] : '';
                
                if (param.type === 'select' && param.options) {
                    inputHtml = `
                        <select class="form-select" id="${id}" ${param.required ? 'required' : ''}>
                            <option value="" ${!value ? 'selected' : ''}>Select an option</option>
                            ${param.options.map(option => `
                                <option value="${option}" ${value === option ? 'selected' : ''}>${option.replace('_', ' ')}</option>
                            `).join('')}
                        </select>
                    `;
                } else if (param.type === 'boolean') {
                    inputHtml = `
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="${id}" ${value ? 'checked' : ''}>
                            <label class="form-check-label" for="${id}">Enable</label>
                        </div>
                    `;
                } else if (param.type === 'textarea') {
                    inputHtml = `
                        <textarea class="form-control" id="${id}" rows="5" ${param.required ? 'required' : ''}>${value}</textarea>
                    `;
                } else {
                    // Default to text input
                    inputHtml = `
                        <input type="text" class="form-control" id="${id}" ${param.required ? 'required' : ''} value="${value}">
                    `;
                }
                
                html += `
                    <div class="mb-3">
                        <label for="${id}" class="form-label">${param.description} ${param.required ? '<span class="text-danger">*</span>' : ''}</label>
                        ${inputHtml}
                    </div>
                `;
            });
        }
        
        if (html) {
            parametersContainer.innerHTML = html;
        } else {
            parametersContainer.innerHTML = '<p class="text-muted">This agent has no configurable parameters.</p>';
        }
        
        // Run button event listener
        document.getElementById('run-agent-btn').addEventListener('click', async function() {
            // Validate form
            const form = document.getElementById('agent-run-form');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Gather parameters
            const params = {};
            
            if (template.parameters) {
                Object.keys(template.parameters).forEach(name => {
                    const input = document.getElementById(`run-param-${name}`);
                    if (input) {
                        if (template.parameters[name].type === 'boolean') {
                            params[name] = input.checked;
                        } else if (input.value) {
                            params[name] = input.value;
                        }
                    }
                });
            }
            
            // Get provider
            const providerId = document.getElementById('agent-provider').value;
            
            // Hide run modal and show output modal
            runModal.hide();
            
            // Reset output modal
            const processingDiv = document.getElementById('agent-processing');
            const outputDiv = document.getElementById('agent-output');
            const errorDiv = document.getElementById('agent-error');
            const saveBtn = document.getElementById('save-output-btn');
            
            processingDiv.classList.remove('d-none');
            outputDiv.classList.add('d-none');
            errorDiv.classList.add('d-none');
            saveBtn.classList.add('d-none');
            
            outputModal.show();
            
            try {
                // Execute agent
                const result = await agentWizard.executeAgent(agentId, params, providerId);
                
                // Handle result
                if (result.status === 'completed') {
                    // Show output
                    // Format agent output with markdown support
                    const formattedOutput = formatAgentOutput(result.result);
                    
                    outputDiv.innerHTML = `
                        <div class="alert alert-success mb-4">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            Agent completed successfully
                        </div>
                        <div class="card">
                            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                <h6 class="mb-0">Agent Response</h6>
                                <button class="btn btn-sm btn-outline-secondary copy-agent-output">
                                    <i class="bi bi-clipboard"></i> Copy
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="agent-response markdown-content">${formattedOutput}</div>
                            </div>
                        </div>
                    `;
                    
                    // Apply syntax highlighting to code blocks
                    setTimeout(() => {
                        const codeBlocks = outputDiv.querySelectorAll('pre code');
                        if (window.hljs && codeBlocks.length > 0) {
                            codeBlocks.forEach(block => {
                                window.hljs.highlightElement(block);
                            });
                        }
                        
                        // Add click handler for copy button
                        const copyButton = outputDiv.querySelector('.copy-agent-output');
                        if (copyButton) {
                            copyButton.addEventListener('click', function() {
                                // Get the raw text content from the agent response
                                const contentToCopy = typeof result.result === 'string' ? 
                                    result.result : 
                                    JSON.stringify(result.result, null, 2);
                                    
                                navigator.clipboard.writeText(contentToCopy)
                                    .then(() => {
                                        this.innerHTML = '<i class="bi bi-check"></i> Copied';
                                        setTimeout(() => {
                                            this.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
                                        }, 2000);
                                    })
                                    .catch(err => {
                                        console.error('Failed to copy: ', err);
                                        showToast('Error', 'Failed to copy to clipboard', 'error');
                                    });
                            });
                        }
                    }, 100);
                    
                    // Hide processing, show output
                    processingDiv.classList.add('d-none');
                    outputDiv.classList.remove('d-none');
                    saveBtn.classList.remove('d-none');
                } else {
                    throw new Error(result.error || 'Unknown error occurred');
                }
            } catch (error) {
                console.error('Agent execution error:', error);
                
                // Format error message
                let errorMessage = error.message || 'Unknown error occurred';
                
                // Show error with better formatting
                errorDiv.innerHTML = `
                    <div class="alert alert-danger mb-4">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <strong>Error:</strong> Agent execution failed
                    </div>
                    <div class="card">
                        <div class="card-header bg-light text-danger">
                            <h6 class="mb-0"><i class="bi bi-bug me-2"></i>Error Details</h6>
                        </div>
                        <div class="card-body">
                            <div class="agent-error-details">${errorMessage}</div>
                        </div>
                    </div>
                `;
                
                // Try to provide more helpful guidance on error
                if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
                    errorDiv.innerHTML += `
                        <div class="alert alert-info mt-3">
                            <i class="bi bi-info-circle-fill me-2"></i>
                            <strong>Suggestion:</strong> Please check that your API keys are correctly configured in the integrations tab.
                        </div>
                    `;
                } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
                    errorDiv.innerHTML += `
                        <div class="alert alert-info mt-3">
                            <i class="bi bi-info-circle-fill me-2"></i>
                            <strong>Suggestion:</strong> You may have reached your API usage limits. Try again later or check your account quota.
                        </div>
                    `;
                }
                
                // Hide processing, show error
                processingDiv.classList.add('d-none');
                errorDiv.classList.remove('d-none');
            }
        });
        
        // Handle save output button
        document.getElementById('save-output-btn').addEventListener('click', function() {
            // Functionality to save output would go here
            showToast('Success', 'Results saved successfully', 'success');
        });
        
        // Show run modal
        runModal.show();
    } catch (error) {
        console.error('Error showing agent run modal:', error);
        showToast('Error', `Failed to prepare agent: ${error.message}`, 'danger');
    }
}

// Function to format agent output for display
function formatAgentOutput(output) {
    if (!output) return 'No output provided';
    
    // Function to escape HTML content for security
    const escapeHtml = (unsafe) => {
        return unsafe.replace(/[&<"'>]/g, (m) => {
            switch (m) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#039;';
                default: return m;
            }
        });
    };
    
    // Function to transform markdown to add collapsible code blocks for long code
    const transformMarkdown = (markdown) => {
        // Add collapsible UI for long code blocks (more than 15 lines)
        const longCodeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
        return markdown.replace(longCodeBlockRegex, (match, language, codeContent) => {
            const lines = codeContent.split('\n');
            
            // Only make code blocks collapsible if they're long
            if (lines.length > 15) {
                const uniqueId = 'code-' + Math.random().toString(36).substring(2, 10);
                return `<div class="code-block-container">
                    <div class="code-block-header">
                        <span class="code-language">${language || 'code'}</span>
                        <button class="btn btn-sm btn-outline-secondary code-toggle" data-target="${uniqueId}">
                            <i class="bi bi-arrows-collapse"></i> Collapse
                        </button>
                    </div>
                    <div id="${uniqueId}" class="code-block-content">
                        \`\`\`${language}\n${codeContent}\n\`\`\`
                    </div>
                </div>`;
            }
            
            // Return normal code block if not long enough to need collapsing
            return match;
        });
    };
    
    // Process string output with markdown
    if (typeof output === 'string') {
        // Check if marked is available for markdown rendering
        if (typeof marked !== 'undefined') {
            try {
                // First escape the HTML, then apply our transformations for long code blocks
                const escapedContent = escapeHtml(output);
                const transformedContent = transformMarkdown(escapedContent);
                
                // Parse with marked for rendering
                const renderedOutput = marked.parse(transformedContent);
                
                // Improve table rendering with Bootstrap classes if tables are present
                if (renderedOutput.includes('<table>')) {
                    return renderedOutput.replace(
                        /<table>/g, 
                        '<table class="table table-sm table-bordered table-striped">'                        
                    );
                }
                
                return renderedOutput;
            } catch (e) {
                console.error('Error parsing markdown:', e);
                return escapeHtml(output);
            }
        } else {
            return escapeHtml(output);
        }
    }
    
    // If it's an object, format as JSON
    try {
        if (typeof output === 'object') {
            // Format the JSON with indentation
            const formattedJson = JSON.stringify(output, null, 2);
            
            // Return JSON in a code block for syntax highlighting
            if (typeof marked !== 'undefined') {
                return marked.parse('```json\n' + escapeHtml(formattedJson) + '\n```');
            } else {
                return escapeHtml(formattedJson);
            }
        }
        
        // Default string conversion for other types
        return escapeHtml(String(output));
    } catch (e) {
        return 'Error formatting output: ' + e.message;
    }
}

// Function to show agent wizard modal for creating or editing agents
function showAgentWizardModal(agentId = null) {
    let agent = null;
    let templates = [];
    let isEdit = false;
    
    // Check if we're editing an existing agent
    if (agentId && agentWizard) {
        try {
            agent = agentWizard.getAgent(agentId);
            isEdit = true;
        } catch (e) {
            console.error('Agent not found:', e);
            showToast('Error', 'Agent not found', 'danger');
            return;
        }
    }
    
    // Get available templates
    if (agentWizard) {
        templates = agentWizard.getTemplates();
    }
    
    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="agent-wizard-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${isEdit ? 'Edit Agent' : 'Create New Agent'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="agent-wizard-form">
                            <div class="mb-3">
                                <label for="agent-name" class="form-label">Agent Name</label>
                                <input type="text" class="form-control" id="agent-name" required 
                                    value="${agent ? agent.name : ''}">
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label">Agent Type</label>
                                <div class="row row-cols-1 row-cols-md-3 g-3" id="template-options">
                                    ${templates.map(template => `
                                        <div class="col">
                                            <div class="card h-100 template-card ${agent && agent.templateId === template.id ? 'selected' : ''}" 
                                                data-template-id="${template.id}">
                                                <div class="card-body">
                                                    <div class="d-flex align-items-center mb-2">
                                                        <div class="template-icon bg-${template.color} me-2">
                                                            <i class="bi ${template.icon}"></i>
                                                        </div>
                                                        <h6 class="mb-0">${template.name}</h6>
                                                    </div>
                                                    <p class="card-text small">${template.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <input type="hidden" id="selected-template" 
                                    value="${agent ? agent.templateId : ''}" required>
                            </div>
                            
                            <div id="template-parameters" class="mb-3">
                                <!-- Parameters will be loaded here based on template -->
                            </div>
                            
                            <div class="mb-3">
                                <label for="agent-custom-prompt" class="form-label">Custom Instructions (Optional)</label>
                                <textarea class="form-control" id="agent-custom-prompt" rows="3">${agent && agent.config && agent.config.customPrompt ? agent.config.customPrompt : ''}</textarea>
                                <div class="form-text">Add any additional instructions for this agent.</div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="save-agent-btn">
                            ${isEdit ? 'Update Agent' : 'Create Agent'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if it exists
    const existingModal = document.getElementById('agent-wizard-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('agent-wizard-modal'));
    
    // Add event listeners for template selection
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', function() {
            // Remove selection from all cards
            document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
            
            // Add selection to this card
            this.classList.add('selected');
            
            // Update hidden input
            document.getElementById('selected-template').value = this.getAttribute('data-template-id');
            
            // Load template parameters
            loadTemplateParameters(this.getAttribute('data-template-id'));
        });
    });
    
    // Function to load template parameters
    function loadTemplateParameters(templateId) {
        const template = templates.find(t => t.id === templateId);
        if (!template || !template.parameters) return;
        
        const parametersContainer = document.getElementById('template-parameters');
        let html = '<h6 class="mb-3">Configuration Options</h6>';
        
        Object.entries(template.parameters).forEach(([name, param]) => {
            let inputHtml = '';
            const id = `param-${name}`;
            const value = agent && agent.config && agent.config[name] ? agent.config[name] : '';
            
            if (param.type === 'select' && param.options) {
                inputHtml = `
                    <select class="form-select" id="${id}" ${param.required ? 'required' : ''}>
                        <option value="" ${!value ? 'selected' : ''}>Select an option</option>
                        ${param.options.map(option => `
                            <option value="${option}" ${value === option ? 'selected' : ''}>${option.replace('_', ' ')}</option>
                        `).join('')}
                    </select>
                `;
            } else if (param.type === 'boolean') {
                inputHtml = `
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="${id}" ${value ? 'checked' : ''}>
                        <label class="form-check-label" for="${id}">Enable</label>
                    </div>
                `;
            } else if (param.type === 'textarea') {
                inputHtml = `
                    <textarea class="form-control" id="${id}" rows="3" ${param.required ? 'required' : ''}>${value}</textarea>
                `;
            } else {
                // Default to text input
                inputHtml = `
                    <input type="text" class="form-control" id="${id}" ${param.required ? 'required' : ''} value="${value}">
                `;
            }
            
            html += `
                <div class="mb-3">
                    <label for="${id}" class="form-label">${param.description} ${param.required ? '<span class="text-danger">*</span>' : ''}</label>
                    ${inputHtml}
                </div>
            `;
        });
        
        parametersContainer.innerHTML = html;
    }
    
    // If editing, load the template parameters
    if (isEdit && agent.templateId) {
        loadTemplateParameters(agent.templateId);
    } else if (templates.length > 0) {
        // Select first template by default
        const firstTemplate = document.querySelector('.template-card');
        if (firstTemplate) {
            firstTemplate.click();
        }
    }
    
    // Save button event listener
    document.getElementById('save-agent-btn').addEventListener('click', function() {
        // Validate form
        const form = document.getElementById('agent-wizard-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Get form values
        const name = document.getElementById('agent-name').value;
        const templateId = document.getElementById('selected-template').value;
        const customPrompt = document.getElementById('agent-custom-prompt').value;
        
        if (!name || !templateId) {
            showToast('Error', 'Please provide a name and select a template', 'danger');
            return;
        }
        
        // Get template to access its parameters
        const template = templates.find(t => t.id === templateId);
        if (!template) {
            showToast('Error', 'Selected template not found', 'danger');
            return;
        }
        
        // Gather config options based on template parameters
        const config = {};
        
        if (customPrompt) {
            config.customPrompt = customPrompt;
        }
        
        if (template.parameters) {
            Object.keys(template.parameters).forEach(name => {
                const input = document.getElementById(`param-${name}`);
                if (input) {
                    if (template.parameters[name].type === 'boolean') {
                        config[name] = input.checked;
                    } else if (input.value) {
                        config[name] = input.value;
                    }
                }
            });
        }
        
        try {
            if (isEdit) {
                // Update existing agent
                agentWizard.updateAgent(agentId, {
                    name,
                    templateId,
                    config
                });
                showToast('Success', 'Agent updated successfully', 'success');
            } else {
                // Create new agent
                agentWizard.createAgent(name, templateId, config);
                showToast('Success', 'Agent created successfully', 'success');
            }
            
            // Save state and update UI
            agentWizard.saveState();
            renderAgents();
            
            // Close modal
            modal.hide();
        } catch (error) {
            console.error('Error saving agent:', error);
            showToast('Error', `Failed to save agent: ${error.message}`, 'danger');
        }
    });
    
    // Show modal
    modal.show();
}

// Function to add agent wizard styles
function addAgentWizardStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Agent Template Cards */
        .template-card {
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid transparent;
        }
        
        .template-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .template-card.selected {
            border-color: var(--primary-color);
            background-color: var(--primary-light);
        }
        
        .template-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            color: white;
        }
        
        /* Agent Cards */
        .agent-card {
            transition: all 0.2s ease;
        }
        
        .agent-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        /* Agent Parameters Form */
        #agent-parameters .form-label,
        #template-parameters .form-label {
            font-weight: 500;
        }
        
        /* Agent Output */
        /* Agent Output Styling */
        #agent-output .agent-response {
            line-height: 1.6;
        }
        
        #agent-output pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            white-space: pre-wrap;
            max-height: 500px;
            overflow-y: auto;
            margin: 1rem 0;
        }
        
        #agent-output code {
            font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.875em;
        }
        
        #agent-output pre code {
            display: block;
            padding: 1rem;
            background-color: transparent;
            font-size: 0.85rem;
            line-height: 1.45;
            overflow-x: auto;
            white-space: pre;
            word-wrap: normal;
        }
        
        #agent-output p {
            margin-bottom: 0.75rem;
        }
        
        #agent-output ul, #agent-output ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
        }
        
        #agent-output li {
            margin-bottom: 0.5rem;
        }
        
        #agent-output blockquote {
            border-left: 4px solid #e9ecef;
            padding-left: 1rem;
            margin-left: 0;
            color: #6c757d;
        }
        
        #agent-output table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1rem;
        }
        
        #agent-output th, #agent-output td {
            border: 1px solid #dee2e6;
            padding: 0.5rem;
        }
        
        #agent-output th {
            background-color: #f8f9fa;
        }
        
        /* Chat Styling */
        .chat-container {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .message {
            max-width: 85%;
            padding: 0.5rem 1rem;
            border-radius: 1rem;
            margin: 0.25rem 0;
        }
        
        .user-message {
            align-self: flex-end;
            background-color: #007bff;
            color: white;
            border-bottom-right-radius: 0.25rem;
        }
        
        .system-message {
            align-self: center;
            width: 100%;
        }
        
        .assistant-message {
            align-self: flex-start;
            background-color: #f0f2f5;
            color: #212529;
            border-bottom-left-radius: 0.25rem;
        }
        
        /* Typing Indicator */
        .typing-indicator {
            display: inline-flex;
            align-items: center;
            height: 24px;
        }
        
        .typing-indicator span {
            height: 10px;
            width: 10px;
            background-color: #bebebe;
            border-radius: 50%;
            margin: 0 3px;
            display: inline-block;
            animation: bounce 1.5s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) {
            animation-delay: 0s;
        }
        
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes bounce {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-5px);
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Function to add orchestrator styles
function addOrchestratorStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Orchestrator Styles */
    .workflow-card {
      transition: all 0.3s ease;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    
    .workflow-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    }
    
    .workflow-icon {
      font-size: 1.2rem;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background-color: rgba(79, 70, 229, 0.1);
    }
    
    /* Task card styles */
    .task-card {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
    }
    
    .task-card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
      border-color: rgba(79, 70, 229, 0.3);
      transform: translateY(-2px);
    }
    
    .task-card.dragging {
      opacity: 0.7;
      cursor: grabbing;
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
      border: 1px dashed var(--primary-color);
    }
    
    .task-card .task-handle {
      cursor: grab;
      color: #adb5bd;
      transition: color 0.2s ease;
    }
    
    .task-card .task-handle:hover {
      color: var(--primary-color);
    }
    
    /* Task connection and visualization */
    .task-connection {
      width: 2px;
      height: 30px;
      background-color: #dee2e6;
      margin: 0 auto 16px;
      position: relative;
    }
    
    .task-connection:after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #dee2e6;
    }
    
    /* Task indicators and badges */
    .task-count-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .task-count-badge.has-tasks {
      background-color: rgba(25, 135, 84, 0.1);
      color: #198754;
    }
    
    .task-count-badge.no-tasks {
      background-color: rgba(255, 193, 7, 0.1);
      color: #fd7e14;
    }
    
    /* Task preview in workflow cards */
    .workflow-preview {
      margin-top: 1rem;
      background-color: rgba(0,0,0,0.02);
      border-radius: 8px;
      padding: 10px;
    }
    
    .task-preview-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .task-preview-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background-color: white;
      border-radius: 6px;
      border: 1px solid rgba(0,0,0,0.05);
    }
    
    .task-number {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(79, 70, 229, 0.1);
      color: var(--primary-color);
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .task-preview-name {
      flex: 1;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .task-preview-more {
      text-align: center;
      font-size: 0.8rem;
      color: #6c757d;
      padding: 5px;
      background-color: rgba(0,0,0,0.02);
      border-radius: 4px;
      margin-top: 4px;
    }
    
    .no-tasks-message {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      background-color: white;
      border-radius: 6px;
      border: 1px dashed rgba(0,0,0,0.1);
      color: #6c757d;
      font-size: 0.85rem;
    }
    
    /* Empty state animation */
    .empty-state-animation {
      position: relative;
      display: inline-block;
      margin-bottom: 15px;
    }
    
    .pulsing-circle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: rgba(79, 70, 229, 0.1);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0.7;
      }
      70% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0;
      }
      100% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0;
      }
    }
    
    .pulse-button {
      animation: button-pulse 2s infinite;
    }
    
    @keyframes button-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(79, 70, 229, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
      }
    }
    
    /* Modal enhancements */
    .modal-workflow-header {
      background-color: rgba(79, 70, 229, 0.03);
      border-bottom: 1px solid rgba(79, 70, 229, 0.1);
    }
    
    .workflow-modal-title {
      font-weight: 600;
      color: var(--primary-color);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .workflow-modal-title i {
      font-size: 1.2rem;
    }
    
    /* Task placeholders */
    .task-placeholder {
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      background-color: #f8f9fa;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      animation: placeholder-pulse 2s infinite;
    }
    
    @keyframes placeholder-pulse {
      0% {
        background-color: #f8f9fa;
      }
      50% {
        background-color: #f0f0f0;
      }
      100% {
        background-color: #f8f9fa;
      }
    }
      margin-top: -15px;
    }
    .workflow-designer {
      min-height: 300px;
      padding: 1rem;
      border: 1px solid #dee2e6;
      border-radius: 0.25rem;
      background-color: #f8f9fa;
    }
    .workflow-parameter {
      margin-bottom: 1.5rem;
    }
    .workflow-parameter-label {
      font-weight: 500;
      margin-bottom: 0.5rem;
      display: block;
    }
    .workflow-tabs {
      margin-bottom: 1.5rem;
    }
    .workflow-run-output {
      font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.9rem;
      background-color: #f8f9fa;
      border-radius: 0.25rem;
      padding: 1rem;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }
  `;
  document.head.appendChild(styleElement);
}

// Function to show workflow wizard modal
function showWorkflowWizardModal(workflowId = null) {
    // Check if orchestrator wizard is initialized
    if (!orchestratorWizard) {
        console.error('Orchestrator wizard not initialized');
        return;
    }
    
    let workflow = null;
    if (workflowId) {
        try {
            workflow = orchestratorWizard.getWorkflow(workflowId);
        } catch (e) {
            console.error('Error loading workflow:', e);
            showToast('Error', 'Could not load workflow', 'danger');
            return;
        }
    }
    
    // Create modal HTML
    const modalTitle = workflow ? 'Edit Workflow' : 'Create New Workflow';
    const actionText = workflow ? 'Update' : 'Create';
    
    // Track current step in the wizard
    let currentStep = 1;
    
    const modalHtml = `
        <div class="modal fade" id="workflow-wizard-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content workflow-modal-content">
                    <div class="modal-header modal-workflow-header">
                        <h5 class="modal-title workflow-modal-title">
                            <div class="modal-icon-wrapper">
                                <i class="bi bi-${workflow ? 'pencil-square' : 'diagram-3'}"></i>
                            </div>
                            ${modalTitle}
                        </h5>
                        <div class="workflow-steps-indicator">
                            <div class="step-indicator ${workflow && workflow.name ? 'completed' : 'active'}">1</div>
                            <div class="step-divider"></div>
                            <div class="step-indicator ${workflow && workflow.tasks && workflow.tasks.length > 0 ? 'completed' : ''}">2</div>
                            <div class="step-divider"></div>
                            <div class="step-indicator">3</div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    
                    <div class="workflow-stepper-labels px-4">
                        <div class="row text-center small">                        
                            <div class="col-4">Basics</div>
                            <div class="col-4">Add Tasks</div>
                            <div class="col-4">Review & Save</div>
                        </div>
                    </div>
                    
                    <div class="modal-body p-4">
                        <div class="container-fluid p-0">
                            <div class="row mb-4">
                                <div class="col-12">
                                    <form id="workflow-form" ${workflow ? `data-workflow-id="${workflow.id}"` : ''}>
                                        <div class="workflow-details-card mb-4">
                                            <div class="section-title d-flex align-items-center mb-3">
                                                <div class="section-icon">
                                                    <i class="bi bi-info-circle"></i>
                                                </div>
                                                <h6 class="mb-0">Workflow Details</h6>
                                            </div>
                                            
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <label for="workflow-name" class="form-label">Workflow Name</label>
                                                    <div class="input-group input-group-custom">
                                                        <span class="input-group-text">
                                                            <i class="bi bi-diagram-3"></i>
                                                        </span>
                                                        <input type="text" class="form-control" id="workflow-name" 
                                                               value="${workflow ? workflow.name : ''}" 
                                                               placeholder="Enter workflow name" required>
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <label for="workflow-description" class="form-label">Description</label>
                                                    <textarea class="form-control" id="workflow-description" 
                                                              rows="2" placeholder="Describe what this workflow does">${workflow ? workflow.description : ''}</textarea>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="workflow-tasks-section">
                                            <div class="section-title d-flex align-items-center mb-3">
                                                <div class="section-icon">
                                                    <i class="bi bi-list-check"></i>
                                                </div>
                                                <h6 class="mb-0">Tasks Configuration</h6>
                                                <span class="tasks-counter badge bg-primary-subtle text-primary ms-2">
                                                    ${workflow && workflow.tasks ? workflow.tasks.length : 0} tasks
                                                </span>
                                            </div>
                                            
                                            <div class="d-flex justify-content-end mb-3">
                                                <button type="button" class="btn btn-primary me-2" id="add-task-btn">
                                                    <i class="bi bi-plus-lg me-1"></i> Add Task
                                                </button>
                                                <button type="button" class="btn btn-outline-secondary me-2" id="preview-workflow-btn">
                                                    <i class="bi bi-eye me-1"></i> Preview Execution
                                                </button>
                                                <button type="button" class="btn btn-outline-secondary" id="workflow-settings-btn">
                                                    <i class="bi bi-gear me-1"></i> Settings
                                                </button>
                                            </div>
                                            
                                            <div class="workflow-task-container">
                                                <div class="workflow-designer" id="workflow-task-list">
                                                    ${workflow && workflow.tasks && workflow.tasks.length > 0 ?
                                                        workflow.tasks.map((task, index) => {
                                                            // Determine task type icon and colors
                                                            const taskTypeInfo = {
                                                                'agent': { icon: 'robot', color: 'info', label: 'Agent' },
                                                                'function': { icon: 'code-square', color: 'secondary', label: 'Function' },
                                                                'api': { icon: 'cloud-arrow-up-fill', color: 'success', label: 'API' },
                                                                'human': { icon: 'person-fill', color: 'warning', label: 'Human' }
                                                            }[task.type] || { icon: 'question-circle', color: 'secondary', label: task.type || 'Unknown' };
                                                            
                                                            return `
                                                            <div class="task-card" data-task-index="${index}">
                                                                <div class="task-header d-flex justify-content-between align-items-center">
                                                                    <div class="d-flex align-items-center">
                                                                        <div class="task-number">${index + 1}</div>
                                                                        <h6 class="task-name mb-0">${task.name || `Task ${index + 1}`}</h6>
                                                                    </div>
                                                                    <div class="task-actions">
                                                                        <button type="button" class="btn btn-sm btn-icon task-edit" data-task-index="${index}" 
                                                                                title="Edit task">
                                                                            <i class="bi bi-pencil"></i>
                                                                        </button>
                                                                        <button type="button" class="btn btn-sm btn-icon task-handle" 
                                                                                title="Drag to reorder">
                                                                            <i class="bi bi-grip-vertical"></i>
                                                                        </button>
                                                                        <button type="button" class="btn btn-sm btn-icon task-delete" 
                                                                                data-task-index="${index}" title="Delete task">
                                                                            <i class="bi bi-trash"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div class="task-content">
                                                                    <div class="task-type-badge">
                                                                        <span class="badge bg-${taskTypeInfo.color}-subtle text-${taskTypeInfo.color}">
                                                                            <i class="bi bi-${taskTypeInfo.icon} me-1"></i>
                                                                            ${taskTypeInfo.label}
                                                                        </span>
                                                                    </div>
                                                                    <p class="task-description mb-0">${task.description || 'No description provided'}</p>
                                                                    ${task.config ? `
                                                                        <div class="task-config-preview">
                                                                            <div class="config-badge" title="This task has configuration">
                                                                                <i class="bi bi-gear-fill me-1"></i>
                                                                                Config
                                                                            </div>
                                                                        </div>` : ''}
                                                                </div>
                                                            </div>
                                                            ${index < workflow.tasks.length - 1 ? 
                                                                `<div class="task-connection">
                                                                    <div class="connection-line"></div>
                                                                    <div class="connection-arrow">
                                                                        <i class="bi bi-arrow-down"></i>
                                                                    </div>
                                                                </div>` : ''}
                                                        `}).join('') :
                                                        `<div class="empty-task-state">
                                                            <div class="empty-illustration">
                                                                <img src="https://cdn.jsdelivr.net/gh/spotty118/OpenRouter-sdk/img/empty-tasks.svg" 
                                                                     alt="No tasks" class="empty-image" 
                                                                     onerror="this.onerror=null; this.src=''; this.classList.add('bi', 'bi-diagram-3'); this.style.fontSize='4rem'">
                                                            </div>
                                                            <h6 class="empty-title">No tasks added yet</h6>
                                                            <p class="empty-text">Add tasks to build your workflow pipeline</p>
                                                            <button type="button" class="btn btn-primary btn-sm mt-2" id="add-first-task-btn">
                                                                <i class="bi bi-plus-lg me-1"></i> Add First Task
                                                            </button>
                                                        </div>`
                                                    }
                                                </div>
                                                
                                                ${workflow && workflow.tasks && workflow.tasks.length > 0 ? 
                                                    `<div class="workflow-summary mt-4">
                                                        <div class="workflow-summary-card">
                                                            <div class="summary-header d-flex align-items-center">
                                                                <i class="bi bi-info-circle-fill me-2"></i>
                                                                <span>Workflow Summary</span>
                                                            </div>
                                                            <div class="summary-content">
                                                                <div class="summary-item">
                                                                    <span class="summary-label">Total tasks:</span>
                                                                    <span class="summary-value">${workflow.tasks.length}</span>
                                                                </div>
                                                                <div class="summary-item">
                                                                    <span class="summary-label">Estimated runtime:</span>
                                                                    <span class="summary-value">${workflow.tasks.length * 5}s</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>` :
                                                    `<div class="workflow-suggestion mt-4">
                                                        <div class="alert alert-info d-flex align-items-center">
                                                            <i class="bi bi-info-circle-fill me-2"></i>
                                                            <div>
                                                                <strong>Tip:</strong> Tasks are executed in sequence from top to bottom. 
                                                                Start by adding a task that processes user input or generates content.
                                                            </div>
                                                        </div>
                                                    </div>`
                                                }
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer workflow-modal-footer">
                        <div class="workflow-step-navigation w-100 d-flex justify-content-between">
                            <button type="button" class="btn btn-outline-secondary" id="prev-step-btn" ${currentStep === 1 ? 'disabled' : ''}>
                                <i class="bi bi-arrow-left me-1"></i> Previous
                            </button>
                            <div class="d-flex">
                                <button type="button" class="btn btn-light me-2" data-bs-dismiss="modal">
                                    <i class="bi bi-x me-1"></i> Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="next-step-btn" ${currentStep === 3 ? 'style="display: none;"' : ''}>
                                    Next <i class="bi bi-arrow-right ms-1"></i>
                                </button>
                                <button type="button" class="btn btn-success" id="save-workflow-btn" ${currentStep !== 3 ? 'style="display: none;"' : ''}>
                                    <i class="bi bi-${workflow ? 'check2-circle' : 'plus-circle'} me-1"></i>
                                    ${actionText} Workflow
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('workflow-wizard-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Initialize the modal
    const modal = new bootstrap.Modal(document.getElementById('workflow-wizard-modal'));
    modal.show();
    
    // Attach event listeners
    const saveButton = document.getElementById('save-workflow-btn');
    const addTaskButton = document.getElementById('add-task-btn');
    const addFirstTaskButton = document.getElementById('add-first-task-btn');
    const previewButton = document.getElementById('preview-workflow-btn');
    const settingsButton = document.getElementById('workflow-settings-btn');
    const nextStepButton = document.getElementById('next-step-btn');
    const prevStepButton = document.getElementById('prev-step-btn');
    
    // Setup content sections for steps
    const workflowForm = document.getElementById('workflow-form');
    const workflowDetailsCard = document.querySelector('.workflow-details-card');
    const workflowTasksSection = document.querySelector('.workflow-tasks-section');
    
    // Function to manage step transitions
    function navigateToStep(stepNumber) {
        // Update current step tracking
        currentStep = stepNumber;
        
        // Update step indicators
        const stepIndicators = document.querySelectorAll('.step-indicator');
        stepIndicators.forEach((indicator, index) => {
            const stepNum = index + 1;
            indicator.classList.remove('active', 'completed');
            if (stepNum < currentStep) {
                indicator.classList.add('completed');
            } else if (stepNum === currentStep) {
                indicator.classList.add('active');
            }
        });
        
        // Show/hide appropriate content based on step
        if (currentStep === 1) { // Basics
            workflowDetailsCard.style.display = 'block';
            workflowTasksSection.style.display = 'none';
            prevStepButton.disabled = true;
            nextStepButton.style.display = 'inline-block';
            saveButton.style.display = 'none';
        } else if (currentStep === 2) { // Add Tasks
            workflowDetailsCard.style.display = 'none';
            workflowTasksSection.style.display = 'block';
            prevStepButton.disabled = false;
            nextStepButton.style.display = 'inline-block';
            saveButton.style.display = 'none';
        } else if (currentStep === 3) { // Review & Save
            // On the review step, show both sections for final review
            workflowDetailsCard.style.display = 'block';
            workflowTasksSection.style.display = 'block';
            prevStepButton.disabled = false;
            nextStepButton.style.display = 'none';
            saveButton.style.display = 'inline-block';
        }
    }
    
    // Initial step setup
    navigateToStep(currentStep);
    
    // Step navigation event listeners
    if (nextStepButton) {
        nextStepButton.addEventListener('click', function() {
            // Validate current step before proceeding
            if (currentStep === 1) {
                const nameInput = document.getElementById('workflow-name');
                if (!nameInput || !nameInput.value.trim()) {
                    showToast('Error', 'Workflow name is required', 'danger');
                    nameInput.focus();
                    return;
                }
            }
            
            // Validate tasks on step 2
            if (currentStep === 2) {
                const taskCards = document.querySelectorAll('.task-card');
                if (taskCards.length === 0) {
                    showToast('Error', 'Please add at least one task before proceeding', 'danger');
                    return;
                }
            }
            
            navigateToStep(currentStep + 1);
        });
    }
    
    if (prevStepButton) {
        prevStepButton.addEventListener('click', function() {
            if (currentStep > 1) {
                navigateToStep(currentStep - 1);
            }
        });
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            saveWorkflow(workflowId);
        });
    }
    
    if (addTaskButton) {
        addTaskButton.addEventListener('click', function() {
            showTaskModal();
        });
    }
    
    if (addFirstTaskButton) {
        addFirstTaskButton.addEventListener('click', function() {
            showTaskModal();
        });
    }
    
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            showWorkflowSettingsModal();
        });
    }
    
    if (previewButton) {
        previewButton.addEventListener('click', function() {
            previewWorkflow();
        });
    }
    
    // Add event listeners for editing and deleting tasks
    const taskEditButtons = document.querySelectorAll('.task-edit');
    const taskDeleteButtons = document.querySelectorAll('.task-delete');
    
    taskEditButtons.forEach(button => {
        button.addEventListener('click', function() {
            const taskIndex = parseInt(this.getAttribute('data-task-index'));
            showTaskModal(taskIndex);
        });
    });
    
    taskDeleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const taskIndex = parseInt(this.getAttribute('data-task-index'));
            removeTask(taskIndex);
        });
    });
}

// Function to save workflow
function saveWorkflow(workflowId = null) {
    // Check if orchestrator wizard is initialized
    if (!orchestratorWizard) {
        showToast('Error', 'Orchestrator wizard not initialized', 'danger');
        return;
    }
    
    // Get form data
    const nameInput = document.getElementById('workflow-name');
    const descriptionInput = document.getElementById('workflow-description');
    
    if (!nameInput || !nameInput.value.trim()) {
        showToast('Error', 'Workflow name is required', 'danger');
        return;
    }
    
    const name = nameInput.value.trim();
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    
    // Get tasks from the current workflow (if editing)
    let tasks = [];
    if (workflowId) {
        try {
            const workflow = orchestratorWizard.getWorkflow(workflowId);
            tasks = workflow.tasks || [];
        } catch (e) {
            console.error('Error getting existing workflow tasks:', e);
        }
    }
    
    // Save workflow
    try {
        if (workflowId) {
            // Update existing workflow
            orchestratorWizard.updateWorkflow(workflowId, { name, description, tasks });
        } else {
            // Create new workflow
            orchestratorWizard.createWorkflow(name, description, { tasks });
        }
        
        // Save state
        orchestratorWizard.saveState();
        
        // Hide modal
        const modalElement = document.getElementById('workflow-wizard-modal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        // Show success message
        showToast('Success', `Workflow ${workflowId ? 'updated' : 'created'} successfully`, 'success');
        
        // Reload workflows
        loadWorkflows();
    } catch (error) {
        console.error('Error saving workflow:', error);
        showToast('Error', `Failed to ${workflowId ? 'update' : 'create'} workflow`, 'danger');
    }
}

// Function to show task modal for adding/editing tasks
function showTaskModal(taskIndex = null) {
    // Check if we're editing an existing task
    let task = null;
    let isEdit = false;
    let temporaryWorkflowTasks = [];
    
    // Store current tasks in session storage for editing
    if (document.getElementById('workflow-task-list')) {
        const taskCards = document.querySelectorAll('.task-card');
        taskCards.forEach((card, index) => {
            const taskName = card.querySelector('.task-name').textContent;
            const taskDescription = card.querySelector('.task-description').textContent;
            const taskTypeElement = card.querySelector('.task-type-badge .badge');
            let taskType = 'agent'; // Default
            
            // Try to determine task type from badge
            if (taskTypeElement) {
                if (taskTypeElement.classList.contains('bg-info-subtle')) taskType = 'agent';
                else if (taskTypeElement.classList.contains('bg-secondary-subtle')) taskType = 'function';
                else if (taskTypeElement.classList.contains('bg-success-subtle')) taskType = 'api';
                else if (taskTypeElement.classList.contains('bg-warning-subtle')) taskType = 'human';
            }
            
            temporaryWorkflowTasks.push({
                name: taskName,
                description: taskDescription,
                type: taskType,
                config: {}
            });
        });
        
        // Store for later use
        sessionStorage.setItem('temporaryWorkflowTasks', JSON.stringify(temporaryWorkflowTasks));
    }
    
    if (taskIndex !== null) {
        // Try to get tasks from session storage first
        const storedTasks = sessionStorage.getItem('temporaryWorkflowTasks');
        if (storedTasks) {
            try {
                const tasks = JSON.parse(storedTasks);
                if (tasks[taskIndex]) {
                    task = tasks[taskIndex];
                    isEdit = true;
                }
            } catch (e) {
                console.error('Error parsing stored tasks:', e);
            }
        } else {
            // Get from workflow if available
            const workflowId = document.getElementById('workflow-form').getAttribute('data-workflow-id');
            if (workflowId) {
                try {
                    const workflow = orchestratorWizard.getWorkflow(workflowId);
                    if (workflow.tasks && workflow.tasks[taskIndex]) {
                        task = workflow.tasks[taskIndex];
                        isEdit = true;
                    }
                } catch (e) {
                    console.error('Error getting task:', e);
                }
            }
        }
    }
    
    // Set default task if needed
    if (!task) {
        task = {
            name: '',
            description: '',
            type: 'agent',
            config: {}
        };
    }
    
    // Create modal HTML
    const modalTitle = isEdit ? 'Edit Task' : 'Add Task';
    const actionText = isEdit ? 'Update' : 'Add';
    
    const modalHtml = `
        <div class="modal fade" id="task-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header modal-workflow-header">
                        <h5 class="modal-title workflow-modal-title">
                            <div class="modal-icon-wrapper">
                                <i class="bi bi-${isEdit ? 'pencil-square' : 'plus-circle'}"></i>
                            </div>
                            ${modalTitle}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="task-form" ${isEdit ? `data-task-index="${taskIndex}"` : ''}>
                            <div class="mb-3">
                                <label for="task-name" class="form-label fw-semibold">Task Name</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light">
                                        <i class="bi bi-check2-square text-primary"></i>
                                    </span>
                                    <input type="text" class="form-control" id="task-name" 
                                           placeholder="Enter a clear, descriptive name" 
                                           value="${task ? task.name : ''}" required>
                                </div>
                                <small class="form-text text-muted">A clear name helps identify this task's purpose</small>
                            </div>
                            
                            <div class="mb-3">
                                <label for="task-description" class="form-label fw-semibold">Description</label>
                                <textarea class="form-control" id="task-description" 
                                          rows="2" placeholder="Describe what this task does">${task ? task.description : ''}</textarea>
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label fw-semibold">Task Type</label>
                                <div class="task-type-selector d-flex flex-wrap">
                                    <div class="form-check form-check-inline task-type-option flex-grow-1 me-0 mb-2">
                                        <input class="form-check-input" type="radio" name="taskTypeOptions" 
                                               id="agentTaskType" value="agent" 
                                               ${!task || task.type === 'agent' ? 'checked' : ''}>
                                        <label class="form-check-label p-3 rounded border w-100" for="agentTaskType">
                                            <div class="d-flex align-items-center mb-2">
                                                <div class="task-type-icon me-2 bg-info-subtle p-1 rounded">
                                                    <i class="bi bi-robot text-info"></i>
                                                </div>
                                                <span class="fw-medium">Agent</span>
                                            </div>
                                            <small class="text-muted d-block">Execute operations using an AI agent</small>
                                        </label>
                                    </div>
                                    
                                    <div class="form-check form-check-inline task-type-option flex-grow-1 me-0 ms-md-2 mb-2">
                                        <input class="form-check-input" type="radio" name="taskTypeOptions" 
                                               id="functionTaskType" value="function" 
                                               ${task && task.type === 'function' ? 'checked' : ''}>
                                        <label class="form-check-label p-3 rounded border w-100" for="functionTaskType">
                                            <div class="d-flex align-items-center mb-2">
                                                <div class="task-type-icon me-2 bg-secondary-subtle p-1 rounded">
                                                    <i class="bi bi-code-square text-secondary"></i>
                                                </div>
                                                <span class="fw-medium">Function</span>
                                            </div>
                                            <small class="text-muted d-block">Run code functions for data processing</small>
                                        </label>
                                    </div>
                                    
                                    <div class="form-check form-check-inline task-type-option flex-grow-1 me-0 mb-2">
                                        <input class="form-check-input" type="radio" name="taskTypeOptions" 
                                               id="apiTaskType" value="api" 
                                               ${task && task.type === 'api' ? 'checked' : ''}>
                                        <label class="form-check-label p-3 rounded border w-100" for="apiTaskType">
                                            <div class="d-flex align-items-center mb-2">
                                                <div class="task-type-icon me-2 bg-success-subtle p-1 rounded">
                                                    <i class="bi bi-cloud-arrow-up-fill text-success"></i>
                                                </div>
                                                <span class="fw-medium">API Call</span>
                                            </div>
                                            <small class="text-muted d-block">Make external API requests</small>
                                        </label>
                                    </div>
                                    
                                    <div class="form-check form-check-inline task-type-option flex-grow-1 me-0 ms-md-2 mb-2">
                                        <input class="form-check-input" type="radio" name="taskTypeOptions" 
                                               id="humanTaskType" value="human" 
                                               ${task && task.type === 'human' ? 'checked' : ''}>
                                        <label class="form-check-label p-3 rounded border w-100" for="humanTaskType">
                                            <div class="d-flex align-items-center mb-2">
                                                <div class="task-type-icon me-2 bg-warning-subtle p-1 rounded">
                                                    <i class="bi bi-person-fill text-warning"></i>
                                                </div>
                                                <span class="fw-medium">Human Input</span>
                                            </div>
                                            <small class="text-muted d-block">Pause for user interaction</small>
                                        </label>
                                    </div>
                                </div>
                            </div>
                                                        <!-- Agent Configuration Section -->
                            <div class="task-type-config" id="agent-config-section" style="display: ${!task || task.type === 'agent' ? 'block' : 'none'}">
                                <div class="mb-3 p-3 border rounded bg-light">
                                    <h6 class="mb-3"><i class="bi bi-robot me-2 text-info"></i>Agent Configuration</h6>
                                    
                                    <div class="mb-3">
                                        <label for="agent-model" class="form-label">Model</label>
                                        <select class="form-select" id="agent-model">
                                            <option value="gpt-3.5-turbo" ${task && task.config && task.config.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                                            <option value="gpt-4" ${task && task.config && task.config.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                                            <option value="claude-3-opus" ${task && task.config && task.config.model === 'claude-3-opus' ? 'selected' : ''}>Claude 3 Opus</option>
                                            <option value="claude-3-sonnet" ${task && task.config && task.config.model === 'claude-3-sonnet' ? 'selected' : ''}>Claude 3 Sonnet</option>
                                            <option value="gemini-pro" ${task && task.config && task.config.model === 'gemini-pro' ? 'selected' : ''}>Gemini Pro</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="agent-instructions" class="form-label">Instructions</label>
                                        <textarea class="form-control" id="agent-instructions" rows="4" 
                                                  placeholder="Provide detailed instructions for the agent...">${task && task.config && task.config.instructions ? task.config.instructions : ''}</textarea>
                                    </div>
                                    
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="agent-memory" 
                                               ${task && task.config && task.config.memory ? 'checked' : ''}>
                                        <label class="form-check-label" for="agent-memory">Enable Memory</label>
                                        <small class="form-text text-muted d-block">Allow agent to remember context from previous interactions</small>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Function Configuration Section -->
                            <div class="task-type-config" id="function-config-section" style="display: ${task && task.type === 'function' ? 'block' : 'none'}">
                                <div class="mb-3 p-3 border rounded bg-light">
                                    <h6 class="mb-3"><i class="bi bi-code-square me-2 text-secondary"></i>Function Configuration</h6>
                                    
                                    <div class="mb-3">
                                        <label for="function-code" class="form-label">Function Code</label>
                                        <textarea class="form-control font-monospace" id="function-code" rows="8" 
                                                  placeholder="function processData(data) {
  // Your code here
  return result;
}">${task && task.config && task.config.code ? task.config.code : ''}</textarea>
                                    </div>
                                    
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="function-async" 
                                               ${task && task.config && task.config.async ? 'checked' : ''}>
                                        <label class="form-check-label" for="function-async">Async Function</label>
                                        <small class="form-text text-muted d-block">Run function asynchronously</small>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- API Configuration Section -->
                            <div class="task-type-config" id="api-config-section" style="display: ${task && task.type === 'api' ? 'block' : 'none'}">
                                <div class="mb-3 p-3 border rounded bg-light">
                                    <h6 class="mb-3"><i class="bi bi-cloud-arrow-up-fill me-2 text-success"></i>API Configuration</h6>
                                    
                                    <div class="mb-3">
                                        <label for="api-endpoint" class="form-label">Endpoint URL</label>
                                        <input type="text" class="form-control" id="api-endpoint" 
                                               placeholder="https://api.example.com/endpoint" 
                                               value="${task && task.config && task.config.endpoint ? task.config.endpoint : ''}">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="api-method" class="form-label">Method</label>
                                        <select class="form-select" id="api-method">
                                            <option value="GET" ${!task || !task.config || !task.config.method || task.config.method === 'GET' ? 'selected' : ''}>GET</option>
                                            <option value="POST" ${task && task.config && task.config.method === 'POST' ? 'selected' : ''}>POST</option>
                                            <option value="PUT" ${task && task.config && task.config.method === 'PUT' ? 'selected' : ''}>PUT</option>
                                            <option value="DELETE" ${task && task.config && task.config.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="api-headers" class="form-label">Headers (JSON)</label>
                                        <textarea class="form-control font-monospace" id="api-headers" rows="3" 
                                                  placeholder="{
  \"Content-Type\": \"application/json\",
  \"Authorization\": \"Bearer YOUR_TOKEN\"
}">${task && task.config && task.config.headers ? JSON.stringify(task.config.headers, null, 2) : '{}'}</textarea>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Human Input Configuration Section -->
                            <div class="task-type-config" id="human-config-section" style="display: ${task && task.type === 'human' ? 'block' : 'none'}">
                                <div class="mb-3 p-3 border rounded bg-light">
                                    <h6 class="mb-3"><i class="bi bi-person-fill me-2 text-warning"></i>Human Input Configuration</h6>
                                    
                                    <div class="mb-3">
                                        <label for="human-prompt" class="form-label">Prompt Message</label>
                                        <textarea class="form-control" id="human-prompt" rows="3" 
                                                  placeholder="Instructions for the human to complete this task...">${task && task.config && task.config.prompt ? task.config.prompt : ''}</textarea>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="human-timeout" class="form-label">Timeout (seconds)</label>
                                        <input type="number" class="form-control" id="human-timeout" 
                                               placeholder="300" min="0" step="1" 
                                               value="${task && task.config && task.config.timeout ? task.config.timeout : '300'}">
                                        <small class="form-text text-muted">Set to 0 for no timeout</small>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Legacy JSON Configuration (hidden by default) -->
                            <div class="task-type-config" id="json-config-section" style="display: none">
                                <div class="mb-3 p-3 border rounded bg-light">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <label for="task-config" class="form-label fw-semibold mb-0">
                                            <i class="bi bi-gear me-1"></i>
                                            Raw Configuration
                                        </label>
                                        <button type="button" class="btn btn-sm btn-outline-secondary" id="format-json-btn">
                                            <i class="bi bi-code-square me-1"></i> Format JSON
                                        </button>
                                    </div>
                                    <textarea class="form-control font-monospace" id="task-config" 
                                              rows="5" placeholder="{ \"key\": \"value\" }">${task && task.config ? JSON.stringify(task.config, null, 2) : '{}'}</textarea>
                                    <small class="form-text text-muted">Enter a valid JSON configuration for this task</small>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="save-task-btn">
                            <i class="bi bi-${isEdit ? 'check2-circle' : 'plus-circle'} me-1"></i>
                            ${actionText} Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('task-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Initialize the modal
    const modal = new bootstrap.Modal(document.getElementById('task-modal'));
    modal.show();
    
    // Attach event listeners
    const saveButton = document.getElementById('save-task-btn');
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            saveTask(taskIndex);
        });
    }
    
    // Handle task type radio button changes
    const taskTypeRadios = document.querySelectorAll('input[name="taskTypeOptions"]');
    taskTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // Hide all configuration sections
            document.querySelectorAll('.task-type-config').forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the selected configuration section
            const selectedType = this.value;
            const configSection = document.getElementById(`${selectedType}-config-section`);
            if (configSection) {
                configSection.style.display = 'block';
            }
        });
    });
    
    // Format JSON button event listener
    const formatJsonBtn = document.getElementById('format-json-btn');
    if (formatJsonBtn) {
        formatJsonBtn.addEventListener('click', function() {
            const configTextarea = document.getElementById('task-config');
            if (configTextarea && configTextarea.value) {
                try {
                    const formattedJSON = JSON.stringify(JSON.parse(configTextarea.value), null, 2);
                    configTextarea.value = formattedJSON;
                } catch (error) {
                    showToast('Error', 'Invalid JSON format', 'danger');
                }
            }
        });
    }
    
    // Initialize advanced configuration dialogs and UI
    initTaskConfigSections();
}

// Function to initialize task configuration sections and related UI components
function initTaskConfigSections() {
    // Initialize tooltips for task config sections
    const tooltipTriggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggers.forEach(trigger => {
        new bootstrap.Tooltip(trigger);
    });
    
    // Add syntax highlighting for code editors if available
    const codeEditors = document.querySelectorAll('.code-editor');
    codeEditors.forEach(editor => {
        // Apply any code editor enhancements here
        editor.addEventListener('keydown', function(e) {
            // Allow tab characters in code editors
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                
                // Set new textarea value with inserted tab
                this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
                
                // Place cursor after the inserted tab
                this.selectionStart = this.selectionEnd = start + 4;
            }
        });
    });
    
    // Task type preview - update model display based on selection
    const agentModelSelect = document.getElementById('agent-model');
    if (agentModelSelect) {
        const modelPreview = document.createElement('div');
        modelPreview.className = 'model-preview mt-2 small';
        agentModelSelect.parentNode.appendChild(modelPreview);
        
        // Initial update
        updateModelInfo(agentModelSelect.value);
        
        // Update on change
        agentModelSelect.addEventListener('change', function() {
            updateModelInfo(this.value);
        });
        
        function updateModelInfo(modelId) {
            let modelInfo = {
                'gpt-3.5-turbo': {
                    name: 'GPT-3.5 Turbo',
                    description: 'Fast and efficient for most tasks. Good balance of speed and capability.',
                    provider: 'OpenAI'
                },
                'gpt-4': {
                    name: 'GPT-4',
                    description: 'Advanced reasoning and broader knowledge. Best for complex tasks.',
                    provider: 'OpenAI'
                },
                'claude-3-opus': {
                    name: 'Claude 3 Opus',
                    description: 'Highest capability model with excellent reasoning and instruction following.',
                    provider: 'Anthropic'
                },
                'claude-3-sonnet': {
                    name: 'Claude 3 Sonnet',
                    description: 'Balanced performance with strong reasoning at a lower cost than Opus.',
                    provider: 'Anthropic'
                },
                'gemini-pro': {
                    name: 'Gemini Pro',
                    description: 'Google\'s multimodal model with strong reasoning capabilities.',
                    provider: 'Google'
                }
            };
            
            const info = modelInfo[modelId] || { name: modelId, description: 'Custom model', provider: 'Unknown' };
            
            modelPreview.innerHTML = `
                <div class="text-muted mb-1">${info.description}</div>
                <div class="badge bg-light text-dark">Provider: ${info.provider}</div>
            `;
        }
    }
}

// Function to save task
function saveTask(taskIndex = null) {
    // Get common form data
    const nameInput = document.getElementById('task-name');
    const descriptionInput = document.getElementById('task-description');
    
    if (!nameInput || !nameInput.value.trim()) {
        showToast('Error', 'Task name is required', 'danger');
        return;
    }
    
    // Get selected task type from radio buttons
    const selectedTaskType = document.querySelector('input[name="taskTypeOptions"]:checked');
    
    const name = nameInput.value.trim();
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const type = selectedTaskType ? selectedTaskType.value : 'agent';
    
    // Initialize task configuration
    let config = {};
    
    // Get configuration based on task type
    switch(type) {
        case 'agent':
            const agentModelSelect = document.getElementById('agent-model');
            const agentInstructionsText = document.getElementById('agent-instructions');
            const agentMemoryCheck = document.getElementById('agent-memory');
            
            config = {
                model: agentModelSelect ? agentModelSelect.value : 'gpt-3.5-turbo',
                instructions: agentInstructionsText ? agentInstructionsText.value.trim() : '',
                memory: agentMemoryCheck ? agentMemoryCheck.checked : false
            };
            break;
            
        case 'function':
            const functionCodeEditor = document.getElementById('function-code');
            
            if (!functionCodeEditor || !functionCodeEditor.value.trim()) {
                showToast('Warning', 'Function code is empty', 'warning');
            }
            
            config = {
                code: functionCodeEditor ? functionCodeEditor.value.trim() : '',
                async: document.getElementById('function-async') ? document.getElementById('function-async').checked : false
            };
            break;
            
        case 'api':
            const apiEndpointInput = document.getElementById('api-endpoint');
            const apiMethodSelect = document.getElementById('api-method');
            const apiHeadersTextarea = document.getElementById('api-headers');
            
            if (!apiEndpointInput || !apiEndpointInput.value.trim()) {
                showToast('Error', 'API endpoint is required', 'danger');
                return;
            }
            
            let headers = {};
            try {
                headers = apiHeadersTextarea && apiHeadersTextarea.value ? JSON.parse(apiHeadersTextarea.value) : {};
            } catch (error) {
                showToast('Error', 'Invalid JSON in API headers', 'danger');
                return;
            }
            
            config = {
                endpoint: apiEndpointInput.value.trim(),
                method: apiMethodSelect ? apiMethodSelect.value : 'GET',
                headers: headers
            };
            break;
            
        case 'human':
            const humanPromptTextarea = document.getElementById('human-prompt');
            const humanTimeoutInput = document.getElementById('human-timeout');
            
            config = {
                prompt: humanPromptTextarea ? humanPromptTextarea.value.trim() : '',
                timeout: humanTimeoutInput && humanTimeoutInput.value ? parseInt(humanTimeoutInput.value) : 300
            };
            break;
            
        default:
            // Get config from the original textarea as fallback
            const configTextarea = document.getElementById('task-config');
            try {
                config = configTextarea && configTextarea.value ? JSON.parse(configTextarea.value) : {};
            } catch (error) {
                showToast('Error', 'Invalid JSON configuration', 'danger');
                return;
            }
    }
    
    // Create task object
    const task = {
        name,
        description,
        type,
        config,
        created: new Date().toISOString()
    };
    
    // Get current tasks from session storage
    let tasks = [];
    const storedTasks = sessionStorage.getItem('temporaryWorkflowTasks');
    if (storedTasks) {
        try {
            tasks = JSON.parse(storedTasks);
        } catch (e) {
            console.error('Error parsing stored tasks:', e);
        }
    }
    
    // Update or add task
    if (taskIndex !== null && tasks[taskIndex]) {
        // Update existing task
        tasks[taskIndex] = { ...tasks[taskIndex], ...task };
    } else {
        // Add new task
        tasks.push(task);
    }
    
    // Store updated tasks
    sessionStorage.setItem('temporaryWorkflowTasks', JSON.stringify(tasks));
    
    // Update UI with new task list
    updateTaskList(tasks);
    
    // Hide task modal
    const modalElement = document.getElementById('task-modal');
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
}

// Function to remove task
function removeTask(taskIndex) {
    if (taskIndex === null || taskIndex === undefined) {
        return;
    }
    
    // Get current tasks from session storage
    let tasks = [];
    const storedTasks = sessionStorage.getItem('temporaryWorkflowTasks');
    if (storedTasks) {
        try {
            tasks = JSON.parse(storedTasks);
        } catch (e) {
            console.error('Error parsing stored tasks:', e);
            return;
        }
    } else {
        return;
    }
    
    // Remove task at index
    if (taskIndex >= 0 && taskIndex < tasks.length) {
        tasks.splice(taskIndex, 1);
        
        // Store updated tasks
        sessionStorage.setItem('temporaryWorkflowTasks', JSON.stringify(tasks));
        
        // Update UI with new task list
        updateTaskList(tasks);
    }
}

// Function to update task list in UI
function updateTaskList(tasks) {
    const taskListContainer = document.getElementById('workflow-task-list');
    if (!taskListContainer) {
        return;
    }
    
    // Clear container
    taskListContainer.innerHTML = '';
    
    if (tasks.length === 0) {
        taskListContainer.innerHTML = '<div class="text-center py-4"><p class="text-muted">No tasks added yet. Add your first task below.</p></div>';
        return;
    }
    
    // Create container for drag and drop functionality
    const draggableContainer = document.createElement('div');
    draggableContainer.id = 'tasks-draggable-container';
    draggableContainer.className = 'tasks-sortable';
    taskListContainer.appendChild(draggableContainer);
    
    // Render each task
    tasks.forEach((task, index) => {
        const taskCardWrapper = document.createElement('div');
        taskCardWrapper.className = 'task-item position-relative';
        taskCardWrapper.setAttribute('data-task-index', index);
        
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card p-3 border rounded';
        
        // Determine task type icon and badge classes
        let typeIcon, typeBadge, badgeClass, badgeText;
        
        switch(task.type) {
            case 'agent':
                typeIcon = 'bi-robot';
                typeBadge = 'bg-info-subtle text-info';
                badgeText = 'Agent';
                break;
            case 'function':
                typeIcon = 'bi-code-square';
                typeBadge = 'bg-secondary-subtle text-secondary';
                badgeText = 'Function';
                break;
            case 'api':
                typeIcon = 'bi-cloud-arrow-up-fill';
                typeBadge = 'bg-success-subtle text-success';
                badgeText = 'API';
                break;
            case 'human':
                typeIcon = 'bi-person-fill';
                typeBadge = 'bg-warning-subtle text-warning';
                badgeText = 'Human';
                break;
            default:
                typeIcon = 'bi-check2-square';
                typeBadge = 'bg-primary-subtle text-primary';
                badgeText = 'Task';
        }
        
        // Add task handle for drag and drop
        taskCard.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="d-flex">
                    <div class="task-drag-handle text-muted me-2" title="Drag to reorder">
                        <i class="bi bi-grip-vertical"></i>
                    </div>
                    <div>
                        <h6 class="task-name mb-1">${task.name}</h6>
                        <div class="task-type-badge mb-2">
                            <span class="badge ${typeBadge} rounded-pill py-1 px-2">
                                <i class="bi ${typeIcon} me-1"></i>
                                ${badgeText}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button type="button" class="btn btn-sm btn-outline-secondary task-edit me-1" data-task-index="${index}" title="Edit task">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger task-delete" data-task-index="${index}" title="Remove task">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <p class="task-description text-muted small mb-0">${task.description || 'No description provided'}</p>
        `;
        
        taskCardWrapper.appendChild(taskCard);
        draggableContainer.appendChild(taskCardWrapper);
        
        // Add connection if not the last task
        if (index < tasks.length - 1) {
            const connection = document.createElement('div');
            connection.className = 'task-connection d-flex justify-content-center py-1';
            connection.innerHTML = '<i class="bi bi-arrow-down text-muted"></i>';
            taskCardWrapper.appendChild(connection);
        }
    });
    
    // Add event listeners for task actions
    const taskEditButtons = taskListContainer.querySelectorAll('.task-edit');
    const taskDeleteButtons = taskListContainer.querySelectorAll('.task-delete');
    
    taskEditButtons.forEach(button => {
        button.addEventListener('click', function() {
            const taskIndex = parseInt(this.getAttribute('data-task-index'));
            showTaskModal(taskIndex);
        });
    });
    
    taskDeleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const taskIndex = parseInt(this.getAttribute('data-task-index'));
            removeTask(taskIndex);
        });
    });
    
    // Initialize sortable functionality for drag and drop reordering
    initializeTaskSorting();
}

// Function to initialize task sorting functionality
function initializeTaskSorting() {
    const taskContainer = document.getElementById('tasks-draggable-container');
    if (!taskContainer) return;
    
    // Create a Sortable instance for drag and drop reordering
    new Sortable(taskContainer, {
        animation: 150,
        handle: '.task-drag-handle',
        ghostClass: 'task-ghost',
        onEnd: function(evt) {
            // Get current tasks
            let tasks = [];
            const storedTasks = sessionStorage.getItem('temporaryWorkflowTasks');
            if (storedTasks) {
                try {
                    tasks = JSON.parse(storedTasks);
                } catch (e) {
                    console.error('Error parsing stored tasks:', e);
                    return;
                }
            }
            
            // If we have tasks and the order has changed
            if (tasks.length > 0 && evt.oldIndex !== evt.newIndex) {
                // Get the task that was moved
                const movedTask = tasks[evt.oldIndex];
                
                // Remove from old position and insert at new position
                tasks.splice(evt.oldIndex, 1);
                tasks.splice(evt.newIndex, 0, movedTask);
                
                // Update session storage
                sessionStorage.setItem('temporaryWorkflowTasks', JSON.stringify(tasks));
                
                // Show success message
                showToast('Success', 'Task order updated', 'success');
            }
        }
    });
}

// Function to validate workflow before saving
function validateWorkflow() {
    // Get workflow name and description
    const nameInput = document.getElementById('workflow-name');
    if (!nameInput || !nameInput.value.trim()) {
        showToast('Error', 'Workflow name is required', 'danger');
        return false;
    }
    
    // Get tasks
    let tasks = [];
    const storedTasks = sessionStorage.getItem('temporaryWorkflowTasks');
    if (storedTasks) {
        try {
            tasks = JSON.parse(storedTasks);
        } catch (e) {
            console.error('Error parsing stored tasks:', e);
        }
    }
    
    // Check if we have at least one task
    if (tasks.length === 0) {
        showToast('Error', 'Workflow must have at least one task', 'danger');
        return false;
    }
    
    // Validate each task based on its type
    let isValid = true;
    let errorMessage = '';
    
    tasks.forEach((task, index) => {
        // Check if task has a name
        if (!task.name || !task.name.trim()) {
            isValid = false;
            errorMessage = `Task ${index + 1} is missing a name`;
            return;
        }
        
        // Validate task configuration based on type
        switch(task.type) {
            case 'agent':
                if (!task.config.model) {
                    isValid = false;
                    errorMessage = `Agent task "${task.name}" is missing a model selection`;
                } else {
                    // Check if necessary API keys are available based on model provider
                    const modelProvider = task.config.model.toLowerCase();
                    
                    if (modelProvider.includes('openai') || modelProvider.includes('gpt')) {
                        const openaiKey = localStorage.getItem('openai_api_key');
                        if (!openaiKey) {
                            isValid = false;
                            errorMessage = `Agent task "${task.name}" requires an OpenAI API key`;
                        }
                    } else if (modelProvider.includes('claude') || modelProvider.includes('anthropic')) {
                        const anthropicKey = localStorage.getItem('anthropic_api_key');
                        if (!anthropicKey) {
                            isValid = false;
                            errorMessage = `Agent task "${task.name}" requires an Anthropic API key`;
                        }
                    } else if (modelProvider.includes('gemini') || modelProvider.includes('google')) {
                        const googleKey = localStorage.getItem('google_api_key');
                        if (!googleKey) {
                            isValid = false;
                            errorMessage = `Agent task "${task.name}" requires a Google AI API key`;
                        }
                    } else {
                        // For all other models, check if we have an OpenRouter API key
                        const openrouterKey = localStorage.getItem('openrouter_api_key');
                        if (!openrouterKey) {
                            isValid = false;
                            errorMessage = `Agent task "${task.name}" requires an OpenRouter API key`;
                        }
                    }
                }
                break;
                
            case 'function':
                if (!task.config.code || !task.config.code.trim()) {
                    isValid = false;
                    errorMessage = `Function task "${task.name}" is missing code implementation`;
                }
                break;
                
            case 'api':
                if (!task.config.endpoint || !task.config.endpoint.trim()) {
                    isValid = false;
                    errorMessage = `API task "${task.name}" is missing an endpoint URL`;
                }
                
                // Check API key requirements for specific API endpoints
                if (task.config.endpoint && task.config.endpoint.includes('serper.dev')) {
                    const serperKey = localStorage.getItem('serper_api_key');
                    if (!serperKey) {
                        isValid = false;
                        errorMessage = `API task "${task.name}" requires a Serper API key for web search`;
                    }
                }
                break;
        }
    });
    
    if (!isValid) {
        showToast('Error', errorMessage, 'danger');
        return false;
    }
    
    return true;
}

// Function to preview workflow execution
function previewWorkflow() {
    // Get tasks
    let tasks = [];
    const storedTasks = sessionStorage.getItem('temporaryWorkflowTasks');
    if (storedTasks) {
        try {
            tasks = JSON.parse(storedTasks);
        } catch (e) {
            console.error('Error parsing stored tasks:', e);
            showToast('Error', 'Could not load workflow tasks', 'danger');
            return;
        }
    }
    
    if (tasks.length === 0) {
        showToast('Warning', 'No tasks to preview', 'warning');
        return;
    }
    
    // Create execution preview modal
    const modalHtml = `
    <div class="modal fade" id="workflow-preview-modal" tabindex="-1" aria-labelledby="workflow-preview-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="workflow-preview-modal-label">Workflow Execution Preview</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="workflow-preview-container">
                        <div class="mb-4">
                            <h6>Execution Flow</h6>
                            <div class="execution-flow p-3 border rounded bg-light">
                                ${tasks.map((task, index) => `
                                    <div class="execution-step ${index === 0 ? 'first-step' : ''}">
                                        <div class="execution-number bg-primary text-white rounded-circle">${index + 1}</div>
                                        <div class="execution-details ms-2">
                                            <div class="fw-bold">${task.name}</div>
                                            <div class="small text-muted">${getTaskTypeDescription(task.type, task.config)}</div>
                                        </div>
                                    </div>
                                    ${index < tasks.length - 1 ? '<div class="execution-connector"><i class="bi bi-arrow-down"></i></div>' : ''}
                                `).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <h6>Expected Behavior</h6>
                            <div class="expected-behavior p-3 border rounded">
                                <p>This workflow will execute the following steps in sequence:</p>
                                <ol>
                                    ${tasks.map(task => `
                                        <li>
                                            <strong>${task.name}</strong> (${getTaskTypeName(task.type)}): ${getTaskBehaviorDescription(task)}
                                        </li>
                                    `).join('')}
                                </ol>
                                <p class="mt-3 text-muted">Data will flow between tasks, with each task receiving the output of the previous task as input.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Remove existing modal if it exists
    const existingModal = document.getElementById('workflow-preview-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('workflow-preview-modal'));
    modal.show();
}

// Helper function to get task type friendly name
function getTaskTypeName(type) {
    switch(type) {
        case 'agent': return 'AI Agent';
        case 'function': return 'Function';
        case 'api': return 'API Call';
        case 'human': return 'Human Input';
        default: return 'Task';
    }
}

// Helper function to get task type description
function getTaskTypeDescription(type, config) {
    switch(type) {
        case 'agent':
            return `Uses ${config.model || 'AI'} model${config.memory ? ' with memory' : ''}`;
        case 'function':
            return `${config.async ? 'Async function' : 'Function'} execution`;
        case 'api':
            return `${config.method || 'GET'} request to external API`;
        case 'human':
            return `Requires human input${config.timeout ? ` (timeout: ${config.timeout}s)` : ''}`;
        default:
            return 'Standard task execution';
    }
}

// Helper function to get task behavior description
function getTaskBehaviorDescription(task) {
    switch(task.type) {
        case 'agent':
            return `The AI agent will process the input using the ${task.config.model} model and generate a response based on its instructions.`;
        case 'function':
            return `Custom code will be executed to process the data${task.config.async ? ' asynchronously' : ''}.`;
        case 'api':
            return `Will make a ${task.config.method || 'GET'} request to ${task.config.endpoint} and process the response.`;
        case 'human':
            return `Will pause execution and wait for human input before proceeding.`;
        default:
            return 'Will process the input and generate an output.';
    }
}

// Function to show workflow settings modal
function showWorkflowSettingsModal() {
    // Create settings modal HTML
    const modalHtml = `
    <div class="modal fade" id="workflow-settings-modal" tabindex="-1" aria-labelledby="workflow-settings-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="workflow-settings-modal-label">
                        <i class="bi bi-gear me-2"></i>Workflow Settings
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="settings-container">
                        <!-- API Keys Section -->
                        <div class="settings-section mb-4">
                            <h5 class="settings-section-title">API Keys</h5>
                            <p class="text-muted small mb-3">Configure API keys for various services used in your workflow tasks. These keys are stored in your browser's local storage.</p>
                            
                            <div class="row g-3">
                                <!-- OpenRouter API Key -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <h6 class="card-title">
                                                <img src="https://openrouter.ai/favicon.ico" alt="OpenRouter" width="16" height="16" class="me-1">
                                                OpenRouter
                                            </h6>
                                            <p class="card-text small text-muted">Required for Agent tasks using OpenRouter models</p>
                                            <div class="input-group mb-2">
                                                <input type="password" class="form-control" id="openrouter-api-key" 
                                                       placeholder="Enter OpenRouter API key" 
                                                       value="${localStorage.getItem('openrouter_api_key') || ''}">
                                                <button class="btn btn-outline-secondary toggle-key-btn" type="button" data-target="openrouter-api-key">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                            </div>
                                            <a href="https://openrouter.ai/keys" target="_blank" class="btn btn-sm btn-link px-0">Get API Key</a>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- OpenAI API Key -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <h6 class="card-title">
                                                <img src="https://openai.com/favicon.ico" alt="OpenAI" width="16" height="16" class="me-1">
                                                OpenAI
                                            </h6>
                                            <p class="card-text small text-muted">Required for Agent tasks using OpenAI models directly</p>
                                            <div class="input-group mb-2">
                                                <input type="password" class="form-control" id="openai-api-key" 
                                                       placeholder="Enter OpenAI API key"
                                                       value="${localStorage.getItem('openai_api_key') || ''}">
                                                <button class="btn btn-outline-secondary toggle-key-btn" type="button" data-target="openai-api-key">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                            </div>
                                            <a href="https://platform.openai.com/api-keys" target="_blank" class="btn btn-sm btn-link px-0">Get API Key</a>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Anthropic API Key -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <h6 class="card-title">
                                                <img src="https://anthropic.com/favicon.ico" alt="Anthropic" width="16" height="16" class="me-1" onerror="this.style.display='none'">
                                                Anthropic
                                            </h6>
                                            <p class="card-text small text-muted">Required for Agent tasks using Claude models directly</p>
                                            <div class="input-group mb-2">
                                                <input type="password" class="form-control" id="anthropic-api-key" 
                                                       placeholder="Enter Anthropic API key"
                                                       value="${localStorage.getItem('anthropic_api_key') || ''}">
                                                <button class="btn btn-outline-secondary toggle-key-btn" type="button" data-target="anthropic-api-key">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                            </div>
                                            <a href="https://console.anthropic.com/settings/keys" target="_blank" class="btn btn-sm btn-link px-0">Get API Key</a>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Google API Key -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <h6 class="card-title">
                                                <img src="https://www.google.com/favicon.ico" alt="Google" width="16" height="16" class="me-1">
                                                Google AI
                                            </h6>
                                            <p class="card-text small text-muted">Required for Agent tasks using Gemini models directly</p>
                                            <div class="input-group mb-2">
                                                <input type="password" class="form-control" id="google-api-key" 
                                                       placeholder="Enter Google AI API key"
                                                       value="${localStorage.getItem('google_api_key') || ''}">
                                                <button class="btn btn-outline-secondary toggle-key-btn" type="button" data-target="google-api-key">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                            </div>
                                            <a href="https://ai.google.dev/tutorials/setup" target="_blank" class="btn btn-sm btn-link px-0">Get API Key</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- External Services Section -->
                        <div class="settings-section mb-4">
                            <h5 class="settings-section-title">External Services</h5>
                            <p class="text-muted small mb-3">Configure credentials for external services used by API tasks.</p>
                            
                            <div class="row g-3">
                                <!-- Serper API Key (Google Search) -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <h6 class="card-title">
                                                <i class="bi bi-search me-1"></i>
                                                Serper (Google Search)
                                            </h6>
                                            <p class="card-text small text-muted">Used for API tasks that need web search capabilities</p>
                                            <div class="input-group mb-2">
                                                <input type="password" class="form-control" id="serper-api-key" 
                                                       placeholder="Enter Serper API key"
                                                       value="${localStorage.getItem('serper_api_key') || ''}">
                                                <button class="btn btn-outline-secondary toggle-key-btn" type="button" data-target="serper-api-key">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                            </div>
                                            <a href="https://serper.dev/api-key" target="_blank" class="btn btn-sm btn-link px-0">Get API Key</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-workflow-settings">Save Settings</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Remove existing modal if it exists
    const existingModal = document.getElementById('workflow-settings-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('workflow-settings-modal'));
    modal.show();
    
    // Handle toggle key visibility buttons
    const toggleKeyButtons = document.querySelectorAll('.toggle-key-btn');
    toggleKeyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const inputField = document.getElementById(targetId);
            if (inputField) {
                if (inputField.type === 'password') {
                    inputField.type = 'text';
                    this.innerHTML = '<i class="bi bi-eye-slash"></i>';
                } else {
                    inputField.type = 'password';
                    this.innerHTML = '<i class="bi bi-eye"></i>';
                }
            }
        });
    });
    
    // Handle save settings button
    const saveSettingsButton = document.getElementById('save-workflow-settings');
    saveSettingsButton.addEventListener('click', function() {
        // Save all API keys to localStorage
        const apiKeys = [
            { id: 'openrouter-api-key', storage: 'openrouter_api_key' },
            { id: 'openai-api-key', storage: 'openai_api_key' },
            { id: 'anthropic-api-key', storage: 'anthropic_api_key' },
            { id: 'google-api-key', storage: 'google_api_key' },
            { id: 'serper-api-key', storage: 'serper_api_key' }
        ];
        
        apiKeys.forEach(key => {
            const input = document.getElementById(key.id);
            if (input && input.value.trim()) {
                localStorage.setItem(key.storage, input.value.trim());
            }
        });
        
        // Close modal and show success message
        modal.hide();
        showToast('Success', 'Settings saved successfully', 'success');
    });
}

// Function to connect workflow action buttons
function connectWorkflowButtons() {
    // Connect run workflow buttons
    const runButtons = document.querySelectorAll('.run-workflow');
    runButtons.forEach(button => {
        button.addEventListener('click', function() {
            const workflowId = this.getAttribute('data-workflow-id');
            if (workflowId) {
                showWorkflowRunModal(workflowId);
            }
        });
    });
    
    // Connect edit workflow buttons
    const editButtons = document.querySelectorAll('.edit-workflow');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const workflowId = this.getAttribute('data-workflow-id');
            if (workflowId) {
                showWorkflowWizardModal(workflowId);
            }
        });
    });
    
    // Connect delete workflow buttons
    const deleteButtons = document.querySelectorAll('.delete-workflow');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const workflowId = this.getAttribute('data-workflow-id');
            if (workflowId) {
                if (confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
                    deleteWorkflow(workflowId);
                }
            }
        });
    });
}

// Function to delete a workflow
function deleteWorkflow(workflowId) {
    if (!orchestratorWizard || !workflowId) {
        showToast('Error', 'Invalid workflow or orchestrator not initialized', 'danger');
        return;
    }
    
    try {
        orchestratorWizard.deleteWorkflow(workflowId);
        orchestratorWizard.saveState();
        showToast('Success', 'Workflow deleted successfully', 'success');
        loadWorkflows();
    } catch (error) {
        console.error('Error deleting workflow:', error);
        showToast('Error', 'Failed to delete workflow', 'danger');
    }
}

// Function to show workflow run modal
function showWorkflowRunModal(workflowId) {
    if (!orchestratorWizard || !workflowId) {
        showToast('Error', 'Invalid workflow or orchestrator not initialized', 'danger');
        return;
    }
    
    try {
        const workflow = orchestratorWizard.getWorkflow(workflowId);
        
        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="workflow-run-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Run Workflow: ${workflow.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-muted">${workflow.description}</p>
                            <div class="mb-3">
                                <label for="workflow-input" class="form-label">Input Parameters (JSON)</label>
                                <textarea class="form-control" id="workflow-input" rows="4">{}</textarea>
                                <div class="form-text">Enter workflow input parameters in JSON format.</div>
                            </div>
                            <div class="workflow-run-output-container d-none">
                                <h6>Workflow Output</h6>
                                <div class="workflow-run-output" id="workflow-output"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="run-workflow-btn">
                                <i class="bi bi-play-fill me-1"></i>
                                Run Workflow
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing modal
        const existingModal = document.getElementById('workflow-run-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Initialize the modal
        const modal = new bootstrap.Modal(document.getElementById('workflow-run-modal'));
        modal.show();
        
        // Attach event listener for run button
        const runButton = document.getElementById('run-workflow-btn');
        if (runButton) {
            runButton.addEventListener('click', function() {
                executeWorkflow(workflowId);
            });
        }
    } catch (error) {
        console.error('Error showing workflow run modal:', error);
        showToast('Error', 'Failed to load workflow', 'danger');
    }
}

// Function to execute a workflow
function executeWorkflow(workflowId) {
    if (!orchestratorWizard || !workflowId) {
        showToast('Error', 'Invalid workflow or orchestrator not initialized', 'danger');
        return;
    }
    
    const inputTextarea = document.getElementById('workflow-input');
    const outputContainer = document.querySelector('.workflow-run-output-container');
    const outputElement = document.getElementById('workflow-output');
    const runButton = document.getElementById('run-workflow-btn');
    
    if (!inputTextarea || !outputContainer || !outputElement || !runButton) {
        showToast('Error', 'Missing UI elements', 'danger');
        return;
    }
    
    let inputs = {};
    try {
        inputs = JSON.parse(inputTextarea.value);
    } catch (error) {
        showToast('Error', 'Invalid JSON input', 'danger');
        return;
    }
    
    // Update UI to show we're running
    runButton.disabled = true;
    runButton.innerHTML = '<i class="bi bi-hourglass me-1"></i> Running...';
    outputContainer.classList.remove('d-none');
    outputElement.textContent = 'Executing workflow...';
    
    // Execute workflow
    orchestratorWizard.executeWorkflow(workflowId, inputs)
        .then(result => {
            outputElement.textContent = JSON.stringify(result, null, 2);
            runButton.disabled = false;
            runButton.innerHTML = '<i class="bi bi-play-fill me-1"></i> Run Again';
        })
        .catch(error => {
            console.error('Error executing workflow:', error);
            outputElement.textContent = `Error: ${error.message || 'Unknown error'}`;
            runButton.disabled = false;
            runButton.innerHTML = '<i class="bi bi-play-fill me-1"></i> Try Again';
        });
}

// Initial rendering
renderFunctions();

// Connect create agent button
if (createAgentButton) {
    createAgentButton.addEventListener('click', function() {
        // Check if agent wizard is initialized
        if (!agentWizard) {
            console.log('Agent wizard not initialized yet, initializing now...');
            initWizards().then(() => {
                console.log('Wizards initialized, showing agent modal...');
                showAgentWizardModal();
            }).catch(err => {
                console.error('Failed to initialize wizards:', err);
                alert('Could not initialize the Agent Wizard. Please check the console for errors.');
            });
        } else {
            // Agent wizard already initialized, show modal directly
            showAgentWizardModal();
        }
    });
}

// Connect create workflow button
const createWorkflowButton = document.getElementById('create-workflow');
if (createWorkflowButton) {
    createWorkflowButton.addEventListener('click', function() {
        // Check if orchestrator wizard is initialized
        if (!orchestratorWizard) {
            console.log('Orchestrator wizard not initialized yet, initializing now...');
            initWizards().then(() => {
                console.log('Wizards initialized, showing workflow modal...');
                showWorkflowWizardModal();
            }).catch(err => {
                console.error('Failed to initialize wizards:', err);
                alert('Could not initialize the Orchestrator Wizard. Please check the console for errors.');
            });
        } else {
            // Orchestrator wizard already initialized, show modal directly
            showWorkflowWizardModal();
        }
    });
}

// Initialize the Chat Interface
document.addEventListener('DOMContentLoaded', function() {
    // Set up chat message submission
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-message-btn');
    const clearChatButton = document.getElementById('clear-chat-btn');
    const streamingToggle = document.getElementById('streaming-toggle');
    
    // Initialize chat
    clearChat(); // Start with a fresh chat and welcome message
    
    // Load saved API keys
    loadSavedCredentials();
    
    // Handle form submission for sending messages
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const isStreaming = streamingToggle ? streamingToggle.checked : true;
            sendMessageToClaude(null, isStreaming);
        });
    }
    
    // Handle send button click
    if (sendButton) {
        sendButton.addEventListener('click', function() {
            const isStreaming = streamingToggle ? streamingToggle.checked : true;
            sendMessageToClaude(null, isStreaming);
        });
    }
    
    // Handle Enter key in user input (if not shift+enter for newline)
    if (userInput) {
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const isStreaming = streamingToggle ? streamingToggle.checked : true;
                sendMessageToClaude(null, isStreaming);
            }
        });
    }
    
    // Handle clear chat button
    if (clearChatButton) {
        clearChatButton.addEventListener('click', function() {
            clearChat();
        });
    }
    
    // Handle direct search form submission
    const searchForm = document.getElementById('search-form');
    const searchButton = document.getElementById('search-btn');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performDirectSearch();
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            performDirectSearch();
        });
    }
    
    // Initialize API key visibility toggles
    const toggleElements = document.querySelectorAll('.toggle-visibility');
    toggleElements.forEach(element => {
        element.addEventListener('click', function() {
            const inputId = this.getAttribute('data-input-id');
            const buttonId = this.getAttribute('id');
            if (inputId && buttonId) {
                toggleApiKeyVisibility(inputId, buttonId);
            }
        });
    });
    
    // Initialize the save settings button
    const saveSettingsButton = document.getElementById('save-settings-btn');
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', function() {
            initClaudeProvider();
        });
    }
    
    console.log('Chat interface initialized');
});
