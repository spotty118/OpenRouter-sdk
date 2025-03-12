/**
 * Orchestrator Wizard - OpenRouter SDK
 * A utility class for creating, managing, and executing workflows
 */

import oneapiModule from '../oneapi.js';

export class OrchestratorWizard {
  constructor() {
    this.workflows = new Map();
    this.crews = new Map();
    this.tasks = new Map();
    this.orchestratorInstances = new Map();
    this.oneAPI = oneapiModule.getOneAPI();
    this.defaultModel = 'openai/gpt-4-turbo';
    this.providers = new Map();
    this.templates = new Map();
    this.registerDefaultTemplates();
    
    // Initialize with example workflows if none exist
    this.loadState();
    if (this.workflows.size === 0) {
      this.registerExampleWorkflows();
      this.saveState();
    }
  }

  /**
   * Initialize the orchestrator with configuration
   * @param {Object} config - Orchestrator configuration 
   * @returns {string} Orchestrator instance ID
   */
  createOrchestrator(config) {
    const id = this.generateId();
    this.orchestratorInstances.set(id, {
      id,
      config,
      created: new Date().toISOString(),
      status: 'ready'
    });
    
    this.saveState();
    return id;
  }

  /**
   * Create a new workflow
   * @param {string} name - Workflow name
   * @param {string} description - Workflow description
   * @param {Object} config - Workflow configuration
   * @returns {string} Workflow ID
   */
  createWorkflow(name, description, config = {}) {
    const id = this.generateId();
    const workflow = {
      id,
      name,
      description,
      config,
      tasks: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      status: 'ready'
    };
    
    this.workflows.set(id, workflow);
    this.saveState();
    return id;
  }

  /**
   * Add a task to a workflow
   * @param {string} workflowId - Workflow ID
   * @param {string} taskId - Task ID to add
   * @param {Object} config - Task configuration within this workflow
   * @returns {boolean} Success status
   */
  addTaskToWorkflow(workflowId, taskId, config = {}) {
    const workflow = this.workflows.get(workflowId);
    const task = this.tasks.get(taskId);
    
    if (!workflow || !task) {
      return false;
    }
    
    workflow.tasks.push({
      taskId,
      config
    });
    
    workflow.modified = new Date().toISOString();
    this.saveState();
    return true;
  }

  /**
   * Create a new task
   * @param {string} name - Task name
   * @param {string} description - Task description
   * @param {string} type - Task type (agent, function, input, output)
   * @param {Object} config - Task configuration
   * @returns {string} Task ID
   */
  createTask(name, description, type, config = {}) {
    const id = this.generateId();
    const task = {
      id,
      name,
      description,
      type,
      config,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      status: 'ready'
    };
    
    this.tasks.set(id, task);
    this.saveState();
    return id;
  }

  /**
   * Create a new crew (team of agents)
   * @param {string} name - Crew name 
   * @param {string} description - Crew description
   * @param {Array} agentIds - Array of agent IDs
   * @param {Object} config - Crew configuration
   * @returns {string} Crew ID
   */
  createCrew(name, description, agentIds = [], config = {}) {
    const id = this.generateId();
    const crew = {
      id,
      name,
      description,
      agents: agentIds,
      config,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      status: 'ready'
    };
    
    this.crews.set(id, crew);
    this.saveState();
    return id;
  }

