/**
 * Agent Dashboard Component
 * 
 * Frontend interface for interacting with AI agents
 */

// Import the OneAPI connector
import { dashboardOneAPIConnector } from './dashboard-oneapi-connector.js';

// Variables for agent management
let agentList = [];
let selectedAgent = null;
let taskHistory = [];
let agentStatusInterval = null;

// Initialize the agent dashboard
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('agent-dashboard')) {
    initializeAgentDashboard();
  }
});

/**
 * Initialize the agent dashboard
 */
async function initializeAgentDashboard() {
  console.log('Initializing agent dashboard...');
  
  // Set up UI elements
  setupAgentDashboardUI();
  
  // Load agents
  await loadAgents();
  
  // Set up WebSocket for real-time updates
  setupAgentWebSocket();
  
  // Start status polling
  startAgentStatusPolling();
  
  console.log('Agent dashboard initialized');
}

/**
 * Set up agent dashboard UI elements
 */
function setupAgentDashboardUI() {
  // Agent list container
  const agentListContainer = document.getElementById('agent-list');
  if (!agentListContainer) {
    console.error('Agent list container not found');
    return;
  }
  
  // Task form
  const taskForm = document.getElementById('agent-task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmission);
  }
  
  // Research form
  const researchForm = document.getElementById('research-form');
  if (researchForm) {
    researchForm.addEventListener('submit', handleResearchSubmission);
  }
  
  // Agent refresh button
  const refreshButton = document.getElementById('refresh-agents');
  if (refreshButton) {
    refreshButton.addEventListener('click', loadAgents);
  }
  
  // Task history clear button
  const clearHistoryButton = document.getElementById('clear-task-history');
  if (clearHistoryButton) {
    clearHistoryButton.addEventListener('click', clearTaskHistory);
  }
}

/**
 * Load available agents from API
 */
async function loadAgents() {
  try {
    // Show loading state
    const agentListContainer = document.getElementById('agent-list');
    if (agentListContainer) {
      agentListContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p class="mt-2">Loading agents...</p></div>';
    }
    
    // Fetch agents from API
    const response = await dashboardOneAPIConnector.fetchAgents();
    
    if (response.agents && Array.isArray(response.agents)) {
      agentList = response.agents;
      renderAgentList();
      
      // Select first agent by default
      if (agentList.length > 0 && !selectedAgent) {
        selectAgent(agentList[0].id);
      }
      
      // Update agent count
      const agentCount = document.getElementById('agent-count');
      if (agentCount) {
        agentCount.textContent = agentList.length;
      }
    } else {
      console.error('Invalid agent list response:', response);
      showToast('Error', 'Failed to load agents', 'error');
    }
  } catch (error) {
    console.error('Error loading agents:', error);
    showToast('Error', `Failed to load agents: ${error.message}`, 'error');
    
    // Show error state
    const agentListContainer = document.getElementById('agent-list');
    if (agentListContainer) {
      agentListContainer.innerHTML = '<div class="alert alert-danger">Failed to load agents. Please try again.</div>';
    }
  }
}

/**
 * Render the agent list
 */
