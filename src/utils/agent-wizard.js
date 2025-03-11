/**
 * Agent Wizard - Interactive Agent Builder & Orchestrator
 * Guides users through creating and connecting AI agents
 */

class AgentWizard {
  constructor(options = {}) {
    this.agents = new Map();
    this.connections = new Map();
    this.workflows = new Map();
    this.options = {
      debug: true,
      validateAgents: true,
      ...options
    };
  }

  /**
   * Start building a new agent step by step
   */
  startBuildingAgent() {
    return new AgentBuilder(this);
  }

  /**
   * Get agent building steps for UI guidance
   */
  getAgentBuildingSteps() {
    return [
      {
        id: 'basics',
        title: 'Basic Configuration',
        fields: [
          { name: 'name', type: 'string', required: true, label: 'Agent Name' },
          { name: 'description', type: 'text', required: true, label: 'Description' },
          { name: 'type', type: 'select', required: true, label: 'Agent Type', 
            options: ['researcher', 'analyst', 'assistant', 'executor'] }
        ]
      },
      {
        id: 'capabilities',
        title: 'Capabilities',
        fields: [
          { name: 'tools', type: 'multiselect', label: 'Available Tools',
            options: ['web_search', 'file_access', 'data_analysis', 'code_execution'] },
          { name: 'memory', type: 'select', label: 'Memory Type',
            options: ['none', 'short_term', 'long_term'] },
          { name: 'model', type: 'select', label: 'Language Model',
            options: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'] }
        ]
      },
      {
        id: 'behavior',
        title: 'Behavior Configuration',
        fields: [
          { name: 'personality', type: 'select', label: 'Personality Type',
            options: ['professional', 'friendly', 'direct'] },
          { name: 'autonomy', type: 'range', label: 'Autonomy Level',
            min: 1, max: 5, default: 3 },
          { name: 'responseStyle', type: 'multiselect', label: 'Response Style',
            options: ['concise', 'detailed', 'analytical', 'conversational'] }
        ]
      },
      {
        id: 'integration',
        title: 'Integration Setup',
        fields: [
          { name: 'inputs', type: 'array', label: 'Input Types',
            template: { name: '', type: '', description: '' } },
          { name: 'outputs', type: 'array', label: 'Output Formats',
            template: { format: '', schema: '', sample: '' } },
          { name: 'triggers', type: 'array', label: 'Trigger Events',
            template: { event: '', condition: '', action: '' } }
        ]
      },
      {
        id: 'testing',
        title: 'Testing & Validation',
        fields: [
          { name: 'testCases', type: 'array', label: 'Test Cases',
            template: { input: '', expectedOutput: '', description: '' } },
          { name: 'successCriteria', type: 'text', label: 'Success Criteria' },
          { name: 'fallbackBehavior', type: 'text', label: 'Fallback Behavior' }
        ]
      }
    ];
  }

  /**
   * Get workflow building steps
   */
  getWorkflowBuildingSteps() {
    return [
      {
        id: 'workflow-basics',
        title: 'Workflow Configuration',
        fields: [
          { name: 'name', type: 'string', required: true, label: 'Workflow Name' },
          { name: 'description', type: 'text', required: true, label: 'Description' },
          { name: 'trigger', type: 'select', required: true, label: 'Trigger Type',
            options: ['manual', 'scheduled', 'event'] }
        ]
      },
      {
        id: 'agent-selection',
        title: 'Select Agents',
        fields: [
          { name: 'agents', type: 'multiselect', required: true, label: 'Participating Agents',
            options: () => Array.from(this.agents.keys()) }
        ]
      },
      {
        id: 'flow-definition',
        title: 'Define Flow',
        fields: [
          { name: 'connections', type: 'flowchart', required: true, label: 'Agent Connections' },
          { name: 'dataMapping', type: 'mapping', label: 'Data Mapping' }
        ]
      },
      {
        id: 'error-handling',
        title: 'Error Handling',
        fields: [
          { name: 'retryStrategy', type: 'select', label: 'Retry Strategy',
            options: ['none', 'simple', 'exponential'] },
          { name: 'fallbackFlow', type: 'flowchart', label: 'Fallback Flow' }
        ]
      }
    ];
  }

  /**
   * Register a completed agent
   */
  registerAgent(agent) {
    if (this.options.validateAgents) {
      this.validateAgent(agent);
    }
    this.agents.set(agent.name, agent);
    return this;
  }

  /**
   * Connect two agents in a workflow
   */
  connectAgents(sourceAgent, targetAgent, connectionConfig) {
    const connectionId = `${sourceAgent.name}->${targetAgent.name}`;
    this.connections.set(connectionId, {
      source: sourceAgent.name,
      target: targetAgent.name,
      config: connectionConfig
    });
    return this;
  }

  /**
   * Create a workflow from connected agents
   */
  createWorkflow(name, description, agentConnections) {
    const workflow = {
      name,
      description,
      connections: agentConnections,
      status: 'ready'
    };
    this.workflows.set(name, workflow);
    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowName, input) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found`);
    }

    const results = {
      workflowName,
      startTime: Date.now(),
      steps: []
    };

    try {
      for (const connection of workflow.connections) {
        const sourceAgent = this.agents.get(connection.source);
        const targetAgent = this.agents.get(connection.target);
        
        const stepResult = await this.executeWorkflowStep(
          sourceAgent, 
          targetAgent, 
          connection.config, 
          input
        );
        
        results.steps.push(stepResult);
        input = stepResult.output; // Use output as input for next step
      }

      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;
      results.status = 'completed';
      
      return results;
    } catch (error) {
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;
      results.status = 'failed';
      results.error = error.message;
      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeWorkflowStep(sourceAgent, targetAgent, config, input) {
    const stepStart = Date.now();
    
    try {
      // Execute source agent
      const sourceOutput = await sourceAgent.execute(input);
      
      // Transform data according to connection config
      const transformedData = this.transformData(sourceOutput, config.transformation);
      
      // Execute target agent
      const targetOutput = await targetAgent.execute(transformedData);
      
      return {
        sourceAgent: sourceAgent.name,
        targetAgent: targetAgent.name,
        input,
        output: targetOutput,
        duration: Date.now() - stepStart,
        status: 'completed'
      };
    } catch (error) {
      return {
        sourceAgent: sourceAgent.name,
        targetAgent: targetAgent.name,
        input,
        error: error.message,
        duration: Date.now() - stepStart,
        status: 'failed'
      };
    }
  }

  /**
   * Transform data between agents
   */
  transformData(data, transformation) {
    if (!transformation) return data;
    
    // Apply transformation rules
    const result = transformation.rules.reduce((acc, rule) => {
      if (rule.condition(acc)) {
        return rule.transform(acc);
      }
      return acc;
    }, data);

    return result;
  }

  /**
   * Validate agent configuration
   */
  validateAgent(agent) {
    const requiredFields = ['name', 'description', 'type', 'capabilities'];
    for (const field of requiredFields) {
      if (!agent[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!agent.execute || typeof agent.execute !== 'function') {
      throw new Error('Agent must have an execute function');
    }

    return true;
  }
}

/**
 * Agent Builder - Fluent interface for building agents
 */
class AgentBuilder {
  constructor(wizard) {
    this.wizard = wizard;
    this.agent = {
      capabilities: [],
      config: {}
    };
  }

  name(name) {
    this.agent.name = name;
    return this;
  }

  description(desc) {
    this.agent.description = desc;
    return this;
  }

  type(type) {
    this.agent.type = type;
    return this;
  }

  addCapability(capability) {
    this.agent.capabilities.push(capability);
    return this;
  }

  setConfig(key, value) {
    this.agent.config[key] = value;
    return this;
  }

  implement(executeFunction) {
    this.agent.execute = executeFunction;
    return this;
  }

  register() {
    return this.wizard.registerAgent(this.agent);
  }
}

window.AgentWizard = AgentWizard;
window.AgentBuilder = AgentBuilder;
