/**
 * LangChain implementation of agent orchestration
 * 
 * Provides utilities for creating, managing and orchestrating agents and tasks
 * using LangChain's architecture instead of CrewAI.
 * 
 * This implementation is fully integrated with OneAPI for unified access to all
 * provider capabilities while leveraging LangChain's powerful agent framework.
 */

// Import LangChain essentials
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentExecutor } from 'langchain/agents';
import { PromptTemplate } from '@langchain/core/prompts';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

// Import OneAPI
import oneapiModule from '../oneapi.js';

// Import interfaces
import {
  Agent,
  Task,
  TaskResult,
  CrewConfig,
  ProcessMode,
  TaskExecutionConfig,
  TaskStatus,
  Workflow,
  TaskCallbacks,
  CrewRunStatus
} from '../interfaces/index.js';
import { ExtendedAgentConfig, AgentTool } from '../interfaces/crew-ai.js';
import { VectorDocument, VectorSearchOptions, VectorSearchResult } from '../interfaces/vector-db.js';

// Import utilities
import { Logger } from './logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import { VectorDB as UtilVectorDB, createVectorDB, ExtendedVectorDBConfig, VectorDBType } from './vector-db.js';

/**
 * LangChain utility class for orchestrating multiple AI agents
 * Replaces CrewAI with LangChain-based implementation
 * Integrated with OneAPI for unified model access across providers
 */
export class LangChain {
  private logger: Logger;
  // Using any type to work around type conflicts between different VectorDB implementations
  private vectorDbs: Map<string, any> = new Map();
  private tools: Map<string, any> = new Map(); // Using any to avoid type conflicts
  private chatModels: Map<string, ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI> = new Map();
  private oneAPI: any;
  
  /**
   * Create a new LangChain instance
   */
  constructor() {
    this.logger = new Logger('info');
    try {
      this.oneAPI = oneapiModule.getOneAPI();
      this.logger.info('LangChain initialized with OneAPI integration');
    } catch (error) {
      this.logger.warn('Failed to initialize OneAPI, falling back to direct provider access', error);
      this.oneAPI = null;
    }
  }