function renderAgentList() {
  const agentListContainer = document.getElementById('agent-list');
  if (!agentListContainer) return;
  
  if (agentList.length === 0) {
    agentListContainer.innerHTML = '<div class="alert alert-info">No agents available.</div>';
    return;
  }
  
  agentListContainer.innerHTML = '';
  
  // Create agent cards
  agentList.forEach(agent => {
    const agentCard = document.createElement('div');
    agentCard.className = `card agent-card mb-3 ${selectedAgent === agent.id ? 'border-primary' : ''}`;
    agentCard.dataset.agentId = agent.id;
    
    // Determine status color
    let statusColor = 'secondary';
    let statusText = 'Unknown';
    
    if (agent.status) {
      if (agent.status.available) {
        statusColor = 'success';
        statusText = 'Available';
      } else if (agent.status.activeTasks > 0) {
        statusColor = 'warning';
        statusText = 'Busy';
      } else {
        statusColor = 'danger';
        statusText = 'Unavailable';
      }
    }
    
    // Calculate load percentage
    const loadPercentage = agent.status ? Math.round(agent.status.load * 100) : 0;
    
    agentCard.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">${agent.name}</h5>
        <span class="badge bg-${statusColor}">${statusText}</span>
      </div>
      <div class="card-body">
        <p class="card-text"><strong>ID:</strong> ${agent.id}</p>
        <p class="card-text"><strong>Model:</strong> ${agent.model || 'Not specified'}</p>
        <div class="mb-2">
          <label class="form-label d-flex justify-content-between">
            <span>Load: ${loadPercentage}%</span>
            <span>Active Tasks: ${agent.status?.activeTasks || 0}</span>
          </label>
          <div class="progress">
            <div class="progress-bar bg-${statusColor}" role="progressbar" style="width: ${loadPercentage}%" 
                 aria-valuenow="${loadPercentage}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
        <div class="d-grid gap-2">
          <button class="btn btn-primary select-agent" data-agent-id="${agent.id}">
            ${selectedAgent === agent.id ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    `;
    
    agentListContainer.appendChild(agentCard);
    
    // Add click event
    const selectButton = agentCard.querySelector('.select-agent');
    if (selectButton) {
      selectButton.addEventListener('click', () => selectAgent(agent.id));
    }
  });
}

/**
 * Select an agent
 */
async function selectAgent(agentId) {
  try {
    selectedAgent = agentId;
    
    // Update UI
    document.querySelectorAll('.agent-card').forEach(card => {
      if (card.dataset.agentId === agentId) {
        card.classList.add('border-primary');
        card.querySelector('.select-agent').textContent = 'Selected';
      } else {
        card.classList.remove('border-primary');
        card.querySelector('.select-agent').textContent = 'Select';
      }
    });
    
    // Enable task form
    const taskForm = document.getElementById('agent-task-form');
    if (taskForm) {
      taskForm.classList.remove('disabled');
      const submitButton = taskForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
    
    // Fetch agent details
    const agentDetails = await dashboardOneAPIConnector.fetchAgentDetails(agentId);
    
    // Update agent details panel
    const detailsPanel = document.getElementById('agent-details');
    if (detailsPanel && agentDetails) {
      // Format capabilities
      let capabilitiesHtml = '<p>No capabilities information available</p>';
      if (agentDetails.capabilities) {
        capabilitiesHtml = '<ul class="list-group">';
        for (const [capability, enabled] of Object.entries(agentDetails.capabilities)) {
          if (typeof enabled === 'boolean') {
            capabilitiesHtml += `
              <li class="list-group-item d-flex justify-content-between align-items-center">
                ${capability.charAt(0).toUpperCase() + capability.slice(1)}
                <span class="badge bg-${enabled ? 'success' : 'secondary'} rounded-pill">
                  ${enabled ? 'Enabled' : 'Disabled'}
                </span>
              </li>
            `;
          } else if (capability === 'maxContextLength') {
            capabilitiesHtml += `
              <li class="list-group-item d-flex justify-content-between align-items-center">
                Max Context Length
                <span class="badge bg-info rounded-pill">${enabled} tokens</span>
              </li>
            `;
          }
        }
        capabilitiesHtml += '</ul>';
      }
      
      // Format metrics
      let metricsHtml = '<p>No metrics available</p>';
      if (agentDetails.metrics) {
        metricsHtml = `
          <div class="row">
            <div class="col-md-6">
              <div class="card mb-3">
                <div class="card-body">
                  <h6 class="card-title">Success Rate</h6>
                  <div class="progress mb-2">
                    <div class="progress-bar bg-success" role="progressbar" 
                         style="width: ${Math.round(agentDetails.metrics.successRate * 100)}%" 
                         aria-valuenow="${Math.round(agentDetails.metrics.successRate * 100)}" 
                         aria-valuemin="0" aria-valuemax="100">
                      ${Math.round(agentDetails.metrics.successRate * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card mb-3">
                <div class="card-body">
                  <h6 class="card-title">Average Latency</h6>
                  <p class="card-text">${Math.round(agentDetails.metrics.latency)}ms</p>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <div class="card mb-3">
                <div class="card-body">
                  <h6 class="card-title">Task Count</h6>
                  <p class="card-text">${agentDetails.metrics.taskCount}</p>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card mb-3">
                <div class="card-body">
                  <h6 class="card-title">Error Count</h6>
                  <p class="card-text">${agentDetails.metrics.errorCount}</p>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      detailsPanel.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Agent Details: ${agentDetails.name}</h5>
          </div>
          <div class="card-body">
            <h6>Capabilities</h6>
            ${capabilitiesHtml}
            
            <h6 class="mt-4">Metrics</h6>
            ${metricsHtml}
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error(`Error selecting agent ${agentId}:`, error);
    showToast('Error', `Failed to select agent: ${error.message}`, 'error');
  }
}

/**
 * Handle task submission
 */
async function handleTaskSubmission(event) {
  event.preventDefault();
  
  if (!selectedAgent) {
    showToast('Error', 'Please select an agent first', 'error');
    return;
  }
  
  const taskInput = document.getElementById('task-input');
  if (!taskInput || !taskInput.value.trim()) {
    showToast('Error', 'Please enter a task description', 'error');
    return;
  }
  
  // Get task options
  const requiresThinking = document.getElementById('requires-thinking')?.checked ?? true;
  const requiresToolUse = document.getElementById('requires-tool-use')?.checked ?? false;
  const requiresReasoning = document.getElementById('requires-reasoning')?.checked ?? true;
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Executing...';
  }
  
  try {
    // Execute task
    const result = await dashboardOneAPIConnector.executeAgentTask(
      selectedAgent,
      {
        task: taskInput.value,
        requiresThinking,
        requiresToolUse,
        requiresReasoning
      }
    );
    
    // Add to task history
    addTaskToHistory({
      id: result.taskId,
      description: taskInput.value,
      result: result,
      timestamp: new Date(),
      agent: selectedAgent
    });
    
    // Show success message
    showToast('Success', 'Task executed successfully', 'success');
    
    // Clear input
    taskInput.value = '';
    
  } catch (error) {
    console.error('Error executing task:', error);
    showToast('Error', `Failed to execute task: ${error.message}`, 'error');
    
    // Add to task history as error
    addTaskToHistory({
      id: `error-${Date.now()}`,
      description: taskInput.value,
      error: error.message,
      timestamp: new Date(),
      agent: selectedAgent
    });
  } finally {
    // Reset button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Execute Task';
    }
  }
}

/**
 * Handle research submission
 */
async function handleResearchSubmission(event) {
  event.preventDefault();
  
  const queryInput = document.getElementById('research-query');
  if (!queryInput || !queryInput.value.trim()) {
    showToast('Error', 'Please enter a research query', 'error');
    return;
  }
  
  // Get depth
  const depthInput = document.getElementById('research-depth');
  const depth = depthInput ? parseInt(depthInput.value, 10) : 2;
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Researching...';
  }
  
  try {
    // Execute research
    const result = await dashboardOneAPIConnector.executeResearch({
      query: queryInput.value,
      depth
    });
    
    // Add to task history
    addTaskToHistory({
      id: result.taskId,
      description: `Research: ${queryInput.value}`,
      result: result,
      timestamp: new Date(),
      agent: 'research-agent'
    });
    
    // Show success message
    showToast('Success', 'Research completed successfully', 'success');
    
    // Clear input
    queryInput.value = '';
    
  } catch (error) {
    console.error('Error executing research:', error);
    showToast('Error', `Failed to execute research: ${error.message}`, 'error');
    
    // Add to task history as error
    addTaskToHistory({
      id: `error-${Date.now()}`,
      description: `Research: ${queryInput.value}`,
      error: error.message,
      timestamp: new Date(),
      agent: 'research-agent'
    });
  } finally {
    // Reset button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Research';
    }
  }
}