  /**
   * Execute a workflow using OneAPI
   * @param {string} workflowId - Workflow ID to execute
   * @param {Object} inputs - Input values for the workflow
   * @param {Object} options - Execution options including model, temperature, etc.
   * @returns {Promise} Execution results promise
   */
  async executeWorkflow(workflowId, inputs = {}, options = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    console.log(`Executing workflow with OneAPI: ${workflow.name}`);
    
    const executionStartTime = Date.now();
    const taskResults = [];
    const workflowContext = { ...inputs };
    
    try {
      // Set up workflow execution options
      const model = options.model || this.defaultModel;
      const temperature = options.temperature || 0.4;
      const maxTokens = options.maxTokens || 2000;
      
      // Execute each task in the workflow sequentially
      for (const taskConfig of workflow.tasks) {
        const taskId = taskConfig.taskId;
        const task = this.tasks.get(taskId);
        
        if (!task) {
          throw new Error(`Task ${taskId} not found in workflow ${workflow.name}`);
        }
        
        // Prepare task inputs by resolving variables from workflow context
        const taskInputs = {};
        Object.entries(taskConfig.inputs || {}).forEach(([key, value]) => {
          // Handle variable substitutions like {{topic}} or {{tasks.previousTask.output}}
          if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
            // Extract variable name from {{varName}}
            const varMatch = value.match(/\{\{([^}]+)\}\}/g);
            if (varMatch) {
              let processedValue = value;
              
              for (const match of varMatch) {
                const varPath = match.replace(/\{\{|\}\}/g, '').trim();
                
                // Handle task reference paths like 'tasks.taskName.output'
                if (varPath.startsWith('tasks.')) {
                  const pathParts = varPath.split('.');
                  if (pathParts.length >= 3) {
                    const refTaskName = pathParts[1];
                    const refProperty = pathParts.slice(2).join('.');
                    
                    // Find the referenced task result
                    const refTaskResult = taskResults.find(result => 
                      result.taskName.toLowerCase().replace(/\s+/g, '') === refTaskName.toLowerCase()
                    );
                    
                    if (refTaskResult) {
                      // Get the property value using path notation
                      let propValue = refTaskResult;
                      for (const prop of pathParts.slice(2)) {
                        propValue = propValue[prop];
                        if (propValue === undefined) break;
                      }
                      
                      if (propValue !== undefined) {
                        processedValue = processedValue.replace(match, propValue);
                      }
                    }
                  }
                } 
                // Handle direct workflow input references
                else if (workflowContext[varPath] !== undefined) {
                  processedValue = processedValue.replace(match, workflowContext[varPath]);
                }
              }
              
              taskInputs[key] = processedValue;
            }
          } else {
            taskInputs[key] = value;
          }
        });
        
        // Execute the task based on its type
        let taskResult;
        switch (task.type) {
          case 'agent':
            // Use OneAPI to execute the agent task
            taskResult = await this._executeAgentTask(task, taskInputs, { model, temperature, maxTokens });
            break;
            
          case 'function':
            // Execute custom function
            taskResult = await this._executeFunctionTask(task, taskInputs);
            break;
            
          default:
            taskResult = {
              taskId,
              taskName: task.name,
              output: `Executed ${task.name} with inputs: ${JSON.stringify(taskInputs)}`,
              status: 'completed'
            };
        }
        
        // Add task result to results collection
        taskResults.push(taskResult);
        
        // Update workflow context with task result
        workflowContext[`task_${taskId}`] = taskResult;
      }
      
      const executionTime = ((Date.now() - executionStartTime) / 1000).toFixed(1) + 's';
      
