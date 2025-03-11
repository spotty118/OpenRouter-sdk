/**
 * Function Dashboard UI Manager
 * Provides a web interface for the Function Wizard
 */

export class FunctionDashboard {
  constructor(containerId, wizard) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element ${containerId} not found`);
    }
    this.container = container;
    this.wizard = wizard;
    this.activeTab = 'functions';
  }

  /**
   * Initialize the dashboard UI
   */
  initialize() {
    this.container.innerHTML = `
      <div class="function-dashboard">
        <nav class="dashboard-nav">
          <button class="tab-button active" data-tab="functions">Functions</button>
          <button class="tab-button" data-tab="create">Create Function</button>
          <button class="tab-button" data-tab="execute">Execute</button>
          <button class="tab-button" data-tab="logs">Logs</button>
        </nav>
        
        <div class="dashboard-content">
          <div id="functions-tab" class="tab-pane active"></div>
          <div id="create-tab" class="tab-pane"></div>
          <div id="execute-tab" class="tab-pane"></div>
          <div id="logs-tab" class="tab-pane"></div>
        </div>
      </div>
    `;

    this.addStyles();
    this.setupEventListeners();
    this.renderFunctionsTab();
    this.renderCreateTab();
    this.renderExecuteTab();
    this.renderLogsTab();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .function-dashboard {
        font-family: system-ui, -apple-system, sans-serif;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        padding: 20px;
      }

      .dashboard-nav {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
      }

      .tab-button {
        padding: 8px 16px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .tab-button:hover {
        background: #f0f0f0;
      }

      .tab-button.active {
        background: #007bff;
        color: white;
      }

      .tab-pane {
        display: none;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 4px;
      }

      .tab-pane.active {
        display: block;
      }

      .function-card {
        background: white;
        border-radius: 4px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .function-card h3 {
        margin: 0 0 8px 0;
        color: #2c3e50;
      }

      .function-card p {
        margin: 0 0 12px 0;
        color: #666;
      }

      .parameter-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .parameter-item {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 4px;
      }

      .required-badge {
        background: #dc3545;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }

      .type-badge {
        background: #6c757d;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }

      .create-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 600px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-group label {
        font-weight: 500;
        color: #2c3e50;
      }

      .form-group input, .form-group textarea, .form-group select {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .form-group textarea {
        min-height: 100px;
        font-family: monospace;
      }

      .error-message {
        color: #dc3545;
        font-size: 14px;
        margin-top: 4px;
      }

      .success-message {
        color: #28a745;
        font-size: 14px;
        margin-top: 4px;
      }

      .button {
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .button:hover {
        background: #0056b3;
      }

      .button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .execution-result {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 4px;
        margin-top: 16px;
        font-family: monospace;
        white-space: pre-wrap;
      }

      .log-entry {
        padding: 8px;
        border-bottom: 1px solid #eee;
        font-family: monospace;
        font-size: 13px;
      }

      .log-entry.error {
        color: #dc3545;
        background: #fff5f5;
      }

      .log-entry.success {
        color: #28a745;
        background: #f4fff4;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update button states
    const buttons = this.container.querySelectorAll('.tab-button');
    buttons.forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-tab') === tabName);
    });

    // Update tab visibility
    const tabs = this.container.querySelectorAll('.tab-pane');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.id === `${tabName}-tab`);
    });
  }

  renderFunctionsTab() {
    const tab = this.container.querySelector('#functions-tab');
    if (!tab) return;

    const functions = this.wizard.listFunctions();
    let html = '<h2>Available Functions</h2>';

    if (functions.length === 0) {
      html += '<p>No functions registered yet. Create one in the Create tab.</p>';
    } else {
      functions.forEach(func => {
        const schema = this.wizard.getSchema(func.name);
        html += `
          <div class="function-card">
            <h3>${func.name}</h3>
            <p>${func.description}</p>
            <div class="parameters">
              <strong>Parameters:</strong>
              <ul class="parameter-list">
                ${Object.entries(schema.parameters).map(([name, param]) => `
                  <li class="parameter-item">
                    <span>${name}</span>
                    <span class="type-badge">${param.type}</span>
                    ${schema.required?.includes(name) ? 
                      '<span class="required-badge">Required</span>' : 
                      ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        `;
      });
    }

    tab.innerHTML = html;
  }

  renderCreateTab() {
    const tab = this.container.querySelector('#create-tab');
    if (!tab) return;

    tab.innerHTML = `
      <h2>Create New Function</h2>
      <form class="create-form" id="create-function-form">
        <div class="form-group">
          <label for="func-name">Function Name</label>
          <input type="text" id="func-name" required placeholder="e.g., calculateTotal">
        </div>

        <div class="form-group">
          <label for="func-description">Description</label>
          <textarea id="func-description" required placeholder="Describe what the function does"></textarea>
        </div>

        <div class="form-group">
          <label for="func-parameters">Parameters (JSON format)</label>
          <textarea id="func-parameters" placeholder='[
  {
    "name": "amount",
    "type": "number",
    "description": "The amount to calculate",
    "required": true
  }
]'></textarea>
        </div>

        <div class="form-group">
          <label for="func-implementation">Implementation (JavaScript)</label>
          <textarea id="func-implementation" placeholder="async ({ amount }) => {
  return amount * 1.2;
}"></textarea>
        </div>

        <button type="submit" class="button">Create Function</button>
      </form>
      <div id="create-result"></div>
    `;

    const form = tab.querySelector('#create-function-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('func-name');
      const descInput = document.getElementById('func-description');
      const paramsInput = document.getElementById('func-parameters');
      const implInput = document.getElementById('func-implementation');

      try {
        const parameters = JSON.parse(paramsInput.value);
        const implementation = new Function('return ' + implInput.value)();

        const builder = this.wizard.defineFunction(nameInput.value)
          .description(descInput.value);

        parameters.forEach(param => {
          builder.parameter(param.name, param.type, param.description, param.required);
        });

        builder.implement(implementation).register();

        const result = document.getElementById('create-result');
        if (result) {
          result.innerHTML = '<div class="success-message">Function created successfully!</div>';
          setTimeout(() => this.renderFunctionsTab(), 500);
        }
      } catch (error) {
        const result = document.getElementById('create-result');
        if (result) {
          result.innerHTML = `<div class="error-message">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
      }
    });
  }

  renderExecuteTab() {
    const tab = this.container.querySelector('#execute-tab');
    if (!tab) return;

    const functions = this.wizard.listFunctions();
    
    tab.innerHTML = `
      <h2>Execute Function</h2>
      <form class="create-form" id="execute-function-form">
        <div class="form-group">
          <label for="exec-function">Select Function</label>
          <select id="exec-function" required>
            <option value="">Select a function...</option>
            ${functions.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="exec-params">Parameters (JSON format)</label>
          <textarea id="exec-params" required placeholder='{"param1": "value1"}'></textarea>
        </div>

        <button type="submit" class="button">Execute</button>
      </form>
      <div id="execution-result"></div>
    `;

    const form = tab.querySelector('#execute-function-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const funcSelect = document.getElementById('exec-function');
      const paramsInput = document.getElementById('exec-params');

      try {
        const params = JSON.parse(paramsInput.value);
        const result = await this.wizard.execute(funcSelect.value, params);
        
        const resultDiv = document.getElementById('execution-result');
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div class="execution-result">
              <strong>Result:</strong>
              <pre>${JSON.stringify(result, null, 2)}</pre>
            </div>
          `;
        }
      } catch (error) {
        const resultDiv = document.getElementById('execution-result');
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div class="error-message">
              Error: ${error instanceof Error ? error.message : String(error)}
            </div>
          `;
        }
      }
    });

    // Update parameter template when function is selected
    const funcSelect = document.getElementById('exec-function');
    funcSelect?.addEventListener('change', (e) => {
      const target = e.target;
      if (target.value) {
        const schema = this.wizard.getSchema(target.value);
        const template = {};
        Object.entries(schema.parameters).forEach(([name, param]) => {
          template[name] = `<${param.type}>`;
        });
        const paramsInput = document.getElementById('exec-params');
        paramsInput.value = JSON.stringify(template, null, 2);
      }
    });
  }

  renderLogsTab() {
    const tab = this.container.querySelector('#logs-tab');
    if (!tab) return;

    tab.innerHTML = `
      <h2>Execution Logs</h2>
      <div id="log-entries"></div>
    `;
  }

  /**
   * Add a log entry to the logs tab
   */
  addLogEntry(message, type = 'info') {
    const logEntries = this.container.querySelector('#log-entries');
    if (!logEntries) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toISOString()}] ${message}`;
    logEntries.insertBefore(entry, logEntries.firstChild);
  }

  /**
   * Refresh the dashboard UI
   */
  refresh() {
    this.renderFunctionsTab();
    this.renderExecuteTab();
  }
}
