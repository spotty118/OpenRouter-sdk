/**
 * Agent Wizard - OpenRouter SDK
 * A utility class for creating, managing, and executing AI agents
 */

export class AgentWizard {
  constructor() {
    this.agents = new Map();
    this.providers = new Map();
    this.templates = new Map();
    this.registerDefaultTemplates();
    
    // Initialize with example agents if none exist
    this.loadState();
    if (this.agents.size === 0) {
      this.registerExampleAgents();
      this.saveState();
    }
  }

  /**
   * Register default agent templates
   */
  registerDefaultTemplates() {
    // Researcher template
    this.registerTemplate('researcher', {
      name: 'Research Agent',
      description: 'AI agent that conducts web searches and synthesizes information',
      icon: 'bi-search',
      color: 'primary',
      basePrompt: 'You are a research assistant that provides thorough and accurate information.',
      defaultTools: ['web_search', 'summarize'],
      parameters: {
        topic: { type: 'string', required: true, description: 'Research topic' },
        depth: { type: 'select', required: false, description: 'Research depth', options: ['basic', 'standard', 'deep'] },
        format: { type: 'select', required: false, description: 'Output format', options: ['summary', 'bullet_points', 'detailed'] }
      }
    });

    // Writer template
    this.registerTemplate('writer', {
      name: 'Content Writer',
      description: 'AI agent that generates various types of written content',
      icon: 'bi-pencil-square',
      color: 'info',
      basePrompt: 'You are a skilled content writer with expertise in creating engaging and well-structured text.',
      defaultTools: ['draft', 'revise'],
      parameters: {
        topic: { type: 'string', required: true, description: 'Content topic' },
        style: { type: 'select', required: false, description: 'Writing style', options: ['formal', 'casual', 'technical', 'creative'] },
        length: { type: 'select', required: false, description: 'Content length', options: ['short', 'medium', 'long'] },
        format: { type: 'select', required: false, description: 'Content format', options: ['blog', 'article', 'email', 'social_post'] }
      }
    });

    // Analyst template
    this.registerTemplate('analyst', {
      name: 'Data Analyst',
      description: 'AI agent that analyzes data and provides insights',
      icon: 'bi-bar-chart',
      color: 'success',
      basePrompt: 'You are a data analyst focused on extracting meaningful insights from information.',
      defaultTools: ['analyze', 'visualize'],
      parameters: {
        data: { type: 'textarea', required: true, description: 'Data to analyze (JSON or CSV)' },
        metrics: { type: 'string', required: true, description: 'Metrics to calculate (comma-separated)' },
        visualize: { type: 'boolean', required: false, description: 'Generate visualizations' }
      }
    });

    // Assistant template
    this.registerTemplate('assistant', {
      name: 'Conversational Assistant',
      description: 'AI agent that engages in helpful conversation',
      icon: 'bi-chat-dots',
      color: 'warning',
      basePrompt: 'You are a helpful, friendly assistant that maintains context throughout conversations.',
      defaultTools: ['chat', 'remember'],
      parameters: {
        personality: { type: 'select', required: false, description: 'Assistant personality', options: ['friendly', 'professional', 'technical', 'creative'] },
        expertise: { type: 'string', required: false, description: 'Areas of expertise (comma-separated)' },
        memory: { type: 'boolean', required: false, description: 'Enable conversation memory' }
      }
    });

    // Coder template
    this.registerTemplate('coder', {
      name: 'Code Assistant',
      description: 'AI agent specialized in software development assistance',
      icon: 'bi-code-square',
      color: 'danger',
      basePrompt: 'You are a coding assistant with expertise in software development across multiple languages and frameworks.',
      defaultTools: ['generate_code', 'explain_code', 'debug'],
      parameters: {
        language: { type: 'select', required: true, description: 'Programming language', options: ['javascript', 'python', 'java', 'typescript', 'go', 'c++', 'other'] },
        task: { type: 'string', required: true, description: 'Coding task description' },
        framework: { type: 'string', required: false, description: 'Framework/library to use' }
      }
    });

    // Workflow template
    this.registerTemplate('workflow', {
      name: 'Workflow Automation',
      description: 'AI agent that orchestrates multi-step tasks',
      icon: 'bi-diagram-3',
      color: 'secondary',
      basePrompt: 'You are a workflow automation assistant that helps break down and execute complex tasks.',
      defaultTools: ['plan', 'execute', 'monitor'],
      parameters: {
        task: { type: 'textarea', required: true, description: 'Complex task description' },
        steps: { type: 'number', required: false, description: 'Maximum number of steps', default: 5 },
        parallel: { type: 'boolean', required: false, description: 'Execute steps in parallel when possible' }
      }
    });
  }