      return {
        workflowId,
        status: 'completed',
        results: {
          message: `Workflow ${workflow.name} executed successfully`,
          executionTime,
          taskResults
        }
      };
    } catch (error) {
      console.error(`Error executing workflow ${workflow.name}:`, error);
      return {
        workflowId,
        status: 'failed',
        error: error.message,
        results: {
          message: `Workflow ${workflow.name} execution failed: ${error.message}`,
          executionTime: ((Date.now() - executionStartTime) / 1000).toFixed(1) + 's',
          taskResults
        }
      };
    }
  }

  /**
   * Get all workflows
   * @returns {Array} Array of workflow objects
   */
  getWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Get all tasks
   * @returns {Array} Array of task objects
   */
  getTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get all crews
   * @returns {Array} Array of crew objects
   */
  getCrews() {
    return Array.from(this.crews.values());
  }

  /**
   * Save current state to localStorage
   */
  saveState() {
    try {
      const state = {
        workflows: Array.from(this.workflows.entries()),
        tasks: Array.from(this.tasks.entries()),
        crews: Array.from(this.crews.entries()),
        orchestratorInstances: Array.from(this.orchestratorInstances.entries())
      };
      
      localStorage.setItem('orchestratorWizardState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving orchestrator state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const stateJson = localStorage.getItem('orchestratorWizardState');
      if (stateJson) {
        const state = JSON.parse(stateJson);
        
        this.workflows = new Map(state.workflows || []);
        this.tasks = new Map(state.tasks || []);
        this.crews = new Map(state.crews || []);
        this.orchestratorInstances = new Map(state.orchestratorInstances || []);
      } else {
        // Register example workflows if empty
        this.registerExampleWorkflows();
      }
    } catch (error) {
      console.error('Error loading orchestrator state:', error);
      // Register example workflows on error
      this.registerExampleWorkflows();
    }
  }

  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return 'wf_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Register example workflows for demonstration
   */
  registerExampleWorkflows() {
    // Example task: Web research
    const researchTaskId = this.createTask(
      'Web Research',
      'Research information on a given topic from the web',
      'agent',
      {
        agentType: 'researcher',
        parameters: {
          topic: { type: 'string', required: true },
          depth: { type: 'select', options: ['basic', 'detailed'], default: 'basic' }
        }
      }
    );
    
    // Example task: Content summarization
    const summarizeTaskId = this.createTask(
      'Summarize Content',
      'Create a concise summary of provided content',
      'agent',
      {
        agentType: 'writer',
        parameters: {
          content: { type: 'text', required: true },
          style: { type: 'select', options: ['brief', 'detailed', 'bullet_points'], default: 'brief' }
        }
      }
    );
    
    // Example task: Content generation
    const generateTaskId = this.createTask(
      'Generate Content',
      'Create new content based on provided information',
      'agent',
      {
        agentType: 'writer',
        parameters: {
          topic: { type: 'string', required: true },
          length: { type: 'select', options: ['short', 'medium', 'long'], default: 'medium' },
          tone: { type: 'select', options: ['formal', 'casual', 'technical'], default: 'casual' }
        }
      }
    );
    
    // Example task: Data analysis
    const analysisTaskId = this.createTask(
      'Analyze Data',
      'Analyze provided data and extract insights',
      'agent',
      {
        agentType: 'analyst',
        parameters: {
          data: { type: 'text', required: true },
          analysisType: { type: 'select', options: ['trends', 'patterns', 'anomalies', 'full'], default: 'full' }
        }
      }
    );
    
    // Example workflow: Research and summarize
    const researchWorkflowId = this.createWorkflow(
      'Research and Summarize',
      'Research a topic and create a summary of findings',
      {
        inputParameters: {
          topic: { type: 'string', required: true },
          depth: { type: 'select', options: ['basic', 'detailed'], default: 'basic' },
          summaryStyle: { type: 'select', options: ['brief', 'detailed', 'bullet_points'], default: 'brief' }
        }
      }
    );
    
    // Add tasks to workflow
    this.addTaskToWorkflow(researchWorkflowId, researchTaskId, {
      inputs: {
        topic: '{{topic}}',
        depth: '{{depth}}'
      }
    });
    
    this.addTaskToWorkflow(researchWorkflowId, summarizeTaskId, {
      inputs: {
        content: '{{tasks.webResearch.output}}',
        style: '{{summaryStyle}}'
      }
    });
    
    // Example workflow: Content marketing
    const marketingWorkflowId = this.createWorkflow(
      'Content Marketing Generator',
      'Generate marketing content based on product information',
      {
        inputParameters: {
          productName: { type: 'string', required: true },
          productDescription: { type: 'text', required: true },
          audience: { type: 'select', options: ['general', 'technical', 'business'], default: 'general' },
          contentFormat: { type: 'select', options: ['blog', 'social', 'email'], default: 'blog' }
        }
      }
    );
    
    // Add tasks to workflow
    this.addTaskToWorkflow(marketingWorkflowId, analysisTaskId, {
      inputs: {
        data: '{{productDescription}}',
        analysisType: 'full'
      }
    });
    
    this.addTaskToWorkflow(marketingWorkflowId, generateTaskId, {
      inputs: {
        topic: '{{productName}} - {{tasks.analyzeData.output.keyInsights}}',
        length: 'medium',
        tone: '{{audience === "technical" ? "technical" : audience === "business" ? "formal" : "casual"}}'
      }
    });
    
    // Create example crew
    this.createCrew(
      'Content Team',
      'A team of agents specialized in content creation and research',
      [],
      {
        roles: ['researcher', 'writer', 'editor']
      }
    );
  }

  /**
   * Execute an agent task via OneAPI
   * @private
   */
  async _executeAgentTask(task, inputs, options) {
    const agentType = task.config.agentType;
    const { model, temperature, maxTokens } = options;
    
    console.log(`Executing ${agentType} agent task: ${task.name}`);
    
    try {
      // Map agent types to the appropriate OneAPI agent
      let result;
      switch (agentType.toLowerCase()) {
        case 'researcher':
        case 'research':
          result = await this.oneAPI.executeAgent('research', {
            query: inputs.topic || inputs.query || 'general information',
            depth: inputs.depth || 'basic',
            model,
            temperature
          });
          break;
          
        case 'writer':
        case 'content':
          result = await this.oneAPI.executeAgent('chat', {
            prompt: inputs.content || inputs.topic || 'Generate content',
            context: inputs.context || '',
            style: inputs.style || inputs.tone || 'neutral',
            model,
            temperature
          });
          break;
          
        case 'analyst':
        case 'analysis':
          result = await this.oneAPI.executeAgent('analysis', {
            data: inputs.data || inputs.content || '',
            metrics: inputs.metrics || inputs.analysisType || 'general',
            model,
            temperature
          });
          break;
          
        case 'automation':
          result = await this.oneAPI.executeAgent('automation', {
            task: inputs.task || 'automate process',
            steps: inputs.steps || [],
            parameters: inputs.parameters || {},
            model,
            temperature
          });
          break;
          
        default:
          // Default to chat agent for unknown types
          result = await this.oneAPI.executeAgent('chat', {
            prompt: `Execute task: ${task.name} with inputs: ${JSON.stringify(inputs)}`,
            model,
            temperature
          });
      }
      
      return {
        taskId: task.id,
        taskName: task.name,
        agentType,
        inputs,
        output: result.response || result,
        status: 'completed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error executing agent task ${task.name}:`, error);
      return {
        taskId: task.id,
        taskName: task.name,
        agentType,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Execute a function task
   * @private
   */
  async _executeFunctionTask(task, inputs) {
    console.log(`Executing function task: ${task.name}`);
    
    try {
      // In a real implementation, this would execute the function
      // defined in the task configuration
      return {
        taskId: task.id,
        taskName: task.name,
        inputs,
        output: `Function ${task.name} executed with ${JSON.stringify(inputs)}`,
        status: 'completed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        taskId: task.id,
        taskName: task.name,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Register default workflow templates
   */
  registerDefaultTemplates() {
    // Sequential workflow template
    this.templates.set('sequential', {
      name: 'Sequential Workflow',
      description: 'Execute tasks in sequence, with each task depending on the previous one',
      icon: 'bi-arrow-right',
      color: 'primary',
      defaultModel: this.defaultModel,
      taskTypes: ['agent', 'function', 'llm']
    });
    
    // Parallel workflow template
    this.templates.set('parallel', {
      name: 'Parallel Workflow',
      description: 'Execute multiple independent tasks simultaneously',
      icon: 'bi-arrows',
      color: 'success',
      defaultModel: this.defaultModel,
      taskTypes: ['agent', 'function', 'llm']
    });
    
    // Decision tree workflow template
    this.templates.set('decision', {
      name: 'Decision Tree',
      description: 'Execute different tasks based on conditional logic',
      icon: 'bi-diagram-3',
      color: 'warning',
      defaultModel: this.defaultModel,
      taskTypes: ['agent', 'function', 'llm', 'condition']
    });
    
    console.log('Default workflow templates registered');
  }
}

// Make the class available globally
window.OrchestratorWizard = OrchestratorWizard;