  /**
   * Create a LangChain chat model based on provider and model ID
   * Uses OneAPI for unified model access when available
   * 
   * @param modelId - The model identifier (e.g., 'openai/gpt-4o')
   * @param config - Configuration for the model
   * @returns The LangChain chat model
   */
  private createChatModel(
    modelId: string,
    config: {
      temperature?: number;
      maxTokens?: number;
      apiKey?: string;
    }
  ): ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI {
    if (this.chatModels.has(modelId)) {
      return this.chatModels.get(modelId)!;
    }

    let model;
    
    // Try to use OneAPI if available
    if (this.oneAPI) {
      try {
        this.logger.debug(`Creating LangChain model via OneAPI: ${modelId}`);
        
        // Determine the proper LangChain model class based on provider prefix
        if (modelId.startsWith('openai/')) {
          // OpenAI-compatible models via OneAPI
          model = new ChatOpenAI({
            modelName: modelId, // Use the full ID - OneAPI will handle the parsing
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens,
            // LangChain OpenAI client config
            openAIApiKey: this.oneAPI.getApiKey() || config.apiKey,
            basePath: this.oneAPI.getBaseUrl()
          });
          
          // Add custom headers for OneAPI integration if needed
          if (this.oneAPI.getHeaders) {
            const headers = this.oneAPI.getHeaders();
            if (headers) {
              // Set headers through the client if available
              (model as any).client.apiManager.headers = {
                ...(model as any).client.apiManager.headers,
                ...headers
              };
            }
          }
        } else if (modelId.startsWith('anthropic/')) {
          // Anthropic models via OneAPI
          model = new ChatAnthropic({
            modelName: modelId,
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens,
            anthropicApiKey: this.oneAPI.getApiKey() || config.apiKey,
            // Use baseUrl if the ChatAnthropic supports it
            ...(this.oneAPI.getBaseUrl() ? { baseUrl: this.oneAPI.getBaseUrl() } : {})
          });
        } else if (modelId.startsWith('google/')) {
          model = new ChatGoogleGenerativeAI({
            modelName: modelId,
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens,
            apiKey: this.oneAPI.getApiKey() || config.apiKey
          });
        } else {
          // For any other provider, default to OpenAI-compatible interface through OneAPI
          model = new ChatOpenAI({
            modelName: modelId,
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens,
            openAIApiKey: this.oneAPI.getApiKey() || config.apiKey,
            basePath: this.oneAPI.getBaseUrl()
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to create model via OneAPI, falling back to direct provider: ${error}`);
        // Fall back to direct provider initialization below
      }
    }
    
    // If OneAPI failed or isn't available, use direct provider access
    if (!model) {
      if (modelId.startsWith('openai/')) {
        // OpenAI models
        const openaiModel = modelId.replace('openai/', '');
        model = new ChatOpenAI({
          modelName: openaiModel,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens,
          apiKey: config.apiKey
        });
      } else if (modelId.startsWith('anthropic/')) {
        // Anthropic/Claude models
        const anthropicModel = modelId.replace('anthropic/', '');
        model = new ChatAnthropic({
          modelName: anthropicModel,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens,
          apiKey: config.apiKey
        });
      } else if (modelId.startsWith('google/')) {
        // Google models
        const googleModel = modelId.replace('google/', '');
        model = new ChatGoogleGenerativeAI({
          modelName: googleModel,
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens,
          apiKey: config.apiKey
        });
      } else {
        throw new OpenRouterError(`Unsupported model provider: ${modelId}`, 400, null);
      }
    }
    
    // Cache the model for reuse
    this.chatModels.set(modelId, model);
    
    return model;
  }

  /**
   * Create a new agent with specified capabilities
   * 
   * @param agentConfig - The agent configuration
   * @returns The created agent
   * 
   * @example
   * ```typescript
   * const researchAgent = langChain.createAgent({
   *   id: 'researcher',
   *   name: 'Research Specialist',
   *   description: 'Expert at finding and analyzing information',
   *   model: 'anthropic/claude-3-opus-20240229',
   *   systemMessage: 'You are a research specialist who excels at finding accurate information.',
   *   temperature: 0.2
   * });
   * ```
   */
  createAgent(agentConfig: ExtendedAgentConfig): ExtendedAgentConfig {
    // Validate required fields
    if (!agentConfig.id) {
      throw new OpenRouterError('Agent ID is required', 400, null);
    }
    if (!agentConfig.name) {
      throw new OpenRouterError('Agent name is required', 400, null);
    }
    if (!agentConfig.model) {
      throw new OpenRouterError('Agent model is required', 400, null);
    }
    
    try {
      // Track agent creation timestamp
      const creationTime = new Date();
      agentConfig.createdAt = agentConfig.createdAt || creationTime;
      
      // Register agent with OneAPI if available
      if (this.oneAPI && this.oneAPI.registerAgent) {
        this.oneAPI.registerAgent({
          agentId: agentConfig.id,
          agentName: agentConfig.name,
          model: agentConfig.model,
          description: agentConfig.description || '',
          capabilities: agentConfig.capabilities || [],
          createdAt: creationTime
        });
      }
      
      // Record agent creation metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordAgentEvent) {
          metrics.recordAgentEvent({
            agentId: agentConfig.id,
            agentName: agentConfig.name,
            eventType: 'agent_create',
            model: agentConfig.model,
            temperature: agentConfig.temperature,
            maxTokens: agentConfig.maxTokens,
            timestamp: creationTime
          });
        }
      }
      
      // Initialize vector database if configured
      if (agentConfig.memory?.vectorDb) {
        this.initializeVectorDb(agentConfig.id, agentConfig.memory.vectorDb);
      }
      
      this.logger.debug(`Created agent: ${agentConfig.name} (${agentConfig.id}) using model ${agentConfig.model}`);
      return agentConfig;
    } catch (error) {
      this.logger.error(`Failed to create agent: ${agentConfig.name} (${agentConfig.id})`, error);
      
      // Record agent creation failure
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordAgentEvent) {
          metrics.recordAgentEvent({
            agentId: agentConfig.id,
            agentName: agentConfig.name,
            eventType: 'agent_create_error',
            errorMessage: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
        }
      }
      
      throw new OpenRouterError(
        `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Create a new task to be executed by an agent
   * 
   * @param taskConfig - The task configuration
   * @returns The created task
   * 
   * @example
   * ```typescript
   * const researchTask = langChain.createTask({
   *   id: 'market-research',
   *   name: 'Market Research',
   *   description: 'Research the current market trends for electric vehicles',
   *   assignedAgentId: 'researcher',
   *   expectedOutput: 'A comprehensive report on EV market trends with key statistics'
   * });
   * ```
   */
  createTask(taskConfig: Task): Task {
    // Validate required fields
    if (!taskConfig.id) {
      throw new OpenRouterError('Task ID is required', 400, null);
    }
    if (!taskConfig.name) {
      throw new OpenRouterError('Task name is required', 400, null);
    }
    if (!taskConfig.description) {
      throw new OpenRouterError('Task description is required', 400, null);
    }
    if (!taskConfig.assignedAgentId) {
      throw new OpenRouterError('Task must be assigned to an agent', 400, null);
    }
    
    this.logger.debug(`Created task: ${taskConfig.name} (${taskConfig.id})`);
    return taskConfig;
  }

  /**
   * Create a new workflow connecting multiple tasks
   * 
   * @param workflowConfig - The workflow configuration
   * @returns The created workflow
   * 
   * @example
   * ```typescript
   * const researchWorkflow = langChain.createWorkflow({
   *   id: 'research-workflow',
   *   name: 'Research and Summarize',
   *   tasks: [researchTask, summaryTask],
   *   dependencies: {
   *     'summary-task': ['research-task']
   *   },
   *   processMode: ProcessMode.HIERARCHICAL
   * });
   * ```
   */
  createWorkflow(workflowConfig: Workflow): Workflow {
    // Validate required fields
    if (!workflowConfig.id) {
      throw new OpenRouterError('Workflow ID is required', 400, null);
    }
    if (!workflowConfig.name) {
      throw new OpenRouterError('Workflow name is required', 400, null);
    }
    if (!workflowConfig.tasks || workflowConfig.tasks.length === 0) {
      throw new OpenRouterError('Workflow must include at least one task', 400, null);
    }
    
    // Validate task dependencies
    if (workflowConfig.dependencies) {
      for (const [taskId, dependsOn] of Object.entries(workflowConfig.dependencies)) {
        // Check if the task exists
        if (!workflowConfig.tasks.some(task => task.id === taskId)) {
          throw new OpenRouterError(`Invalid task dependency: Task ${taskId} not found in workflow`, 400, null);
        }
        
        // Check if dependency tasks exist
        for (const depTaskId of dependsOn) {
          if (!workflowConfig.tasks.some(task => task.id === depTaskId)) {
            throw new OpenRouterError(`Invalid task dependency: Dependent task ${depTaskId} not found in workflow`, 400, null);
          }
        }
      }
    }
    
    this.logger.debug(`Created workflow: ${workflowConfig.name} (${workflowConfig.id}) with ${workflowConfig.tasks.length} tasks`);
    return workflowConfig;
  }

  /**
   * Create a new crew of agents
   * 
   * @param crewConfig - The crew configuration
   * @returns The crew configuration
   * 
   * @example
   * ```typescript
   * const researchCrew = langChain.createCrew({
   *   id: 'research-team',
   *   name: 'Research Team',
   *   description: 'A team that researches and summarizes information',
   *   agents: [researchAgent, writerAgent],
   *   processMode: ProcessMode.SEQUENTIAL,
   *   verbose: true
   * });
   * ```
   */
  createCrew(crewConfig: CrewConfig): CrewConfig {
    // Validate required fields
    if (!crewConfig.id) {
      throw new OpenRouterError('Crew ID is required', 400, null);
    }
    if (!crewConfig.name) {
      throw new OpenRouterError('Crew name is required', 400, null);
    }
    if (!crewConfig.agents || crewConfig.agents.length === 0) {
      throw new OpenRouterError('Crew must include at least one agent', 400, null);
    }
    
    // Check for duplicate agent IDs
    const agentIds = new Set<string>();
    for (const agent of crewConfig.agents) {
      if (agentIds.has(agent.id)) {
        throw new OpenRouterError(`Duplicate agent ID: ${agent.id}`, 400, null);
      }
      agentIds.add(agent.id);
    }
    
    this.logger.debug(`Created crew: ${crewConfig.name} (${crewConfig.id}) with ${crewConfig.agents.length} agents`);
    return crewConfig;
  }

  /**
   * Execute a single task with a specific agent using LangChain
   * Uses OneAPI for model access and metric tracking
   * 
   * @param task - The task to execute
   * @param agent - The agent to execute the task
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns A promise resolving to the task result
   * 
   * @example
   * ```typescript
   * const result = await langChain.executeTask(
   *   researchTask,
   *   researchAgent,
   *   { maxIterations: 3 },
   *   { 
   *     onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) 
   *   }
   * );
   * ```
   */
  async executeTask(
    task: Task,
    agent: Agent | ExtendedAgentConfig,
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<TaskResult> {
    const startTime = new Date();
    
    if (callbacks?.onTaskStart) {
      callbacks.onTaskStart(task.id, agent.id);
    }
    
    try {
      this.logger.info(`Executing task: ${task.name} (${task.id}) with agent: ${agent.name} (${agent.id})`);
      
      // Create LangChain chat model - use OneAPI integration
      const llm = this.createChatModel(agent.model, {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        apiKey: this.oneAPI?.getApiKey() || process.env.OPENROUTER_API_KEY
      });
      
      // Create system message combining agent's system message and task description
      const systemMessage = new SystemMessage(`${agent.systemMessage || ''}\n\nTask: ${task.description}`);
      
      // Set up prompt template for the agent
      const prompt = PromptTemplate.fromTemplate(`{input}`);
      
      let output = '';
      
      // For now, simple direct call to the model
      const messages = [systemMessage];
      
      // Add context if provided
      if (task.context) {
        messages.push(new HumanMessage(task.context));
      }
      
      // Add the task itself as a human message
      messages.push(new HumanMessage(task.description));
      
      // Performance tracking
      const executionStart = Date.now();
      
      // If we have OneAPI, log request metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordRequest) {
          metrics.recordRequest({
            model: agent.model,
            provider: agent.model.split('/')[0],
            agentId: agent.id,
            taskId: task.id,
            inputTokens: 0, // Will be calculated by OneAPI
            timestamp: new Date(),
            requestType: 'langchain_execute_task',
            messageCount: messages.length,
            settings: {
              temperature: agent.temperature,
              maxTokens: agent.maxTokens
            }
          });
        }
      }
      
      // Run the model
      const response = await llm.invoke(messages);
      output = response.content as string;
      
      // Record execution metrics
      const executionTime = Date.now() - executionStart;
      
      // Report metrics if OneAPI is available
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.updateTaskMetrics) {
          metrics.updateTaskMetrics({
            taskId: task.id,
            agentId: agent.id,
            responseTime: executionTime,
            outputLength: output.length,
            status: 'completed'
          });
        }
      }
      
      // Create task result
      const result: TaskResult = {
        taskId: task.id,
        agentId: agent.id,
        status: TaskStatus.COMPLETED,
        output,
        completedAt: new Date(),
        executionTime
      };
      
      if (callbacks?.onTaskComplete) {
        callbacks.onTaskComplete(result);
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime.getTime();
      
      // Report error metrics if OneAPI is available
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.updateTaskMetrics) {
          metrics.updateTaskMetrics({
            taskId: task.id,
            agentId: agent.id,
            responseTime: executionTime,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      const errorResult: TaskResult = {
        taskId: task.id,
        agentId: agent.id,
        status: TaskStatus.FAILED,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
        executionTime
      };
      
      if (callbacks?.onTaskError) {
        callbacks.onTaskError(task.id, error);
      }
      
      this.logger.error(`Task execution failed: ${task.id}`, error);
      return errorResult;
    }
  }

  /**
   * Execute a workflow of tasks
   * 
   * @param workflow - The workflow to execute
   * @param agents - The agents to use for execution (mapped by ID)
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns A promise resolving to the workflow results
   * 
   * @example
   * ```typescript
   * const results = await langChain.executeWorkflow(
   *   researchWorkflow,
   *   { 'researcher': researchAgent, 'writer': writerAgent },
   *   { processMode: ProcessMode.SEQUENTIAL },
   *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
   * );
   * ```
   */
  /**
   * Execute a workflow with the specified agents
   * Enhanced with comprehensive OneAPI integration for metrics tracking and improved error handling
   * 
   * @param workflow - The workflow to execute
   * @param agents - The agents to use for execution (mapped by ID)
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns A promise resolving to the workflow results
   * 
   * @example
   * ```typescript
   * const results = await langChain.executeWorkflow(
   *   researchWorkflow,
   *   { 'researcher': researchAgent, 'writer': writerAgent },
   *   { processMode: ProcessMode.SEQUENTIAL },
   *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
   * );
   * ```
   */
  async executeWorkflow(
    workflow: Workflow,
    agents: Record<string, Agent | ExtendedAgentConfig>,
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<Record<string, TaskResult>> {
    this.logger.info(`Executing workflow: ${workflow.name} (${workflow.id}) with ${workflow.tasks.length} tasks`);
    
    // Generate a unique tracking ID for this workflow execution
    const workflowTrackingId = `workflow_${workflow.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Track overall workflow execution performance
    const workflowStartTime = Date.now();
    
    // Create enhanced metadata for OneAPI tracking
    const workflowMetadata = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      taskCount: workflow.tasks.length,
      processMode: config?.processMode || workflow.processMode || ProcessMode.SEQUENTIAL,
      agentCount: Object.keys(agents).length,
      // Use optional chaining to safely access properties that might not exist on the types
      priority: (config as any)?.priority || (workflow as any)?.priority || 'normal',
      tags: (workflow as any)?.tags || []
    };
    
    // Error tracking for comprehensive reporting
    const errors: Array<{ taskId: string; error: Error | string; stage: string }> = [];
    let criticalError: Error | null = null;
    
    // Report workflow start to OneAPI metrics if available
    if (this.oneAPI) {
      try {
        if (this.oneAPI.trackWorkflow) {
          // Use newer API if available
          this.oneAPI.trackWorkflow({
            workflowId: workflow.id,
            trackingId: workflowTrackingId,
            eventType: 'start',
            metadata: workflowMetadata
          });
        } else if (this.oneAPI.getMetrics) {
          // Fall back to older metrics API
          const metrics = this.oneAPI.getMetrics();
          if (metrics && metrics.recordWorkflowEvent) {
            metrics.recordWorkflowEvent({
              workflowId: workflow.id,
              workflowName: workflow.name,
              eventType: 'workflow_start',
              taskCount: workflow.tasks.length,
              processMode: config?.processMode || workflow.processMode || ProcessMode.SEQUENTIAL,
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        // Log but continue if metrics tracking fails
        this.logger.warn('Failed to record workflow start metrics:', error);
      }
    }
    
    const results: Record<string, TaskResult> = {};
    const processMode = config?.processMode || workflow.processMode || ProcessMode.SEQUENTIAL;
    
    try {
      if (processMode === ProcessMode.SEQUENTIAL) {
        // Execute tasks sequentially
        let taskIndex = 0;
        for (const task of workflow.tasks) {
          // Track progress
          if (this.oneAPI && this.oneAPI.trackWorkflow) {
            try {
              this.oneAPI.trackWorkflow({
                trackingId: workflowTrackingId,
                eventType: 'progress',
                metadata: {
                  ...workflowMetadata,
                  currentTaskIndex: taskIndex,
                  currentTaskId: task.id,
                  progress: `${taskIndex}/${workflow.tasks.length}`,
                  percentComplete: Math.round((taskIndex / workflow.tasks.length) * 100)
                }
              });
            } catch (error) {
              this.logger.warn('Failed to track workflow progress:', error);
            }
          }
          
          try {
            const agent = agents[task.assignedAgentId];
            if (!agent) {
              throw new OpenRouterError(
                `Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 
                400, 
                null
              );
            }
            
            // Execute with enhanced tracking
            const taskConfig = {
              ...config,
              // Use a type assertion to add metadata property safely
              metadata: {
                ...(config as any)?.metadata,
                workflowId: workflow.id,
                workflowTrackingId,
                taskIndex,
                totalTasks: workflow.tasks.length
              }
            } as TaskExecutionConfig;
            
            results[task.id] = await this.executeTask(task, agent, taskConfig, callbacks);
            taskIndex++;
          } catch (error) {
            // Track task error but continue with next task
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error executing task ${task.id} in workflow ${workflow.id}:`, error);
            
            errors.push({
              taskId: task.id,
              error: error instanceof Error ? error : errorMessage,
              stage: 'task_execution'
            });
            
            // Record failed result
            results[task.id] = {
              taskId: task.id,
              agentId: task.assignedAgentId,
              status: TaskStatus.FAILED,
              error: errorMessage,
              output: "",
              completedAt: new Date(),
              executionTime: 0 // No execution time since it failed immediately
            };
            
            // Check if workflow should abort on failure
            if ((config as any)?.abortOnFailure) {
              this.logger.warn(`Aborting workflow ${workflow.id} due to task failure and abortOnFailure=true`);
              break;
            }
            
            taskIndex++;
          }
        }
      } else if (processMode === ProcessMode.PARALLEL) {
        // Execute tasks in parallel with improved error handling
        const taskPromises = workflow.tasks.map(async (task, taskIndex) => {
          try {
            const agent = agents[task.assignedAgentId];
            if (!agent) {
              throw new OpenRouterError(
                `Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 
                400, 
                null
              );
            }
            
            // Execute with enhanced tracking
            const taskConfig = {
              ...config,
              // Use a type assertion to add metadata property safely
              metadata: {
                ...(config as any)?.metadata,
                workflowId: workflow.id,
                workflowTrackingId,
                taskIndex,
                totalTasks: workflow.tasks.length,
                executionMode: 'parallel'
              }
            } as TaskExecutionConfig;
            
            return {
              taskId: task.id,
              result: await this.executeTask(task, agent, taskConfig, callbacks)
            };
          } catch (error) {
            // Track error but return structured error result
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error executing task ${task.id} in workflow ${workflow.id}:`, error);
            
            errors.push({
              taskId: task.id,
              error: error instanceof Error ? error : errorMessage,
              stage: 'parallel_execution'
            });
            
            return {
              taskId: task.id,
              result: {
                taskId: task.id,
                agentId: task.assignedAgentId,
                status: TaskStatus.FAILED,
                error: errorMessage,
                output: "",
                completedAt: new Date(),
                executionTime: 0 // No execution time since it failed immediately
              }
            };
          }
        });
        
        // Use Promise.allSettled to handle both fulfilled and rejected promises
        const taskResults = await Promise.allSettled(taskPromises);
        
        // Process all results
        taskResults.forEach((promiseResult, index) => {
          const taskId = workflow.tasks[index].id;
          
          if (promiseResult.status === 'fulfilled') {
            results[taskId] = promiseResult.value.result;
          } else {
            // Handle rejected promises
            const errorMessage = promiseResult.reason instanceof Error ? 
              promiseResult.reason.message : String(promiseResult.reason);
            
            this.logger.error(`Promise rejected for task ${taskId}:`, promiseResult.reason);
            
            errors.push({
              taskId,
              error: promiseResult.reason instanceof Error ? promiseResult.reason : errorMessage,
              stage: 'promise_rejection'
            });
            
            results[taskId] = {
              taskId,
              agentId: workflow.tasks.find(t => t.id === taskId)?.assignedAgentId || '',
              status: TaskStatus.FAILED,
              error: errorMessage,
              output: "",
              completedAt: new Date(),
              executionTime: 0 // No execution time since it failed immediately
            };
          }
        });
      } else if (processMode === ProcessMode.HIERARCHICAL) {
        // Execute tasks based on their dependencies with improved error handling
        if (!workflow.dependencies) {
          throw new OpenRouterError('Hierarchical execution requires task dependencies', 400, null);
        }
        
        // Build dependency graph
        const dependencyGraph: Record<string, string[]> = {};
        workflow.tasks.forEach(task => {
          dependencyGraph[task.id] = workflow.dependencies?.[task.id] || [];
        });
        
        // Track completed and failed tasks
        const completed = new Set<string>();
        const failedTasks = new Set<string>();
        let iterationCount = 0;
        const maxIterations = workflow.tasks.length * 2; // Safety limit
        
        // Execute tasks in dependency order
        while (completed.size < workflow.tasks.length && iterationCount < maxIterations) {
          iterationCount++;
          
          // Track progress for hierarchical execution
          if (this.oneAPI && this.oneAPI.trackWorkflow) {
            try {
              this.oneAPI.trackWorkflow({
                trackingId: workflowTrackingId,
                eventType: 'progress',
                metadata: {
                  ...workflowMetadata,
                  completedTasks: completed.size,
                  failedTasks: failedTasks.size,
                  remainingTasks: workflow.tasks.length - completed.size,
                  iterationCount,
                  progress: `${completed.size}/${workflow.tasks.length}`,
                  percentComplete: Math.round((completed.size / workflow.tasks.length) * 100)
                }
              });
            } catch (error) {
              this.logger.warn('Failed to track hierarchical workflow progress:', error);
            }
          }
          
          // Find tasks whose dependencies are satisfied
          const readyTasks = workflow.tasks.filter(task => 
            !completed.has(task.id) && 
            !failedTasks.has(task.id) &&
            dependencyGraph[task.id]?.every(dep => 
              completed.has(dep) || failedTasks.has(dep)
            ) === true
          );
          
          if (readyTasks.length === 0) {
            // Check if we're stuck in a loop
            if (completed.size + failedTasks.size < workflow.tasks.length) {
              const errorMsg = 'Circular dependency or unresolvable dependencies detected in workflow';
              this.logger.error(errorMsg);
              
              throw new OpenRouterError(errorMsg, 400, null);
            }
            break;
          }
          
          // Execute ready tasks in parallel with improved error handling
          const batchPromises = readyTasks.map(async (task) => {
            try {
              const agent = agents[task.assignedAgentId];
              if (!agent) {
                throw new OpenRouterError(
                  `Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 
                  400, 
                  null
                );
              }
              
              // Execute with enhanced tracking
              const taskConfig = {
                ...config,
                // Use a type assertion to add metadata property safely
                metadata: {
                  ...(config as any)?.metadata,
                  workflowId: workflow.id,
                  workflowTrackingId,
                  dependsOn: dependencyGraph[task.id] || [],
                  executionMode: 'hierarchical',
                  batchIteration: iterationCount
                }
              } as TaskExecutionConfig;
              
              const result = await this.executeTask(task, agent, taskConfig, callbacks);
              return { taskId: task.id, result, success: true };
            } catch (error) {
              // Track task error
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.error(`Error executing task ${task.id} in workflow ${workflow.id}:`, error);
              
              errors.push({
                taskId: task.id,
                error: error instanceof Error ? error : errorMessage,
                stage: 'hierarchical_execution'
              });
              
              return { 
                taskId: task.id, 
                result: {
                  taskId: task.id,
                  agentId: task.assignedAgentId,
                  status: TaskStatus.FAILED,
                  error: errorMessage,
                  output: "",
                  completedAt: new Date(),
                  executionTime: 0 // No execution time since it failed immediately
                }, 
                success: false 
              };
            }
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          
          // Process batch results
          batchResults.forEach((promiseResult) => {
            if (promiseResult.status === 'fulfilled') {
              const { taskId, result, success } = promiseResult.value;
              results[taskId] = result;
              
              if (success) {
                completed.add(taskId);
              } else {
                failedTasks.add(taskId);
              }
            } else {
              // Handle promise rejection
              const taskId = readyTasks.find(t => 
                !completed.has(t.id) && !failedTasks.has(t.id)
              )?.id;
              
              if (taskId) {
                const errorMessage = promiseResult.reason instanceof Error ? 
                  promiseResult.reason.message : String(promiseResult.reason);
                
                this.logger.error(`Promise rejected for task ${taskId}:`, promiseResult.reason);
                
                errors.push({
                  taskId,
                  error: promiseResult.reason instanceof Error ? promiseResult.reason : errorMessage,
                  stage: 'promise_rejection_hierarchical'
                });
                
                results[taskId] = {
                  taskId,
                  agentId: readyTasks.find(t => t.id === taskId)?.assignedAgentId || '',
                  status: TaskStatus.FAILED,
                  error: errorMessage,
                  output: "",
                  completedAt: new Date(),
                  executionTime: 0 // No execution time since it failed immediately
                };
                
                failedTasks.add(taskId);
              }
            }
          });
        }
        
