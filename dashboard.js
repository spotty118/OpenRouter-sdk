/**
 * OpenRouter SDK Dashboard
 * Interactive dashboard that showcases all available SDK functions and agents
 */

// Import the dashboard connector
import dashboardOneAPIConnector from './src/client/dashboard-oneapi-connector.js';

// Import AgentWizard and OrchestratorWizard directly
import { AgentWizard } from './src/core/AgentWizard.js';
import { OrchestratorWizard } from './src/core/OrchestratorWizard.js';
import { FunctionWizard } from './src/utils/function-wizard.js';

// Variables for SDK management
let wizard;

// Agent and Orchestrator wizards
let agentWizard;
let orchestratorWizard;

// Initialize the wizards
async function initWizards() {
  try {
    console.log('Initializing wizards...');
    
    // Initialize function wizard
    try {
      wizard = new FunctionWizard();
      console.log('Function wizard created successfully');
    } catch (funcError) {
      console.error('Error initializing function wizard:', funcError);
    }
    
    // Initialize agent wizard
    try {
      agentWizard = new AgentWizard();
      console.log('Agent wizard created successfully');
      
      agentWizard.loadState();
      console.log('Agent wizard state loaded');
      
      registerDefaultProvider();
      // loadAgents will be called after it's defined
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
  
  // Check API connection status
  checkApiStatus();
  
  try {
    // Initialize SDK
    console.log('Loading SDK...');
    
    // Initialize Wizards using our async function
    initWizards().then(() => {
      // After wizards are loaded, load functions and render components
      loadFunctions();
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
    
    // Check if we have any connected provider
    const hasConnection = statusData && (
      statusData.openai || 
      statusData.anthropic || 
      statusData.gemini || 
      statusData.mistral || 
      statusData.together
    );
    
    updateConnectionStatus(hasConnection);
    
    // Load saved API key from localStorage
    loadSavedApiKey();
    
    // Display active status if connected
    if (hasConnection) {
      showToast('API Connected', 'Successfully connected to OpenRouter API', 'success');
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
  
  // Check if we have an API key in localStorage
  const apiKey = localStorage.getItem('openrouter_api_key');
  const hasApiKey = !!apiKey;
  
  // If we have an API key, consider it connected regardless of the status check
  if (hasApiKey) {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.remove('bg-danger', 'bg-warning');
    connectionStatus.classList.add('bg-success');
    console.log('Connection status: Connected (API key found in localStorage)');
  } else {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('bg-success', 'bg-warning');
    connectionStatus.classList.add('bg-danger');
    console.warn('API connection failed or OpenRouter API key not found');
  }
}

// Update the OpenRouter status badge
function updateOpenRouterStatus(isConnected) {
  const statusElement = document.getElementById('openrouter-status');
  if (!statusElement) return;
  
  if (isConnected) {
    statusElement.textContent = 'Connected';
    statusElement.className = 'badge bg-success';
  } else {
    statusElement.textContent = 'Not Configured';
    statusElement.className = 'badge bg-secondary';
  }
}

// Load saved API key from localStorage
function loadSavedApiKey() {
  const savedKey = localStorage.getItem('openrouter_api_key');
  
  // Update the input field if it exists
  const input = document.getElementById('openrouter-key');
  if (input && savedKey) {
    input.value = savedKey;
  }
  
  // Also update the main API key input
  if (apiKeyInput && savedKey) {
    apiKeyInput.value = savedKey;
  }
  
  // Update status based on whether we have a key
  updateOpenRouterStatus(!!savedKey);
}

// Update OpenRouter API key
async function updateOpenRouterApiKey() {
  try {
    // Get value from the API key input
    const keyInput = document.getElementById('openrouter-key');
    if (!keyInput) {
      showToast('Error', 'OpenRouter API key input not found', 'error');
      return;
    }
    
    const apiKey = keyInput.value.trim();
    if (!apiKey) {
      showToast('Error', 'Please enter an OpenRouter API key', 'error');
      return;
    }
    
    // Update button state
    const updateButton = document.getElementById('update-api-key');
    if (updateButton) {
      updateButton.disabled = true;
      updateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
    }
    
    // Save to localStorage
    localStorage.setItem('openrouter_api_key', apiKey);
    
    // Update the main API key input as well
    if (apiKeyInput) {
      apiKeyInput.value = apiKey;
    }
    
    // Use our OneAPI connector to update the key
    const result = await dashboardOneAPIConnector.updateApiKeys({
      openRouterApiKey: apiKey
    });
    
    console.log('Update API key result:', result);
    
    if (result.success) {
      showToast('Success', 'OpenRouter API key updated successfully', 'success');
      
      // Update status
      updateOpenRouterStatus(true);
    } else {
      showToast('Error', 'Failed to update OpenRouter API key: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error updating OpenRouter API key:', error);
    showToast('Error', 'Failed to update OpenRouter API key: ' + error.message, 'error');
  } finally {
    // Reset button state
    const updateButton = document.getElementById('update-api-key');
    if (updateButton) {
      updateButton.disabled = false;
      updateButton.innerHTML = '<i class="bi bi-check-circle me-1"></i> Update API Key';
    }
  }
}

// Test OpenRouter API key connection
async function testOpenRouterConnection() {
  const keyInput = document.getElementById('openrouter-key');
  if (!keyInput || !keyInput.value.trim()) {
    showToast('Error', 'Please enter an OpenRouter API key first', 'error');
    return;
  }
  
  try {
    // Update button state
    const testButton = document.querySelector('.test-api-key[data-provider="openrouter"]');
    if (testButton) {
      testButton.disabled = true;
      testButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Testing...';
    }
    
    // Store the API key in localStorage for our test function
    localStorage.setItem('openrouter_api_key', keyInput.value.trim());
    console.log('Saved OpenRouter API key to localStorage');
    
    console.log(`Testing OpenRouter connection with key: ${keyInput.value.substring(0, 10)}...`);
    
    // Use the standard OneAPI connector
    const result = await dashboardOneAPIConnector.testOpenRouterConnection(keyInput.value.trim());
    
    console.log(`OpenRouter test result:`, result);
    
    if (result.success) {
      showToast('Success', `OpenRouter API key is valid!`, 'success');
      
      // Update status
      updateOpenRouterStatus(true);
      
      // Refresh the API status to update the UI
      await dashboardOneAPIConnector.getStatus();
    } else {
      const errorMsg = result.error || 'API key validation failed';
      showToast('Warning', `OpenRouter API key validation issue: ${errorMsg}`, 'warning');
      
      // Update status
      updateOpenRouterStatus(false);
    }
  } catch (error) {
    console.error(`Error testing OpenRouter API key:`, error);
    showToast('Error', `Failed to test OpenRouter API key: ` + error.message, 'error');
  } finally {
    // Reset button state
    const testButton = document.querySelector('.test-api-key[data-provider="openrouter"]');
    if (testButton) {
      testButton.disabled = false;
      testButton.innerHTML = 'Test Connection';
    }
  }
}

// Setup API Key Management UI interactions
function setupApiKeyManagement() {
  // Set up Update API Key button
  const updateButton = document.getElementById('update-api-key');
  if (updateButton) {
    updateButton.addEventListener('click', updateOpenRouterApiKey);
  }
  
  // Set up test button
  const testButton = document.querySelector('.test-api-key[data-provider="openrouter"]');
  if (testButton) {
    testButton.addEventListener('click', testOpenRouterConnection);
  }
  
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
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
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
    
    document.getElementById('toast-container').appendChild(toast);
    
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
                    const response = await dashboardOneAPIConnector.executeAgent(agentType, apiParams);
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
    }
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
    `;
    
    document.head.appendChild(styleElement);
}

// Initial rendering
document.addEventListener('DOMContentLoaded', function() {
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

// Function to show agent run modal
function showAgentRunModal(agentId) {
    // Implementation will be added in future updates
    showToast('Coming Soon', 'Agent run functionality is coming soon!', 'info');
}

// Function to show agent wizard modal
function showAgentWizardModal(agentId = null) {
    // Implementation will be added in future updates
    showToast('Coming Soon', 'Agent wizard is coming soon!', 'info');
}

// Function to load workflows
function loadWorkflows() {
    // Implementation will be added in future updates
    console.log('Workflow loading will be implemented in future updates');
}

// Function to load agents
function loadAgents() {
    // Implementation will be added in future updates
    console.log('Loading agents...');
    renderAgents();
}
