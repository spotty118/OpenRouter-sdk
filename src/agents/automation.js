/**
 * Automation Agent for OpenRouter SDK
 * 
 * This agent automates sequences of tasks with dependency management using OneAPI.
 * Enhanced with comprehensive metrics tracking and improved error handling.
 */

import oneapiModule from '../oneapi.js';

export class AutomationAgent {
  constructor(config = {}) {
    this.name = 'Automation Agent';
    this.description = 'AI Agent that automates sequences of tasks';
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
    this.defaultModel = config.defaultModel || 'openai/gpt-4-turbo'; // Use GPT-4 for complex automation tasks
    this.fallbackModels = config.fallbackModels || ['anthropic/claude-3-opus', 'google/gemini-pro'];
    this.metricsEnabled = config.trackMetrics !== false; // Enable metrics by default
    this.metadata = {
      agentType: 'automation',
      version: '1.1.0',
      capabilities: ['task-planning', 'dependency-management', 'execution-optimization']
    };
  }

  /**
   * Execute a sequence of tasks
   * @param {Object} options - Automation options
   * @param {string|Array} options.tasks - JSON array of tasks to perform or parsed array
   * @param {string|Object} options.dependencies - JSON object of task dependencies or parsed object
   * @param {boolean} options.parallel - Execute tasks in parallel if possible
   * @param {string} options.model - Model to use for planning and execution
   * @param {number} options.temperature - Temperature for generation
   * @param {number} options.maxTokens - Maximum tokens for responses
   * @param {boolean} options.planOnly - Only generate plan without execution
   * @param {boolean} options.trackMetrics - Whether to track metrics for this automation
   * @param {Object} options.metadata - Additional metadata for metrics tracking
   * @returns {Promise<Object>} Automation results
   */
  async execute({ 
    tasks, 
    dependencies = {}, 
    parallel = false,
    model,
    temperature = 0.3,
    maxTokens = 2000,
    planOnly = false,
    trackMetrics = this.metricsEnabled,
    metadata = {}
  }) {
    console.log(`Executing automation with ${typeof tasks === 'string' ? 'string' : 'object'} tasks, parallel: ${parallel}`);
    
    // Generate tracking ID for this automation task
    const trackingId = `automation_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const startTime = new Date();
    
    // Combine metadata
    const combinedMetadata = {
      ...this.metadata,
      ...metadata,
      parallel,
      planOnly,
      temperature,
      maxTokens,
      taskCount: Array.isArray(tasks) ? tasks.length : (typeof tasks === 'string' ? JSON.parse(tasks).length : 0)
    };
    
    try {
      // Parse inputs if they're strings
      const parsedTasks = typeof tasks === 'string' ? JSON.parse(tasks) : tasks;
      const parsedDeps = typeof dependencies === 'string' ? JSON.parse(dependencies) : dependencies;
      
      // Use OneAPI for task planning and execution
      const useModel = model || this.defaultModel;
      
      // Start OneAPI metric tracking for this automation task
      if (trackMetrics) {
        this.oneAPI.startMetric({
          type: 'automation_planning',
          model: useModel,
          trackingId,
          metadata: combinedMetadata
        });
      }
      
      // Construct system prompt for automation planning
      const systemPrompt = `You are an automation expert that specializes in task planning and execution. 
      Given a set of tasks and their dependencies, create a detailed execution plan that optimizes for efficiency ${parallel ? 'with parallel execution when possible' : 'with sequential execution'}.
      For each task, determine the execution order, prerequisites, and estimated time.
      Provide your response as a JSON object with the following structure:
      {
        "executionPlan": [array of task objects with id, dependencies, executionOrder, and estimatedTime],
        "summary": "Brief explanation of the execution strategy"
      }`;
      
      // Prepare the tasks and dependencies for the prompt
      const tasksString = JSON.stringify(parsedTasks, null, 2);
      const depsString = JSON.stringify(parsedDeps, null, 2);
      
      // Construct messages for LLM
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Create an execution plan for the following tasks:\n\nTasks:\n\`\`\`json\n${tasksString}\n\`\`\`\n\nDependencies:\n\`\`\`json\n${depsString}\n\`\`\`\n\nExecute ${parallel ? 'in parallel when possible' : 'sequentially'}.`
        }
      ];
      
      // Get response from OneAPI for planning with fallback handling
      let planResponse;
      let attemptedModels = [];
      let lastError = null;
      
      // Try primary model first, then fallbacks if needed
      const modelsToTry = [useModel, ...this.fallbackModels];
      
      for (const modelToTry of modelsToTry) {
        try {
          attemptedModels.push(modelToTry);
          
          // Update tracking if using fallback
          if (trackMetrics && attemptedModels.length > 1) {
            this.oneAPI.updateMetric({
              trackingId,
              status: 'retry',
              model: modelToTry,
              metadata: {
                ...combinedMetadata,
                attemptedModels,
                failedModel: attemptedModels[attemptedModels.length - 2],
                error: lastError?.message || 'Unknown error',
                stage: 'planning'
              }
            });
          }
          
          planResponse = await this.oneAPI.createChatCompletion({
            model: modelToTry,
            messages,
            temperature,
            maxTokens,
            metadata: trackMetrics ? {
              trackingId,
              ...combinedMetadata
            } : undefined
          });
          
          // If we got here, the model worked
          break;
          
        } catch (error) {
          lastError = error;
          console.warn(`Model ${modelToTry} failed for planning, trying next fallback if available`, error);
          
          // If this is the last model to try, throw the error
          if (modelToTry === modelsToTry[modelsToTry.length - 1]) {
            if (trackMetrics) {
              this.oneAPI.updateMetric({
                trackingId,
                status: 'error',
                error: error.message,
                metadata: {
                  ...combinedMetadata,
                  attemptedModels,
                  failedAllModels: true,
                  stage: 'planning'
                }
              });
            }
            throw error;
          }
        }
      }
      
      // Track success of planning stage if tracking is enabled
      if (trackMetrics) {
        this.oneAPI.updateMetric({
          trackingId,
          status: 'success',
          stage: 'planning',
          model: attemptedModels[attemptedModels.length - 1],
          metadata: {
            ...combinedMetadata,
            attemptedModels,
            usedFallback: attemptedModels.length > 1,
            promptTokens: planResponse.usage?.prompt_tokens || 0,
            completionTokens: planResponse.usage?.completion_tokens || 0
          }
        });
      }
      
      // Extract and process execution plan
      const planContent = planResponse.choices[0].message.content;
      
      // Try to parse the execution plan
      let executionPlan = [];
      let planSummary = '';
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = planContent.match(/```json\n([\s\S]*?)\n```/) || 
                          planContent.match(/({[\s\S]*})/); 
        
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          executionPlan = parsed.executionPlan || [];
          planSummary = parsed.summary || '';
        } else {
          // Try to parse the entire response as JSON
          const parsed = JSON.parse(planContent);
          executionPlan = parsed.executionPlan || [];
          planSummary = parsed.summary || '';
        }
      } catch (error) {
        console.warn('Could not parse execution plan as JSON, using mock plan', error);
        
        // Track parsing error if tracking is enabled
        if (trackMetrics) {
          this.oneAPI.trackEvent({
            type: 'plan_parsing_error',
            trackingId,
            error: error.message,
            metadata: {
              ...combinedMetadata,
              contentLength: planContent?.length || 0,
              errorType: error.name || 'JSONParseError'
            }
          });
        }
        
        // Fall back to mock plan
        executionPlan = this._createMockExecutionPlan(parsedTasks, parsedDeps, parallel);
        planSummary = 'Generated execution plan (JSON parsing failed)';
      }
      
      // If only planning is requested, return the plan without execution
      if (planOnly) {
        // Finalize metrics if tracking is enabled
        if (trackMetrics) {
          const endTime = new Date();
          const duration = endTime - startTime;
          
          this.oneAPI.completeMetric({
            trackingId,
            status: 'success',
            model: attemptedModels[attemptedModels.length - 1],
            duration,
            outputTokens: planResponse.usage?.completion_tokens || 0,
            inputTokens: planResponse.usage?.prompt_tokens || 0,
            totalTokens: planResponse.usage?.total_tokens || 0,
            metadata: {
              ...combinedMetadata,
              attemptedModels,
              usedFallback: attemptedModels.length > 1,
              finalModel: attemptedModels[attemptedModels.length - 1],
              taskCount: executionPlan.length,
              stageCompleted: 'planning',
              planOnly: true
            }
          });
        }
        
        return {
          tasks: parsedTasks,
          dependencies: parsedDeps,
          executionPlan: executionPlan,
          summary: planSummary,
          parallelExecution: parallel,
          model: attemptedModels[attemptedModels.length - 1],
          timestamp: new Date().toISOString(),
          trackingId: trackMetrics ? trackingId : undefined,
          fallback: attemptedModels.length > 1 ? attemptedModels : undefined,
          duration: new Date() - startTime,
          usage: planResponse.usage
        };
      }
      
      // Start tracking execution phase if metrics enabled
      if (trackMetrics) {
        this.oneAPI.updateMetric({
          trackingId,
          status: 'in_progress',
          stage: 'execution',
          metadata: {
            ...combinedMetadata,
            taskCount: executionPlan.length,
            startTime: new Date().toISOString()
          }
        });
      }
      
      // Execute the tasks (in a real implementation, this would actually execute them)
      // For demo purposes, we'll simulate execution with our mock results
      const results = await this._simulateExecution(parsedTasks, executionPlan, attemptedModels[attemptedModels.length - 1], trackMetrics, trackingId, combinedMetadata);
      
      // Finalize metrics if tracking is enabled
      if (trackMetrics) {
        const endTime = new Date();
        const duration = endTime - startTime;
        
        this.oneAPI.completeMetric({
          trackingId,
          status: 'success',
          model: attemptedModels[attemptedModels.length - 1],
          duration,
          outputTokens: planResponse.usage?.completion_tokens || 0,
          inputTokens: planResponse.usage?.prompt_tokens || 0,
          totalTokens: planResponse.usage?.total_tokens || 0,
          metadata: {
            ...combinedMetadata,
            attemptedModels,
            usedFallback: attemptedModels.length > 1,
            finalModel: attemptedModels[attemptedModels.length - 1],
            taskCount: executionPlan.length,
            successfulTasks: Object.values(results).filter(r => r.status === 'completed').length,
            failedTasks: Object.values(results).filter(r => r.status === 'failed').length
          }
        });
      }
      
      return {
        tasks: parsedTasks,
        dependencies: parsedDeps,
        executionPlan: executionPlan,
        summary: planSummary,
        results: results,
        parallelExecution: parallel,
        model: attemptedModels[attemptedModels.length - 1],
        timestamp: new Date().toISOString(),
        trackingId: trackMetrics ? trackingId : undefined,
        fallback: attemptedModels.length > 1 ? attemptedModels : undefined,
        duration: new Date() - startTime,
        usage: planResponse.usage
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime - startTime;
      
      // Record error metrics if tracking is enabled
      if (trackMetrics) {
        this.oneAPI.completeMetric({
          trackingId,
          status: 'error',
          duration,
          error: error.message,
          metadata: {
            ...combinedMetadata,
            errorType: error.name || 'UnknownError',
            stage: error.message.includes('planning') ? 'planning' : 'execution'
          }
        });
      }
      
      console.error('Automation agent error:', error);
      throw new Error(`Automation failed: ${error.message}`);
    }
  }
  
  /**
   * Get metrics for this automation agent
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for metrics
   * @param {Date} options.endDate - End date for metrics
   * @param {string} options.model - Filter by model
   * @returns {Promise<Object>} Metrics data
   */
  async getMetrics(options = {}) {
    return this.oneAPI.getMetrics({
      type: 'automation',
      ...options,
      metadata: {
        agentType: 'automation',
        ...(options.metadata || {})
      }
    });
  }

  /**
   * Create a mock execution plan for demo purposes
   * @private
   */
  _createMockExecutionPlan(tasks, dependencies, parallel) {
    if (!Array.isArray(tasks)) return [];
    
    return tasks.map((task, index) => ({
      id: typeof task === 'string' ? task : `task-${index}`,
      dependencies: dependencies[typeof task === 'string' ? task : `task-${index}`] || [],
      estimatedTime: Math.floor(Math.random() * 5) + 1 + 's',
      executionOrder: index + 1
    }));
  }

  /**
   * Create mock results for demo purposes
   * @private
   */
  _createMockResults(tasks) {
    if (!Array.isArray(tasks)) return {};
    
    const results = {};
    tasks.forEach((task, index) => {
      const taskId = typeof task === 'string' ? task : `task-${index}`;
      results[taskId] = {
        status: 'completed',
        output: `Result of ${taskId}`,
        executionTime: `${Math.floor(Math.random() * 5) + 1}s`
      };
    });
    
    return results;
  }
  
  /**
   * Simulate task execution using OneAPI
   * @param {Array} tasks - Tasks to execute
   * @param {Array} executionPlan - Execution plan
   * @param {string} model - Model to use
   * @param {boolean} trackMetrics - Whether to track metrics
   * @param {string} parentTrackingId - Parent automation tracking ID
   * @param {Object} parentMetadata - Parent metadata
   * @returns {Promise<Object>} Execution results
   * @private
   */
  async _simulateExecution(tasks, executionPlan, model, trackMetrics = false, parentTrackingId = null, parentMetadata = {}) {
    if (!Array.isArray(tasks) || !Array.isArray(executionPlan)) return {};
    
    const results = {};
    let completedTasks = 0;
    let failedTasks = 0;
    
    // Sort tasks by execution order to ensure dependencies are met
    const sortedPlan = [...executionPlan].sort((a, b) => {
      return (a.executionOrder || 0) - (b.executionOrder || 0);
    });
    
    // Track overall execution if metrics are enabled
    if (trackMetrics) {
      this.oneAPI.trackEvent({
        type: 'execution_started',
        trackingId: parentTrackingId,
        metadata: {
          ...parentMetadata,
          totalTasks: executionPlan.length,
          planType: executionPlan.some(t => t.dependencies?.length > 0) ? 'dependency-based' : 'sequential'
        }
      });
    }
    
    // Determine which tasks can be executed in parallel based on dependencies
    const getReadyTasks = (completedTaskIds) => {
      return sortedPlan.filter(task => {
        // Skip already processed tasks
        if (results[task.id]) return false;
        
        // Check if all dependencies are completed
        const deps = task.dependencies || [];
        return deps.every(dep => completedTaskIds.includes(dep));
      });
    };
    
    // In a real implementation, this would actually execute the tasks
    // For now, we'll simulate execution with the LLM
    const completedTaskIds = [];
    
    // Continue until all tasks are processed
    while (completedTasks + failedTasks < executionPlan.length) {
      // Get tasks that are ready to execute
      const readyTasks = getReadyTasks(completedTaskIds);
      
      if (readyTasks.length === 0) {
        // We have a dependency cycle or invalid dependencies
        if (trackMetrics) {
          this.oneAPI.trackEvent({
            type: 'dependency_error',
            trackingId: parentTrackingId,
            error: 'Dependency cycle or invalid dependencies detected',
            metadata: {
              ...parentMetadata,
              completedTasks,
              remainingTasks: executionPlan.length - completedTasks - failedTasks,
              completedTaskIds
            }
          });
        }
        
        // Mark remaining tasks as failed
        for (const task of sortedPlan) {
          if (!results[task.id]) {
            results[task.id] = {
              status: 'failed',
              error: 'Dependency resolution error',
              output: null,
              executionTime: '0s'
            };
            failedTasks++;
          }
        }
        
        break;
      }
      
      // Process ready tasks
      for (const task of readyTasks) {
        const taskId = task.id;
        const taskStartTime = new Date();
        const taskTrackingId = `${parentTrackingId}_task_${taskId.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Track task start if metrics enabled
        if (trackMetrics) {
          this.oneAPI.trackEvent({
            type: 'task_started',
            trackingId: taskTrackingId,
            parentTrackingId,
            metadata: {
              ...parentMetadata,
              taskId,
              executionOrder: task.executionOrder,
              estimatedTime: task.estimatedTime,
              dependencies: task.dependencies || []
            }
          });
        }
        
        try {
          const taskDetails = tasks.find(t => {
            if (typeof t === 'string') return t === taskId;
            return t.id === taskId || t.name === taskId;
          });
          
          // If we have task details, we can simulate execution more accurately
          let taskDescription = '';
          let taskParams = {};
          
          if (typeof taskDetails === 'string') {
            taskDescription = taskDetails;
          } else if (taskDetails) {
            taskDescription = taskDetails.description || taskDetails.name || taskId;
            taskParams = taskDetails.parameters || {};
          } else {
            taskDescription = taskId;
          }
          
          // For demo purposes, simulate an occasional task failure
          const shouldFail = Math.random() < 0.05; // 5% chance of failure for demo
          
          if (shouldFail) {
            // Simulate task failure
            throw new Error(`Task execution failed: ${taskDescription}`);
          }
          
          // Simulate task execution using OneAPI for complex tasks
          let taskOutput = `Executed task: ${taskDescription}`;
          
          // For complex tasks, we can use OneAPI to generate a more realistic output
          if (taskDescription.includes('analyze') || taskDescription.includes('generate') || 
              taskDescription.includes('summarize') || taskDescription.includes('report')) {
            try {
              // Use OneAPI to generate a realistic output based on the task description
              const taskResponse = await this.oneAPI.createChatCompletion({
                model: model,
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful assistant that generates realistic task outputs.'
                  },
                  {
                    role: 'user',
                    content: `Generate a realistic output for this task: ${taskDescription}. Parameters: ${JSON.stringify(taskParams)}. Keep it brief (50-100 words).`
                  }
                ],
                temperature: 0.4,
                maxTokens: 150,
                metadata: trackMetrics ? {
                  trackingId: taskTrackingId,
                  parentTrackingId,
                  ...parentMetadata
                } : undefined
              });
              
              taskOutput = taskResponse.choices[0].message.content;
            } catch (generationError) {
              console.warn(`Could not generate detailed output for task ${taskId}, using default output`, generationError);
              // Fall back to default output, but don't fail the task
            }
          }
          
          // Simulate execution time - either use the estimated time or a random time
          const executionTimeValue = parseInt(task.estimatedTime) || Math.floor(Math.random() * 5) + 1;
          const executionTime = `${executionTimeValue}s`;
          const taskEndTime = new Date();
          
          // Record successful task
          results[taskId] = {
            status: 'completed',
            output: taskOutput,
            executionTime: executionTime,
            startTime: taskStartTime.toISOString(),
            endTime: taskEndTime.toISOString(),
            duration: taskEndTime - taskStartTime
          };
          
          // Track task completion if metrics enabled
          if (trackMetrics) {
            this.oneAPI.trackEvent({
              type: 'task_completed',
              trackingId: taskTrackingId,
              parentTrackingId,
              duration: taskEndTime - taskStartTime,
              metadata: {
                ...parentMetadata,
                taskId,
                executionTime,
                actualDuration: taskEndTime - taskStartTime,
                outputLength: taskOutput.length
              }
            });
          }
          
          completedTasks++;
          completedTaskIds.push(taskId);
          
        } catch (error) {
          const taskEndTime = new Date();
          
          // Record failed task
          results[taskId] = {
            status: 'failed',
            error: error.message,
            output: null,
            executionTime: `${(taskEndTime - taskStartTime) / 1000}s`,
            startTime: taskStartTime.toISOString(),
            endTime: taskEndTime.toISOString(),
            duration: taskEndTime - taskStartTime
          };
          
          // Track task failure if metrics enabled
          if (trackMetrics) {
            this.oneAPI.trackEvent({
              type: 'task_failed',
              trackingId: taskTrackingId,
              parentTrackingId,
              error: error.message,
              duration: taskEndTime - taskStartTime,
              metadata: {
                ...parentMetadata,
                taskId,
                errorType: error.name || 'TaskExecutionError',
                failureTime: taskEndTime.toISOString()
              }
            });
          }
          
          failedTasks++;
          completedTaskIds.push(taskId); // Mark as processed even though it failed
        }
      }
    }
    
    // Track execution completion if metrics enabled
    if (trackMetrics) {
      this.oneAPI.trackEvent({
        type: 'execution_completed',
        trackingId: parentTrackingId,
        metadata: {
          ...parentMetadata,
          totalTasks: executionPlan.length,
          completedTasks,
          failedTasks,
          successRate: `${(completedTasks / executionPlan.length * 100).toFixed(2)}%`
        }
      });
    }
    
    return results;
  }
}
