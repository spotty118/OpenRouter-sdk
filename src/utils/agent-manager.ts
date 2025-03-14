/**
 * Agent management and integration system
 */
import { Logger } from './logger.js';
import { dynamicCapabilities } from './dynamic-capabilities.js';
import { socketServer } from './socket-server.js';
import { ModelCapabilities } from '../interfaces/provider-capabilities.js';
import { Agent, Task, TaskResult, TaskExecutionConfig } from '../interfaces/crew-ai.js';

interface AgentMetrics {
  successRate: number;
  latency: number;
  taskCount: number;
  errorCount: number;
  lastActivity: Date;
}

interface AgentCapabilities {
  thinking: boolean;
  toolUse: boolean;
  reasoning: boolean;
  collaboration: boolean;
  maxContextLength: number;
}

export class AgentManager {
  private logger: Logger;
  private agents: Map<string, Agent> = new Map();
  private agentMetrics: Map<string, AgentMetrics> = new Map();
  private agentCapabilities: Map<string, AgentCapabilities> = new Map();
  private static instance: AgentManager;

  private constructor() {
    this.logger = new Logger('info');
  }

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Register a new agent with the manager
   */
  registerAgent(agent: Agent, capabilities?: Partial<AgentCapabilities>): void {
    this.agents.set(agent.id, agent);
    
    // Initialize metrics
    this.agentMetrics.set(agent.id, {
      successRate: 1.0,
      latency: 0,
      taskCount: 0,
      errorCount: 0,
      lastActivity: new Date()
    });

    // Set capabilities with defaults
    this.agentCapabilities.set(agent.id, {
      thinking: capabilities?.thinking ?? true,
      toolUse: capabilities?.toolUse ?? false,
      reasoning: capabilities?.reasoning ?? true,
      collaboration: capabilities?.collaboration ?? false,
      maxContextLength: capabilities?.maxContextLength ?? 8192
    });

    // Initialize model capabilities if model is specified
    if (agent.model) {
      dynamicCapabilities.initializeModelCapabilities(
        agent.model,
        {
          vision: false,
          embeddings: true,
          imageGeneration: false,
          toolUse: capabilities?.toolUse ?? false,
          thinking: capabilities?.thinking ?? true,
          audioTranscription: false,
          maxTokens: capabilities?.maxContextLength,
          structuredOutput: true
        } as ModelCapabilities,
        {
          interval: 30000,
          threshold: 0.85
        }
      );
    }

    this.broadcastAgentStatus(agent.id);
  }

  /**
   * Execute a task with dynamic agent selection
   */
  async executeTask(
    task: Task,
    config?: TaskExecutionConfig
  ): Promise<TaskResult> {
    const startTime = Date.now();
    
    // Find best agent for task
    const agent = await this.selectAgentForTask(task);
    if (!agent) {
      throw new Error('No suitable agent found for task');
    }

    try {
      // Execute task with selected agent
      const result = await agent.execute(task, config);
      
      // Update metrics
      this.updateAgentMetrics(agent.id, true, Date.now() - startTime);
      
      // Track capabilities
      if (agent.model) {
        dynamicCapabilities.trackRequest(
          agent.model,
          'task_execution',
          true,
          Date.now() - startTime
        );
      }

      return result;

    } catch (error) {
      // Update failure metrics
      this.updateAgentMetrics(agent.id, false, Date.now() - startTime);

      // Track capability failure
      if (agent.model) {
        dynamicCapabilities.trackRequest(
          agent.model,
          'task_execution',
          false,
          Date.now() - startTime
        );
      }

      throw error;
    }
  }

  /**
   * Select best agent for a task based on capabilities and metrics
   */
  private async selectAgentForTask(task: Task): Promise<Agent | null> {
    let bestAgent: Agent | null = null;
    let bestScore = -1;

    for (const [agentId, agent] of this.agents) {
      const metrics = this.agentMetrics.get(agentId);
      const capabilities = this.agentCapabilities.get(agentId);
      
      if (!metrics || !capabilities) continue;

      // Calculate agent score based on:
      // - Success rate (40%)
      // - Required capabilities match (30%)
      // - Latency (20%)
      // - Task count experience (10%)
      let score = 0;

      // Success rate score
      score += metrics.successRate * 0.4;

      // Capabilities match score
      let capabilityScore = 0;
      if (task.requiresThinking && capabilities.thinking) capabilityScore++;
      if (task.requiresToolUse && capabilities.toolUse) capabilityScore++;
      if (task.requiresReasoning && capabilities.reasoning) capabilityScore++;
      if (task.requiresCollaboration && capabilities.collaboration) capabilityScore++;
      score += (capabilityScore / 4) * 0.3;

      // Latency score (lower is better)
      const normalizedLatency = Math.min(metrics.latency / 5000, 1);
      score += (1 - normalizedLatency) * 0.2;

      // Experience score
      const experienceScore = Math.min(metrics.taskCount / 100, 1);
      score += experienceScore * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  /**
   * Update agent metrics after task execution
   */
  private updateAgentMetrics(
    agentId: string,
    success: boolean,
    latencyMs: number
  ): void {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics) return;

    // Update metrics with exponential moving averages
    const alpha = 0.1;

    metrics.successRate = (1 - alpha) * metrics.successRate + alpha * (success ? 1 : 0);
    metrics.latency = (1 - alpha) * metrics.latency + alpha * latencyMs;
    metrics.taskCount++;
    if (!success) metrics.errorCount++;
    metrics.lastActivity = new Date();

    // Broadcast updated status
    this.broadcastAgentStatus(agentId);
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(agentId: string): AgentCapabilities | null {
    return this.agentCapabilities.get(agentId) || null;
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(agentId: string): AgentMetrics | null {
    return this.agentMetrics.get(agentId) || null;
  }

  /**
   * Get all registered agents
   */
  getAgents(): Map<string, Agent> {
    return new Map(this.agents);
  }

  /**
   * Broadcast agent status update via WebSocket
   */
  private broadcastAgentStatus(agentId: string): void {
    const metrics = this.agentMetrics.get(agentId);
    const capabilities = this.agentCapabilities.get(agentId);
    const agent = this.agents.get(agentId);

    if (!metrics || !capabilities || !agent) return;

    socketServer.broadcastModelStatus(agent.model || agentId, {
      available: metrics.successRate >= 0.8,
      requestCount: metrics.taskCount,
      tokenCount: 0,
      errorRate: 1 - metrics.successRate
    });
  }
}

// Export singleton instance
export const agentManager = AgentManager.getInstance();
