/**
 * Dynamic capability detection and routing system
 */
import { ModelCapabilities, ProviderCapabilities } from '../interfaces/provider-capabilities.js';
import { CompletionRequest } from '../interfaces/requests.js';
import { Logger } from './logger.js';
import { socketServer } from './socket-server.js';

interface CapabilityMetrics {
  successRate: number;
  averageLatency: number;
  lastChecked: Date;
  errorCount: number;
  totalRequests: number;
}

interface HealthCheckOptions {
  interval: number;  // Health check interval in milliseconds
  threshold: number; // Error threshold before capability degradation
  timeout: number;   // Health check timeout in milliseconds
}

export class DynamicCapabilityManager {
  private logger: Logger;
  private capabilityMetrics: Map<string, Map<string, CapabilityMetrics>> = new Map();
  private modelHealthChecks: Map<string, NodeJS.Timeout> = new Map();
  private static instance: DynamicCapabilityManager;

  private constructor() {
    this.logger = new Logger('info');
  }

  static getInstance(): DynamicCapabilityManager {
    if (!DynamicCapabilityManager.instance) {
      DynamicCapabilityManager.instance = new DynamicCapabilityManager();
    }
    return DynamicCapabilityManager.instance;
  }

  /**
   * Initialize capability monitoring for a model
   */
  initializeModelCapabilities(
    modelId: string, 
    capabilities: ModelCapabilities,
    healthCheckOptions?: Partial<HealthCheckOptions>
  ): void {
    const options: HealthCheckOptions = {
      interval: healthCheckOptions?.interval || 60000,  // Default: 1 minute
      threshold: healthCheckOptions?.threshold || 0.8,  // Default: 80% success rate
      timeout: healthCheckOptions?.timeout || 5000      // Default: 5 seconds
    };

    // Initialize metrics for each capability
    const metrics = new Map<string, CapabilityMetrics>();
    Object.keys(capabilities).forEach(capability => {
      metrics.set(capability, {
        successRate: 1.0,
        averageLatency: 0,
        lastChecked: new Date(),
        errorCount: 0,
        totalRequests: 0
      });
    });

    this.capabilityMetrics.set(modelId, metrics);

    // Start health check
    this.startHealthCheck(modelId, options);
  }

  /**
   * Start periodic health checks for a model
   */
  private startHealthCheck(modelId: string, options: HealthCheckOptions): void {
    const healthCheck = setInterval(async () => {
      const metrics = this.capabilityMetrics.get(modelId);
      if (!metrics) return;

      try {
        const status = {
          available: true,
          requestCount: 0,
          tokenCount: 0,
          errorRate: 0
        };

        metrics.forEach((capMetrics, capability) => {
          // Check if capability should be degraded
          if (capMetrics.successRate < options.threshold) {
            this.logger.warn(
              `${modelId}: ${capability} degraded (success rate: ${capMetrics.successRate})`
            );
            status.errorRate = 1 - capMetrics.successRate;
          }

          status.requestCount += capMetrics.totalRequests;
        });

        // Broadcast status update
        socketServer.broadcastModelStatus(modelId, status);

      } catch (error) {
        this.logger.error(`Health check failed for ${modelId}:`, error);
      }
    }, options.interval);

    this.modelHealthChecks.set(modelId, healthCheck);
  }

  /**
   * Track request result for capability metrics
   */
  trackRequest(
    modelId: string,
    capability: string,
    success: boolean,
    latencyMs: number
  ): void {
    const metrics = this.capabilityMetrics.get(modelId)?.get(capability);
    if (!metrics) return;

    metrics.totalRequests++;
    if (!success) metrics.errorCount++;

    // Update success rate with exponential moving average
    const alpha = 0.1; // Smoothing factor
    metrics.successRate = (1 - alpha) * metrics.successRate + 
                         alpha * (success ? 1 : 0);

    // Update average latency
    metrics.averageLatency = (metrics.averageLatency * (metrics.totalRequests - 1) + 
                            latencyMs) / metrics.totalRequests;

    metrics.lastChecked = new Date();

    // Broadcast metrics update
    socketServer.broadcastMetrics({
      requestsPerMinute: metrics.totalRequests,
      tokensPerMinute: 0, // Would need to track token usage separately
      averageLatency: metrics.averageLatency,
      errorRate: 1 - metrics.successRate
    });
  }

  /**
   * Get current capabilities with runtime metrics
   */
  getCapabilitiesWithMetrics(modelId: string): {
    capabilities: ModelCapabilities;
    metrics: Map<string, CapabilityMetrics>;
  } | null {
    const metrics = this.capabilityMetrics.get(modelId);
    if (!metrics) return null;

    const capabilities: ModelCapabilities = {
      vision: false,
      embeddings: false,
      imageGeneration: false,
      toolUse: false,
      thinking: false,
      audioTranscription: false,
      maxTokens: undefined,
      structuredOutput: false
    };
    
    metrics.forEach((capMetrics, capability) => {
      if (capability in capabilities) {
        // Only set if it's a valid capability
        (capabilities as any)[capability] = capMetrics.successRate >= 0.8;
      }
    });

    return {
      capabilities,
      metrics
    };
  }

  /**
   * Check if a specific capability is currently available
   */
  isCapabilityAvailable(
    modelId: string,
    capability: keyof ModelCapabilities
  ): boolean {
    const metrics = this.capabilityMetrics.get(modelId)?.get(capability);
    if (!metrics) return false;

    return metrics.successRate >= 0.8;
  }

  /**
   * Get optimal model for a request based on capabilities and metrics
   */
  findOptimalModel(
    request: CompletionRequest,
    availableModels: string[]
  ): string | null {
    let bestModel = null;
    let bestScore = -1;

    for (const modelId of availableModels) {
      const status = this.getCapabilitiesWithMetrics(modelId);
      if (!status) continue;

      // Calculate score based on capabilities and metrics
      let score = 0;
      
      // Check required capabilities
      if (request.stream && !status.capabilities.toolUse) continue; // toolUse includes streaming
      if (request.response_format && !status.capabilities.structuredOutput) continue;

      // Add points for performance metrics
      status.metrics.forEach((metrics) => {
        score += metrics.successRate * 0.4;  // 40% weight for reliability
        score += (1 - (metrics.averageLatency / 5000)) * 0.3;  // 30% weight for speed
        score += (metrics.totalRequests > 0 ? 0.3 : 0);  // 30% weight for proven usage
      });

      if (score > bestScore) {
        bestScore = score;
        bestModel = modelId;
      }
    }

    return bestModel;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.modelHealthChecks.forEach((interval) => {
      clearInterval(interval);
    });
    this.modelHealthChecks.clear();
    this.capabilityMetrics.clear();
  }
}

// Export singleton instance
export const dynamicCapabilities = DynamicCapabilityManager.getInstance();