/**
 * Add task to history
 */
function addTaskToHistory(task) {
  // Add to history array
  taskHistory.unshift(task);
  
  // Keep only last 20 tasks
  if (taskHistory.length > 20) {
    taskHistory.pop();
  }
  
  // Update UI
  renderTaskHistory();
}

/**
 * Render task history
 */
function renderTaskHistory() {
  const historyContainer = document.getElementById('task-history');
  if (!historyContainer) return;
  
  if (taskHistory.length === 0) {
    historyContainer.innerHTML = '<div class="alert alert-info">No task history yet.</div>';
    return;
  }
  
  historyContainer.innerHTML = '';
  
  // Create task history items
  taskHistory.forEach(task => {
    const historyItem = document.createElement('div');
    historyItem.className = `card mb-3 ${task.error ? 'border-danger' : 'border-success'}`;
    
    // Format timestamp
    const timestamp = new Date(task.timestamp).toLocaleString();
    
    // Format result
    let resultHtml = '';
    if (task.error) {
      resultHtml = `<div class="alert alert-danger">${task.error}</div>`;
    } else if (task.result) {
      if (task.result.data) {
        // Research result
        if (task.result.data.summary) {
          resultHtml = `
            <div class="mb-3">
              <h6>Summary</h6>
              <div class="p-2 bg-light rounded">${task.result.data.summary}</div>
            </div>
          `;
          
          if (task.result.data.insights && task.result.data.insights.length > 0) {
            resultHtml += `
              <div class="mb-3">
                <h6>Key Insights</h6>
                <ul class="list-group">
                  ${task.result.data.insights.map(insight => `<li class="list-group-item">${insight}</li>`).join('')}
                </ul>
              </div>
            `;
          }
          
          if (task.result.data.sources && task.result.data.sources.length > 0) {
            resultHtml += `
              <div>
                <h6>Sources</h6>
                <div class="sources-list" style="max-height: 200px; overflow-y: auto;">
                  <ul class="list-group">
                    ${task.result.data.sources.map(source => `
                      <li class="list-group-item">
                        <a href="${source.url}" target="_blank">${source.title}</a>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </div>
            `;
          }
        } else {
          // Generic result
          resultHtml = `<pre class="p-2 bg-light rounded">${JSON.stringify(task.result.data, null, 2)}</pre>`;
        }
      } else {
        resultHtml = `<div class="alert alert-success">Task completed successfully, but no data returned.</div>`;
      }
    }
    
    historyItem.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">${task.description}</h6>
        <span class="badge bg-secondary">${timestamp}</span>
      </div>
      <div class="card-body">
        <p><strong>Task ID:</strong> ${task.id}</p>
        <p><strong>Agent:</strong> ${task.agent}</p>
        <div class="task-result">
          ${resultHtml}
        </div>
      </div>
    `;
    
    historyContainer.appendChild(historyItem);
  });
}

/**
 * Clear task history
 */
function clearTaskHistory() {
  taskHistory = [];
  renderTaskHistory();
  showToast('Info', 'Task history cleared', 'info');
}

/**
 * Set up WebSocket for real-time updates
 */
function setupAgentWebSocket() {
  try {
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'status') {
          // Update agent status
          updateAgentStatus(message.data);
        } else if (message.type === 'metrics') {
          // Update metrics
          console.log('Received metrics update:', message.data);
        } else if (message.type === 'error') {
          // Show error notification
          console.error('Received error notification:', message.data);
          showToast('Error', message.data.message, 'error');
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Try to reconnect after 5 seconds
      setTimeout(setupAgentWebSocket, 5000);
    };
  } catch (error) {
    console.error('Error setting up WebSocket:', error);
  }
}

/**
 * Update agent status from WebSocket message
 */
function updateAgentStatus(data) {
  // Find agent in list
  const agent = agentList.find(a => a.model === data.model || a.id === data.model);
  if (!agent) return;
  
  // Update status
  if (!agent.status) {
    agent.status = {};
  }
  
  agent.status.available = data.available;
  agent.status.activeTasks = data.requestCount;
  agent.status.load = data.requestCount > 0 ? Math.min(data.requestCount / 5, 1) : 0;
  agent.status.errorRate = data.errorRate;
  
  // Re-render agent list
  renderAgentList();
  
  // Update details if this is the selected agent
  if (selectedAgent === agent.id) {
    selectAgent(agent.id);
  }
}

/**
 * Start polling for agent status
 */
function startAgentStatusPolling() {
  // Clear existing interval
  if (agentStatusInterval) {
    clearInterval(agentStatusInterval);
  }
  
  // Poll every 10 seconds
  agentStatusInterval = setInterval(async () => {
    try {
      await loadAgents();
    } catch (error) {
      console.error('Error polling agent status:', error);
    }
  }, 10000);
}

/**
 * Show toast notification
 */
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

// Export functions for external use
export {
  initializeAgentDashboard,
  loadAgents,
  selectAgent,
  handleTaskSubmission,
  handleResearchSubmission
};
