/**
 * OpenRouter SDK Dashboard
 * Interactive dashboard that showcases all available SDK functions and agents
 */

// Variables for SDK management
let FunctionWizard;
let wizard;

// Initialize dashboard in demo mode
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard initializing in demo mode');
  // Load example functions with mock data
  loadExampleFunctions(true);
  updateConnectionStatus(false);
  
  // Optional: Try to load the SDK if it exists (for future integration)
  // Note: This is just a placeholder for when real SDK integration is needed
  try {
    console.log('SDK not loaded - running in demo mode only');
  } catch (error) {
    console.warn('Error setting up SDK:', error.message);
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
const connectionStatus = document.getElementById('connection-status');

// Function to update connection status indicator
function updateConnectionStatus(isConnected) {
  if (!connectionStatus) return;
  
  if (isConnected) {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.remove('bg-danger', 'bg-warning');
    connectionStatus.classList.add('bg-success');
  } else {
    connectionStatus.textContent = 'Demo Mode';
    connectionStatus.classList.remove('bg-success', 'bg-danger');
    connectionStatus.classList.add('bg-warning');
  }
}

// Function to load example functions and agents
function loadExampleFunctions(useMockOnly = false) {
    // Define Research Agent
    // If wizard is available use it, otherwise use mock implementation
    if (wizard && !useMockOnly) {
      wizard.defineFunction('researchAgent')
        .description('AI Agent that performs web research on a given topic')
        .parameter('topic', 'string', 'Research topic to investigate', true)
        .parameter('depth', 'number', 'Research depth (1-5)', false)
        .parameter('format', 'string', 'Output format (summary/detailed/bullet)', false)
        .implement(async ({ topic, depth = 3, format = 'summary' }) => {
            // Simulated agent behavior
            console.log(`Researching ${topic} at depth ${depth} with format ${format}`);
            return `Research results for ${topic} (${format} format)`;
        })
        .register();
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define Data Analysis Agent
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define Conversational Agent
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define Task Automation Agent
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define Learning Agent
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define Vector Database Integration
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define LLM Router
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define Embedding Generator
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Define AI Orchestrator
    if (wizard && !useMockOnly) {
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
    } else {
      // Mock implementation when SDK is not available
      mockDefineFunction('researchAgent', {
        description: 'AI Agent that performs web research on a given topic',
        parameters: [
          { name: 'topic', type: 'string', description: 'Research topic to investigate', required: true },
          { name: 'depth', type: 'number', description: 'Research depth (1-5)', required: false },
          { name: 'format', type: 'string', description: 'Output format (summary/detailed/bullet)', required: false }
        ]
      });
    }

    // Render the functions
    renderFunctions();
}

// Mock store for functions when SDK is not available
const mockFunctions = [];

// Helper function to mock function definition for demo mode
function mockDefineFunction(name, options) {
    mockFunctions.push({
        name,
        description: options.description || 'No description available',
        parameters: options.parameters || [],
        implementation: options.implement || (() => console.log(`Mock ${name} executed`))
    });
}

// Function to render all available functions
function renderFunctions() {
    // Get functions from wizard if available, or fallback to mock functions
    const functions = (wizard && typeof wizard.listFunctions === 'function') 
        ? wizard.listFunctions() 
        : mockFunctions;
    
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
    const agents = [
        {
            name: 'Research Assistant',
            description: 'Performs in-depth research on any topic and provides comprehensive summaries',
            functions: ['researchAgent', 'vectorStore', 'embeddings'],
            icon: 'bi-search'
        },
        {
            name: 'Data Analyst',
            description: 'Analyzes complex datasets and provides visual insights and recommendations',
            functions: ['analysisAgent', 'vectorStore'],
            icon: 'bi-bar-chart'
        },
        {
            name: 'Conversation Master',
            description: 'Engages in natural, context-aware conversations with customizable personality',
            functions: ['chatAgent', 'learningAgent'],
            icon: 'bi-chat-dots'
        }
    ];
    
    agentsContainer.innerHTML = '';
    agentsCount.textContent = agents.length;
    
    agents.forEach(agent => {
        const agentCard = document.createElement('div');
        agentCard.className = 'col-md-6 col-lg-4 mb-4';
        agentCard.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="function-icon function-type-${agent.icon.includes('search') ? 'research' : agent.icon.includes('chat') ? 'chat' : 'analysis'} me-3">
                            <i class="bi ${agent.icon}"></i>
                        </div>
                        <h5 class="mb-0">${agent.name}</h5>
                    </div>
                    <p class="function-description">${agent.description}</p>
                    <div class="mt-3">
                        <h6 class="mb-2">Composed of:</h6>
                        <div class="d-flex flex-wrap gap-1">
                            ${agent.functions.map(f => `<span class="badge bg-light text-dark">${f}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-white border-top-0">
                    <button class="btn btn-sm btn-outline-primary w-100">Use Agent</button>
                </div>
            </div>
        `;
        
        agentsContainer.appendChild(agentCard);
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
        // Get function from wizard or mocks
        const func = wizard ? wizard.getFunction(functionName) : 
            mockFunctions.find(f => f.name === functionName);
        
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
        
        // Execute the function
        let result;
        if (wizard && typeof wizard.execute === 'function') {
            result = await wizard.execute(functionName, params);
        } else {
            // Mock execution for demo mode
            result = `Demo mode: ${functionName} would execute with params: ${JSON.stringify(params)}`;
            console.log('Demo execution:', result);
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
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

// Initial rendering
renderFunctions();
