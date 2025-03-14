/**
 * Crew AI interfaces for agent and task management
 */

/**
 * Base agent interface
 */
export interface Agent {
  /**
   * Unique identifier for the agent
   */
  id: string;

  /**
   * Model identifier used by this agent
   */
  model?: string;

  /**
   * Agent name/description
   */
  name: string;

  /**
   * Execute a task
   */
  execute(task: Task, config?: TaskExecutionConfig): Promise<TaskResult>;

  /**
   * Report agent status
   */
  status(): AgentStatus;
}

/**
 * Task interface for agent execution
 */
export interface Task {
  /**
   * Unique task identifier
   */
  id: string;

  /**
   * Task description/objective
   */
  description: string;

  /**
   * Required capabilities flags
   */
  requiresThinking?: boolean;
  requiresToolUse?: boolean;
  requiresReasoning?: boolean;
  requiresCollaboration?: boolean;

  /**
   * Task input data
   */
  input?: Record<string, any>;

  /**
   * Task context/metadata
   */
  context?: Record<string, any>;
}

/**
 * Task execution configuration
 */
export interface TaskExecutionConfig {
  /**
   * Maximum execution time in milliseconds
   */
  timeout?: number;

  /**
   * Maximum number of retries
   */
  maxRetries?: number;

  /**
   * Execution strategy options
   */
  strategy?: {
    /**
     * Enable parallel subtask execution
     */
    parallel?: boolean;

    /**
     * Enable task decomposition
     */
    decompose?: boolean;

    /**
     * Enable collaborative execution
     */
    collaborative?: boolean;
  };

  /**
   * Model-specific parameters
   */
  modelParams?: Record<string, any>;
}

/**
 * Task execution result
 */
export interface TaskResult {
  /**
   * Task ID
   */
  taskId: string;

  /**
   * Execution success flag
   */
  success: boolean;

  /**
   * Result data
   */
  data?: any;

  /**
   * Error details if failed
   */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  /**
   * Execution metrics
   */
  metrics?: {
    startTime: Date;
    endTime: Date;
    tokensUsed?: number;
    retryCount?: number;
  };

  /**
   * Subtask results if decomposed
   */
  subtasks?: TaskResult[];
}

/**
 * Agent status information 
 */
export interface AgentStatus {
  /**
   * Agent availability
   */
  available: boolean;

  /**
   * Current load/utilization
   */
  load: number;

  /**
   * Active tasks
   */
  activeTasks: number;

  /**
   * Recently completed tasks
   */
  recentTasks: {
    id: string;
    status: 'success' | 'error';
    timestamp: Date;
  }[];

  /**
   * Error rate
   */
  errorRate: number;

  /**
   * Average latency
   */
  averageLatency: number;
}