        // Check for unprocessed tasks (due to max iterations)
        if (iterationCount >= maxIterations && completed.size + failedTasks.size < workflow.tasks.length) {
          const errorMsg = `Maximum iteration count (${maxIterations}) exceeded for hierarchical workflow execution`;
          this.logger.error(errorMsg);
          
          // Create failure entries for remaining tasks
          workflow.tasks.forEach(task => {
            if (!completed.has(task.id) && !failedTasks.has(task.id)) {
              results[task.id] = {
                taskId: task.id,
                agentId: task.assignedAgentId,
                status: TaskStatus.FAILED,
                error: `Task not processed: ${errorMsg}`,
                output: "",
                completedAt: new Date(),
                executionTime: 0 // No execution time since it failed immediately
              };
            }
          });
        }
      } else {
        throw new OpenRouterError(`Unsupported process mode: ${processMode}`, 400, null);
      }
    } catch (error) {
      // Handle critical workflow execution errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Critical error in workflow execution ${workflow.id}:`, error);
      
      criticalError = error instanceof Error ? error : new Error(errorMessage);
      
      // Record the error in OneAPI metrics
      if (this.oneAPI) {
        try {
          if (this.oneAPI.trackWorkflow) {
            this.oneAPI.trackWorkflow({
              trackingId: workflowTrackingId,
              eventType: 'error',
              error: errorMessage,
              metadata: {
                ...workflowMetadata,
                errorType: error instanceof Error ? error.name : 'Unknown',
                errorStage: 'workflow_execution',
                completedTaskCount: Object.values(results).filter(r => r.status === TaskStatus.COMPLETED).length
              }
            });
          } else if (this.oneAPI.getMetrics) {
            const metrics = this.oneAPI.getMetrics();
            if (metrics && metrics.recordWorkflowEvent) {
              metrics.recordWorkflowEvent({
                workflowId: workflow.id,
                workflowName: workflow.name,
                eventType: 'workflow_error',
                error: errorMessage,
                timestamp: new Date()
              });
            }
          }
        } catch (metricError) {
          this.logger.warn('Failed to record workflow error metrics:', metricError);
        }
      }
      
      // Re-throw the error after recording metrics
      throw criticalError;
    }
    
    // Calculate workflow execution metrics
    const workflowExecutionTime = Date.now() - workflowStartTime;
    const successCount = Object.values(results).filter(result => result.status === TaskStatus.COMPLETED).length;
    const failedCount = Object.values(results).filter(result => result.status === TaskStatus.FAILED).length;
    const workflowStatus = failedCount > 0 ? (successCount > 0 ? 'partial_success' : 'failed') : 'success';
    
    // Report workflow completion to OneAPI metrics
    if (this.oneAPI) {
      try {
        if (this.oneAPI.trackWorkflow) {
          // Use newer API if available
          this.oneAPI.trackWorkflow({
            trackingId: workflowTrackingId,
            eventType: 'complete',
            status: workflowStatus,
            metadata: {
              ...workflowMetadata,
              executionTimeMs: workflowExecutionTime,
              successCount,
              failedCount,
              errorCount: errors.length,
              errors: errors.length > 0 ? JSON.stringify(errors.map(e => ({
                taskId: e.taskId,
                message: e.error instanceof Error ? e.error.message : String(e.error),
                stage: e.stage
              })).slice(0, 5)) : undefined // Limit to first 5 errors
            }
          });
        } else if (this.oneAPI.getMetrics) {
          // Fall back to older metrics API
          const metrics = this.oneAPI.getMetrics();
          if (metrics && metrics.recordWorkflowEvent) {
            metrics.recordWorkflowEvent({
              workflowId: workflow.id,
              workflowName: workflow.name,
              eventType: 'workflow_complete',
              executionTime: workflowExecutionTime,
              taskCount: workflow.tasks.length,
              successCount,
              failedCount,
              status: workflowStatus,
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        // Log but continue if metrics tracking fails
        this.logger.warn('Failed to record workflow completion metrics:', error);
      }
    }
    
    this.logger.info(`Workflow completed: ${workflow.name} (${workflow.id}) in ${workflowExecutionTime}ms with ${successCount} successful tasks and ${failedCount} failed tasks`);
    return results;
  }

  /**
   * Run a crew with specified tasks
   * 
   * @param crew - The crew configuration
   * @param tasks - The tasks to execute
   * @param config - Optional execution configuration
   * @param callbacks - Optional callbacks for task lifecycle events
   * @returns A promise resolving to the crew run status
   * 
   * @example
   * ```typescript
   * const runStatus = await langChain.runCrew(
   *   researchCrew,
   *   [researchTask, summaryTask],
   *   { processMode: ProcessMode.SEQUENTIAL },
   *   { onTaskComplete: (result) => console.log(`Task completed: ${result.output}`) }
   * );
   * ```
   */
  async runCrew(
    crew: CrewConfig,
    tasks: Task[],
    config?: TaskExecutionConfig,
    callbacks?: TaskCallbacks
  ): Promise<CrewRunStatus> {
    // Track start time for overall crew execution
    const crewStartTime = Date.now();
    
    // Report crew execution start to OneAPI metrics if available
    if (this.oneAPI && this.oneAPI.getMetrics) {
      const metrics = this.oneAPI.getMetrics();
      if (metrics && metrics.recordCrewEvent) {
        metrics.recordCrewEvent({
          crewId: crew.id,
          crewName: crew.name,
          eventType: 'crew_start',
          agentCount: crew.agents.length,
          taskCount: tasks.length,
          processMode: config?.processMode || crew.processMode || ProcessMode.SEQUENTIAL,
          timestamp: new Date()
        });
      }
    }
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startTime = new Date();
    
    this.logger.info(`Running crew: ${crew.name} (${crew.id}) with ${tasks.length} tasks, run ID: ${runId}`);
    
    // Initial status
    const status: CrewRunStatus = {
      runId,
      crewId: crew.id,
      taskStatuses: {},
      taskResults: {},
      status: 'running',
      startTime
    };
    
    // Initialize task statuses
    tasks.forEach(task => {
      status.taskStatuses[task.id] = TaskStatus.PENDING;
    });
    
    try {
      // Create a map of agents by ID for easy lookup
      const agentMap: Record<string, Agent | ExtendedAgentConfig> = {};
      crew.agents.forEach(agent => {
        agentMap[agent.id] = agent;
      });
      
      // Create internal callbacks to track status
      const internalCallbacks: TaskCallbacks = {
        onTaskStart: (taskId, agentId) => {
          status.taskStatuses[taskId] = TaskStatus.IN_PROGRESS;
          callbacks?.onTaskStart?.(taskId, agentId);
        },
        onTaskComplete: (result) => {
          status.taskStatuses[result.taskId] = result.status;
          status.taskResults[result.taskId] = result;
          callbacks?.onTaskComplete?.(result);
        },
        onTaskError: (taskId, error) => {
          status.taskStatuses[taskId] = TaskStatus.FAILED;
          callbacks?.onTaskError?.(taskId, error);
        },
        onTaskApprovalRequired: callbacks?.onTaskApprovalRequired
      };
      
      // Process mode
      const processMode = config?.processMode || crew.processMode || ProcessMode.SEQUENTIAL;
      
      if (processMode === ProcessMode.SEQUENTIAL) {
        // Execute tasks sequentially
        for (const task of tasks) {
          const agent = agentMap[task.assignedAgentId];
          if (!agent) {
            throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
          }
          
          const result = await this.executeTask(task, agent, config, internalCallbacks);
          
          // Check for failure and handle based on crew configuration
          if (result.status === TaskStatus.FAILED && !crew.failureHandling?.continueOnFailure) {
            throw new Error(`Task ${task.id} failed: ${result.error}`);
          }
        }
      } else if (processMode === ProcessMode.PARALLEL) {
        // Execute all tasks in parallel
        const promises = tasks.map(async (task) => {
          const agent = agentMap[task.assignedAgentId];
          if (!agent) {
            throw new OpenRouterError(`Agent not found for task: ${task.id} (assigned to ${task.assignedAgentId})`, 400, null);
          }
          
          return this.executeTask(task, agent, config, internalCallbacks);
        });
        
        await Promise.all(promises);
      } else {
        throw new OpenRouterError(`Unsupported process mode: ${processMode}`, 400, null);
      }
      
      // Update final status
      status.status = 'completed';
      status.endTime = new Date();
      
      // Calculate crew execution metrics
      const crewExecutionTime = Date.now() - crewStartTime;
      const successCount = Object.values(status.taskStatuses).filter(s => s === TaskStatus.COMPLETED).length;
      const failedCount = Object.values(status.taskStatuses).filter(s => s === TaskStatus.FAILED).length;
      
      // Report crew execution completion to OneAPI metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordCrewEvent) {
          metrics.recordCrewEvent({
            crewId: crew.id,
            crewName: crew.name,
            runId: runId,
            eventType: 'crew_complete',
            executionTime: crewExecutionTime,
            agentCount: crew.agents.length,
            taskCount: tasks.length,
            tasksCompleted: successCount,
            tasksFailed: failedCount,
            status: 'completed',
            timestamp: new Date()
          });
        }
      }
      
      this.logger.info(`Crew run completed: ${crew.name} (${crew.id}) - ${runId} in ${crewExecutionTime}ms with ${successCount} successful tasks and ${failedCount} failed tasks`);
      return status;
    } catch (error) {
      // Update status on failure
      status.status = 'failed';
      status.endTime = new Date();
      status.error = error instanceof Error ? error.message : String(error);
      
      // Calculate crew execution metrics
      const crewExecutionTime = Date.now() - crewStartTime;
      const successCount = Object.values(status.taskStatuses).filter(s => s === TaskStatus.COMPLETED).length;
      const failedCount = Object.values(status.taskStatuses).filter(s => s === TaskStatus.FAILED).length;
      
      // Report crew execution failure to OneAPI metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordCrewEvent) {
          metrics.recordCrewEvent({
            crewId: crew.id,
            crewName: crew.name,
            runId: runId,
            eventType: 'crew_error',
            executionTime: crewExecutionTime,
            agentCount: crew.agents.length,
            taskCount: tasks.length,
            tasksCompleted: successCount,
            tasksFailed: failedCount,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
        }
      }
      
      this.logger.error(`Crew run failed: ${crew.name} (${crew.id}) - ${runId} in ${crewExecutionTime}ms with ${successCount} successful tasks and ${failedCount} failed tasks. Error: ${error instanceof Error ? error.message : String(error)}`);
      return status;
    }
  }

  /**
   * Register a tool that can be used by agents
   * 
   * @param name - Tool name
   * @param description - Tool description
   * @param schema - JSON schema for the tool's parameters
   * @param fn - The function implementation
   * @returns The registered tool
   */
  registerTool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    fn: (args: Record<string, unknown>) => Promise<unknown>
  ): any {
    // Create a tool wrapper compatible with the AgentTool interface
    const tool = {
      name,
      description,
      type: 'function', // Adding required type property
      schema,
      function: async (args: Record<string, unknown>) => { // Rename to function as required by AgentTool
        try {
          // Track tool execution start time for metrics
          const executionStart = Date.now();
          
          // Record tool invocation in OneAPI metrics if available
          if (this.oneAPI && this.oneAPI.getMetrics) {
            const metrics = this.oneAPI.getMetrics();
            if (metrics && metrics.recordToolEvent) {
              metrics.recordToolEvent({
                toolName: name,
                eventType: 'tool_start',
                parameters: args,
                timestamp: new Date()
              });
            }
          }
          
          // Execute the tool function
          const result = await fn(args);
          
          // Calculate execution time
          const executionTime = Date.now() - executionStart;
          
          // Record successful tool execution in OneAPI metrics
          if (this.oneAPI && this.oneAPI.getMetrics) {
            const metrics = this.oneAPI.getMetrics();
            if (metrics && metrics.recordToolEvent) {
              metrics.recordToolEvent({
                toolName: name,
                eventType: 'tool_complete',
                executionTime,
                status: 'success',
                resultType: typeof result,
                timestamp: new Date()
              });
            }
          }
          
          return result;
        } catch (error) {
          this.logger.error(`Error executing tool ${name}:`, error);
          
          // Record tool execution failure in OneAPI metrics
          if (this.oneAPI && this.oneAPI.getMetrics) {
            const metrics = this.oneAPI.getMetrics();
            if (metrics && metrics.recordToolEvent) {
              metrics.recordToolEvent({
                toolName: name,
                eventType: 'tool_error',
                errorMessage: error instanceof Error ? error.message : String(error),
                status: 'failed',
                timestamp: new Date()
              });
            }
          }
          
          throw error;
        }
      }
    };
    
    // Register tool with OneAPI if available
    if (this.oneAPI && this.oneAPI.registerTool) {
      this.oneAPI.registerTool(name, description, schema);
    }
    
    this.tools.set(name, tool);
    return tool;
  }

  /**
   * Initialize a vector database for an agent
   * Uses OneAPI for embeddings generation when available
   * 
   * @param agentId - The agent ID
   * @param config - Vector database configuration
   * @returns The initialized vector database
   */
  private initializeVectorDb(agentId: string, config: any): any {
    if (this.vectorDbs.has(agentId)) {
      return this.vectorDbs.get(agentId)!;
    }
    
    try {
      // Create the appropriate vector DB implementation
      let vectorDb;
      let enhancedConfig = { ...config };
      
      // Enhance config with OneAPI for embeddings if available
      if (this.oneAPI) {
        this.logger.debug(`Enhancing vector DB with OneAPI for agent: ${agentId}`);
        
        // Add OneAPI reference to config
        enhancedConfig.oneAPI = this.oneAPI;
        
        // Configure to use OneAPI for embeddings
        enhancedConfig.embeddingsProvider = 'oneapi';
        enhancedConfig.embeddingsModel = 'openai/text-embedding-3-small'; // Default model
      }
      
      // Check if config has a 'type' property
      if (enhancedConfig.type) {
        // Using type assertion to bypass type checking conflicts
        vectorDb = createVectorDB(enhancedConfig as ExtendedVectorDBConfig);
      } else {
        // For backward compatibility
        vectorDb = new UtilVectorDB(enhancedConfig);
      }
      
      this.vectorDbs.set(agentId, vectorDb);
      return vectorDb;
    } catch (error) {
      this.logger.error(`Error initializing vector database for agent ${agentId}:`, error);
      throw new OpenRouterError(
        `Failed to initialize vector database: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Add a document to an agent's knowledge base
   * Uses OneAPI for embeddings generation when available
   * 
   * @param agentId - The agent ID
   * @param document - The document to add
   * @param namespace - Optional namespace/collection to add the document to
   * @returns Promise resolving to the document ID
   * 
   * @example
   * ```typescript
   * const docId = await langChain.addKnowledge(
   *   'researcher',
   *   {
   *     id: 'doc1',
   *     content: 'Electric vehicles are becoming increasingly popular...',
   *     metadata: { source: 'research-report', topic: 'electric-vehicles' }
   *   }
   * );
   * ```
   */
  async addKnowledge(
    agentId: string,
    document: VectorDocument,
    namespace?: string
  ): Promise<string> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Track start time for metrics
      const startTime = Date.now();
      let documentWithEmbedding = { ...document };
      
      // If OneAPI is available, generate embeddings directly
      if (this.oneAPI && this.oneAPI.createEmbedding && !document.embedding) {
        try {
          const embeddingModel = 'openai/text-embedding-3-small'; // Can be configurable
          this.logger.debug(`Generating OneAPI embedding for document: ${document.id || 'unnamed'}`);
          
          const embeddingResponse = await this.oneAPI.createEmbedding({
            model: embeddingModel,
            input: document.content
          });
          
          if (embeddingResponse?.data && embeddingResponse.data.length > 0) {
            documentWithEmbedding.embedding = embeddingResponse.data[0].embedding;
            
            // Track embedding usage in metrics if available
            if (this.oneAPI.getMetrics) {
              const metrics = this.oneAPI.getMetrics();
              if (metrics && metrics.recordEmbeddingUsage) {
                metrics.recordEmbeddingUsage({
                  model: embeddingModel,
                  tokenCount: embeddingResponse.usage?.total_tokens || document.content.length / 4,
                  timestamp: new Date(),
                  agentId: agentId,
                  operationType: 'document_embedding'
                });
              }
            }
          }
        } catch (embeddingError: unknown) {
          // Log but continue with default embedding method
          const errorMessage = embeddingError instanceof Error ? 
            embeddingError.message : String(embeddingError);
          this.logger.warn(`Failed to generate OneAPI embeddings, falling back: ${errorMessage}`);
        }
      }
      
      // Add the document with or without the OneAPI embedding
      const docId = namespace
        ? await vectorDb.addDocument(documentWithEmbedding, namespace)
        : await vectorDb.addDocument(documentWithEmbedding);
      
      // Record operation metrics
      const operationTime = Date.now() - startTime;
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'add_document',
            documentId: docId,
            responseTime: operationTime,
            status: 'success'
          });
        }
      }
      
      this.logger.debug(`Added document to agent knowledge base: ${docId}`);
      return docId;
    } catch (error: unknown) {
      // Record error in metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'add_document',
            status: 'error',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      this.logger.error(`Error adding document to ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to add document: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Add multiple documents to an agent's knowledge base
   * 
   * @param agentId - The agent ID
   * @param documents - Array of documents to add
   * @param namespace - Optional namespace/collection to add the documents to
   * @returns Promise resolving to an array of document IDs
   * 
   * @example
   * ```typescript
   * const docIds = await langChain.addKnowledgeBatch(
   *   'researcher',
   *   [
   *     {
   *       id: 'doc1',
   *       content: 'Electric vehicles are becoming increasingly popular...',
   *       metadata: { source: 'research-report', topic: 'electric-vehicles' }
   *     },
   *     {
   *       id: 'doc2',
   *       content: 'The global market for electric vehicles is expected to grow...',
   *       metadata: { source: 'market-analysis', topic: 'electric-vehicles' }
   *     }
   *   ]
   * );
   * ```
   */
  async addKnowledgeBatch(
    agentId: string,
    documents: VectorDocument[],
    namespace?: string
  ): Promise<string[]> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Track start time for metrics
      const startTime = Date.now();
      let documentsWithEmbeddings = [...documents];
      
      // If OneAPI is available, generate embeddings for documents that don't have them
      if (this.oneAPI && this.oneAPI.createEmbedding) {
        const documentsToEmbed = documents.filter(doc => !doc.embedding);
        
        if (documentsToEmbed.length > 0) {
          try {
            const embeddingModel = 'openai/text-embedding-3-small'; // Can be configurable
            this.logger.debug(`Generating OneAPI embeddings for ${documentsToEmbed.length} documents`);
            
            // Create embeddings for each document without one
            const embeddingPromises = documentsToEmbed.map(async (doc, index) => {
              try {
                const embeddingResponse = await this.oneAPI.createEmbedding({
                  model: embeddingModel,
                  input: doc.content
                });
                
                if (embeddingResponse?.data && embeddingResponse.data.length > 0) {
                  // Create a new document with the embedding
                  const docWithEmbedding = { ...doc, embedding: embeddingResponse.data[0].embedding };
                  
                  // Track embedding usage in metrics if available
                  if (this.oneAPI.getMetrics) {
                    const metrics = this.oneAPI.getMetrics();
                    if (metrics && metrics.recordEmbeddingUsage) {
                      metrics.recordEmbeddingUsage({
                        model: embeddingModel,
                        tokenCount: embeddingResponse.usage?.total_tokens || doc.content.length / 4,
                        timestamp: new Date(),
                        agentId: agentId,
                        operationType: 'batch_document_embedding'
                      });
                    }
                  }
                  
                  return docWithEmbedding;
                }
                return doc; // Return original if embedding failed
              } catch (embeddingError) {
                // Log but continue with default embedding method for this document
                this.logger.warn(`Failed to generate OneAPI embedding for document ${index}, continuing with default: ${embeddingError instanceof Error ? embeddingError.message : String(embeddingError)}`);
                return doc;
              }
            });
            
            // Wait for all embedding operations to complete
            const embeddedDocs = await Promise.all(embeddingPromises);
            
            // Replace documents that needed embeddings
            let embeddedIndex = 0;
            documentsWithEmbeddings = documents.map(doc => {
              if (!doc.embedding) {
                return embeddedDocs[embeddedIndex++];
              }
              return doc;
            });
          } catch (batchEmbeddingError) {
            // Log but continue with default embedding method
            this.logger.warn(`Failed in batch embedding generation, falling back to default: ${batchEmbeddingError instanceof Error ? batchEmbeddingError.message : String(batchEmbeddingError)}`);
          }
        }
      }
      
      // Add the documents with or without OneAPI embeddings
      const docIds = namespace
        ? await vectorDb.addDocuments(documentsWithEmbeddings, namespace)
        : await vectorDb.addDocuments(documentsWithEmbeddings);
      
      // Record operation metrics
      const operationTime = Date.now() - startTime;
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'add_documents_batch',
            documentCount: documents.length,
            responseTime: operationTime,
            status: 'success'
          });
        }
      }
      
      this.logger.debug(`Added ${docIds.length} documents to agent knowledge base`);
      return docIds;
    } catch (error: unknown) {
      // Record error in metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'add_documents_batch',
            documentCount: documents.length,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      this.logger.error(`Error adding documents to ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to add documents: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Search an agent's knowledge base using text query
   * Uses OneAPI for embeddings generation and similarity search
   * 
   * @param agentId - The agent ID
   * @param text - The text to search for
   * @param options - Search options
   * @returns Promise resolving to an array of search results
   * 
   * @example
   * ```typescript
   * const results = await langChain.searchKnowledge(
   *   'researcher',
   *   'electric vehicle market trends',
   *   { limit: 5, minScore: 0.7 }
   * );
   * ```
   */
  async searchKnowledge(
    agentId: string,
    text: string,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Track operation start time for metrics
      const startTime = Date.now();
      
      // If OneAPI is available and supports direct similarity search
      if (this.oneAPI && this.oneAPI.performSimilaritySearch && 
          typeof vectorDb.getNamespace === 'function') {
        try {
          const namespace = vectorDb.getNamespace();
          this.logger.debug(`Using OneAPI for similarity search in namespace: ${namespace}`);
          
          const searchResults = await this.oneAPI.performSimilaritySearch({
            namespace,
            query: text,
            limit: options?.limit || 5,
            minScore: options?.minScore || 0.7
          });
          
          // Record metrics
          const operationTime = Date.now() - startTime;
          if (this.oneAPI.getMetrics) {
            const metrics = this.oneAPI.getMetrics();
            if (metrics && metrics.recordVectorOperation) {
              metrics.recordVectorOperation({
                agentId: agentId,
                operationType: 'similarity_search',
                queryText: text,
                responseTime: operationTime,
                resultCount: searchResults.length,
                status: 'success'
              });
            }
          }
          
          return searchResults;
        } catch (directSearchError: unknown) {
          // Log but continue with default search method
          const errorMessage = directSearchError instanceof Error ? 
            directSearchError.message : String(directSearchError);
          this.logger.warn(`Failed to use OneAPI for similarity search, falling back: ${errorMessage}`);
        }
      }
      
      // Default behavior - use the vector store's built-in search
      const method = vectorDb.searchSimilar ? 'searchSimilar' : 'searchByText';
      const results = await vectorDb[method](text, options || {});
      
      // Record operation metrics
      const operationTime = Date.now() - startTime;
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'similarity_search',
            queryText: text,
            responseTime: operationTime,
            resultCount: results.length,
            status: 'success'
          });
        }
      }
      
      return results;
    } catch (error: unknown) {
      // Record error in metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'similarity_search',
            queryText: text,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      this.logger.error(`Error searching ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to search knowledge base: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }

  /**
   * Get a document from an agent's knowledge base by its ID
   * 
   * @param agentId - The agent ID
   * @param documentId - The document ID
   * @param namespace - Optional namespace/collection to search in
   * @returns Promise resolving to the document or null if not found
   * 
   * @example
   * ```typescript
   * const document = await langChain.getKnowledgeDocument('researcher', 'doc1');
   * ```
   */
  async getKnowledgeDocument(
    agentId: string,
    documentId: string,
    namespace?: string
  ): Promise<VectorDocument | null> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Track operation start time for metrics
      const startTime = Date.now();
      
      // Handle namespace parameter consistently with other methods
      const document = namespace
        ? await vectorDb.getDocument(documentId, namespace)
        : await vectorDb.getDocument(documentId);
      
      // Record operation metrics
      const operationTime = Date.now() - startTime;
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'get_document',
            documentId: documentId,
            responseTime: operationTime,
            status: 'success'
          });
        }
      }
      
      return document;
    } catch (error: unknown) {
      // Record error in metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'get_document',
            documentId: documentId,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      this.logger.error(`Error getting document from ${agentId}'s knowledge base:`, error);
      return null; // Return null instead of throwing to be more resilient
    }
  }

  /**
   * Delete a document from an agent's knowledge base
   * 
   * @param agentId - The agent ID
   * @param documentId - The document ID
   * @param namespace - Optional namespace/collection
   * @returns Promise resolving to a boolean indicating success
   * 
   * @example
   * ```typescript
   * const success = await langChain.deleteKnowledgeDocument('researcher', 'doc1');
   * ```
   */
  async deleteKnowledgeDocument(
    agentId: string,
    documentId: string,
    namespace?: string
  ): Promise<boolean> {
    const vectorDb = this.vectorDbs.get(agentId);
    
    if (!vectorDb) {
      throw new OpenRouterError(`Vector database not initialized for agent: ${agentId}`, 400, null);
    }
    
    try {
      // Track operation start time for metrics
      const startTime = Date.now();
      
      // Handle namespace parameter consistently with other methods
      const result = namespace
        ? await vectorDb.deleteDocument(documentId, namespace)
        : await vectorDb.deleteDocument(documentId);
      
      // Record operation metrics
      const operationTime = Date.now() - startTime;
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'delete_document',
            documentId: documentId,
            responseTime: operationTime,
            status: 'success'
          });
        }
      }
      
      return result;
    } catch (error: unknown) {
      // Record error in metrics
      if (this.oneAPI && this.oneAPI.getMetrics) {
        const metrics = this.oneAPI.getMetrics();
        if (metrics && metrics.recordVectorOperation) {
          metrics.recordVectorOperation({
            agentId: agentId,
            operationType: 'delete_document',
            documentId: documentId,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      this.logger.error(`Error deleting document from ${agentId}'s knowledge base:`, error);
      throw new OpenRouterError(
        `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`,
        500,
        error instanceof Error ? error : null
      );
    }
  }
}