  /**
   * Register a new agent template
   * @param {string} id - Template identifier
   * @param {object} template - Template configuration
   */
  registerTemplate(id, template) {
    this.templates.set(id, template);
    return this;
  }

  /**
   * Get all registered templates
   * @returns {Array} Array of template objects with their IDs
   */
  getTemplates() {
    const templates = [];
    this.templates.forEach((template, id) => {
      templates.push({
        id,
        ...template
      });
    });
    return templates;
  }

  /**
   * Create a new agent from a template
   * @param {string} name - Agent name
   * @param {string} templateId - Template ID to use
   * @param {object} config - Agent configuration
   * @returns {string} Agent ID
   */
  createAgent(name, templateId, config = {}) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const agentId = this.generateId();
    const agent = {
      id: agentId,
      name: name,
      templateId: templateId,
      template: { ...template },
      config: { ...config },
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      status: 'ready',
      executions: []
    };

    this.agents.set(agentId, agent);
    return agentId;
  }

  /**
   * Delete an agent by ID
   * @param {string} agentId - Agent ID
   * @returns {boolean} Success status
   */
  deleteAgent(agentId) {
    return this.agents.delete(agentId);
  }

  /**
   * Update an existing agent
   * @param {string} agentId - Agent ID
   * @param {object} updates - Properties to update
   * @returns {object} Updated agent
   */
  updateAgent(agentId, updates) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    const updatedAgent = {
      ...agent,
      ...updates,
      modified: new Date().toISOString()
    };
    
    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  /**
   * Get all registered agents
   * @returns {Array} Array of agent objects
   */
  getAgents() {
    const agents = [];
    this.agents.forEach(agent => {
      agents.push(agent);
    });
    return agents;
  }

  /**
   * Get an agent by ID
   * @param {string} agentId - Agent ID
   * @returns {object} Agent object
   */
  getAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent;
  }

  /**
   * Register a provider that can execute agent tasks
   * @param {string} providerId - Provider ID
   * @param {object} provider - Provider implementation
   */
  registerProvider(providerId, provider) {
    this.providers.set(providerId, provider);
    return this;
  }

  /**
   * Execute an agent with provided parameters
   * @param {string} agentId - Agent ID
   * @param {object} params - Execution parameters
   * @param {string} providerId - Provider to use (optional)
   * @returns {Promise<object>} Execution result
   */
  async executeAgent(agentId, params = {}, providerId = 'default') {
    const agent = this.getAgent(agentId);
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found. Register a provider first.`);
    }
    
    const executionId = this.generateId('exec');
    const execution = {
      id: executionId,
      agentId: agentId,
      providerId: providerId,
      params: params,
      startTime: new Date().toISOString(),
      status: 'running',
      result: null,
      error: null
    };
    
    // Add to agent's execution history
    agent.executions.unshift(execution);
    if (agent.executions.length > 10) {
      agent.executions.pop(); // Keep only last 10 executions
    }
    
    // Update agent status
    this.updateAgent(agentId, { status: 'executing' });
    
    try {
      // Prepare agent prompt and configuration
      const prompt = this.buildPrompt(agent, params);
      const tools = agent.template.defaultTools || [];
      
      // Execute with provider
      const result = await provider.execute({
        prompt,
        tools,
        params,
        agent
      });
      
      // Update execution with result
      execution.result = result;
      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      
      // Update agent status
      this.updateAgent(agentId, { status: 'ready', lastExecution: execution.id });
      
      return {
        executionId,
        agentId,
        status: 'completed',
        result
      };
    } catch (error) {
      // Update execution with error
      execution.error = {
        message: error.message,
        stack: error.stack
      };
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      
      // Update agent status
      this.updateAgent(agentId, { status: 'error', lastExecution: execution.id });
      
      return {
        executionId,
        agentId,
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Build the prompt for an agent execution
   * @param {object} agent - Agent object
   * @param {object} params - Execution parameters
   * @returns {string} Prompt for LLM
   */
  buildPrompt(agent, params) {
    let prompt = agent.template.basePrompt || '';
    
    // Add parameter-specific instructions
    if (agent.templateId === 'researcher' && params.topic) {
      prompt += `\n\nI need you to research the following topic: ${params.topic}.`;
      if (params.depth) {
        const depthMap = {
          'basic': 'high-level overview',
          'standard': 'comprehensive analysis',
          'deep': 'in-depth investigation'
        };
        prompt += ` Provide a ${depthMap[params.depth]}.`;
      }
      if (params.format) {
        const formatMap = {
          'summary': 'Provide a concise summary.',
          'bullet_points': 'Structure your response as bullet points.',
          'detailed': 'Provide a detailed report with sections and subsections.'
        };
        prompt += ` ${formatMap[params.format]}`;
      }
    } else if (agent.templateId === 'writer' && params.topic) {
      prompt += `\n\nI need you to write content about: ${params.topic}.`;
      if (params.style) {
        prompt += ` Use a ${params.style} writing style.`;
      }
      if (params.format) {
        prompt += ` Format this as a ${params.format.replace('_', ' ')}.`;
      }
      if (params.length) {
        const lengthMap = {
          'short': 'Keep it brief and concise.',
          'medium': 'Provide a moderate amount of detail.',
          'long': 'Create a comprehensive piece with thorough explanations.'
        };
        prompt += ` ${lengthMap[params.length]}`;
      }
    } else if (agent.templateId === 'analyst' && params.data) {
      prompt += `\n\nAnalyze the following data:\n${params.data}\n`;
      if (params.metrics) {
        prompt += `\nCalculate these metrics: ${params.metrics}.`;
      }
      if (params.visualize) {
        prompt += ` Suggest appropriate visualizations for this data.`;
      }
    } else if (agent.templateId === 'coder' && params.task) {
      prompt += `\n\nI need help with the following coding task in ${params.language}: ${params.task}`;
      if (params.framework) {
        prompt += `\nPlease use ${params.framework} framework/library.`;
      }
    }
    
    // Add any custom configuration
    if (agent.config.customPrompt) {
      prompt += `\n\n${agent.config.customPrompt}`;
    }
    
    return prompt;
  }

  /**
   * Generate a unique ID for an agent or execution
   * @param {string} prefix - Optional prefix for the ID
   * @returns {string} Unique ID
   */
  generateId(prefix = 'agent') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Register example agents for first-time users
   */
  registerExampleAgents() {
    // Example Research Agent
    this.createAgent(
      'Web Researcher',
      'researcher',
      {
        topic: 'Artificial Intelligence trends',
        depth: 'standard',
        format: 'detailed'
      }
    );
    
    // Example Content Writer
    this.createAgent(
      'Blog Post Generator',
      'writer',
      {
        topic: 'AI tools for productivity',
        style: 'casual',
        length: 'medium',
        format: 'blog'
      }
    );
    
    // Example Code Assistant
    this.createAgent(
      'JavaScript Helper',
      'coder',
      {
        language: 'javascript',
        task: 'Create a data visualization component',
        framework: 'React'
      }
    );
  }

  /**
   * Save the current state to localStorage
   */
  saveState() {
    try {
      // Convert Maps to objects for storage
      const agentsObject = {};
      this.agents.forEach((agent, id) => {
        agentsObject[id] = agent;
      });
      
      const templatesObject = {};
      this.templates.forEach((template, id) => {
        templatesObject[id] = template;
      });
      
      const state = {
        agents: agentsObject,
        templates: templatesObject
      };
      
      localStorage.setItem('openrouter_agent_wizard_state', JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Failed to save AgentWizard state:', error);
      return false;
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const stateJSON = localStorage.getItem('openrouter_agent_wizard_state');
      if (!stateJSON) return false;
      
      const state = JSON.parse(stateJSON);
      
      // Reset current state
      this.agents = new Map();
      
      // Keep template definitions but restore any saved templates
      if (state.templates) {
        Object.entries(state.templates).forEach(([id, template]) => {
          if (!this.templates.has(id)) {
            this.templates.set(id, template);
          }
        });
      }
      
      // Restore agents
      if (state.agents) {
        Object.entries(state.agents).forEach(([id, agent]) => {
          this.agents.set(id, agent);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load AgentWizard state:', error);
      return false;
    }
  }
}

// Make the class available globally
window.AgentWizard = AgentWizard;
