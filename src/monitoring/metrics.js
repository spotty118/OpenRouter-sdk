/**
 * Metrics collection and monitoring system for OpenRouter SDK
 * 
 * This module provides utilities for collecting, storing, and retrieving
 * metrics about API usage, performance, and errors.
 * 
 * Integrated with OneAPI for comprehensive monitoring across all services.
 */

import oneapiModule from '../oneapi.js';

/**
 * MetricsStore - A class for tracking and analyzing API usage metrics
 * Integrated with OneAPI for centralized metrics collection
 */
class MetricsStore {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.retention = options.retention || 24 * 60 * 60 * 1000; // 24 hours by default
    
    // Initialize metrics containers
    this.requests = [];
    this.errors = [];
    this.models = new Map();
    this.endpoints = new Map();
    this.responseTimes = [];
    this.tokenUsage = [];
    this.sessions = new Map();
    this.providers = new Map();
    
    // Set up cleanup interval
    const cleanupInterval = options.cleanupInterval || 10 * 60 * 1000; // 10 minutes
    setInterval(() => this.cleanup(), cleanupInterval);
    
    // Initialize OneAPI connection
    try {
      this.oneAPI = oneapiModule.getOneAPI();
      this.syncWithOneAPI();
      
      // Set up metrics sync interval if enabled
      if (options.syncWithOneAPI !== false) {
        const syncInterval = options.syncInterval || 5 * 60 * 1000; // 5 minutes
        setInterval(() => this.syncWithOneAPI(), syncInterval);
      }
    } catch (error) {
      console.warn('OneAPI not available for metrics, using local tracking only:', error);
      this.oneAPI = null;
    }
  }

  /**
   * Record a new API request
   * @param {Object} data - Request data
   */
  recordRequest(data) {
    // Ensure we have all necessary data
    if (!data) return;
    
    const timestamp = Date.now();
    const request = {
      timestamp,
      ...data
    };
    
    // Store request data
    this.requests.push(request);
    
    // Track by model
    if (data.model) {
      this.trackModelUsage(data.model, data.provider, data.tokenUsage);
    }
    
    // Track by provider
    if (data.provider) {
      this.updateProviderStats(
        data.provider, 
        data.status || 200, 
        data.responseTime || 0, 
        data.tokenUsage
      );
    }
    
    // Track by endpoint
    if (data.endpoint) {
      this.trackEndpointUsage(data.endpoint);
    }
    
    // Track by session
    if (data.sessionId) {
      this.updateSessionStats(
        data.sessionId, 
        data.agentType, 
        data.model, 
        data.tokenUsage
      );
    }
    
    // Track response time
    if (data.responseTime) {
      this.responseTimes.push({
        timestamp,
        responseTime: data.responseTime,
        endpoint: data.endpoint,
        provider: data.provider,
        model: data.model
      });
    }
    
    // Track token usage
    if (data.tokenUsage) {
      this.tokenUsage.push({
        timestamp,
        ...data.tokenUsage,
        provider: data.provider,
        model: data.model
      });
    }
    
    // Keep data within size limits
    this.cleanup();
    
    // Send metrics to OneAPI if available
    if (this.oneAPI) {
      try {
        this.oneAPI.reportMetrics({
          timestamp,
          ...data
        });
      } catch (error) {
        console.warn('Failed to report metrics to OneAPI:', error);
      }
    }
  }
  
  /**
   * Record an error event
   * @param {Object} data - Error data
   */
  recordError(data) {
    if (!data) return;
    
    const timestamp = Date.now();
    const error = {
      timestamp,
      ...data
    };
    
    // Store error data
    this.errors.push(error);
    
    // Keep data within size limits
    if (this.errors.length > this.maxSize) {
      this.errors = this.errors.slice(-Math.floor(this.maxSize / 2));
    }
    
    // Report to OneAPI if available
    if (this.oneAPI) {
      try {
        this.oneAPI.reportError({
          timestamp,
          ...data
        });
      } catch (e) {
        console.warn('Failed to report error to OneAPI:', e);
      }
    }
  }
  
  /**
   * Track model usage statistics
   * @param {string} model - Model identifier
   * @param {string} provider - Provider identifier
   * @param {Object} tokenUsage - Token usage data
   */
  trackModelUsage(model, provider, tokenUsage = {}) {
    if (!this.models.has(model)) {
      this.models.set(model, {
        count: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        provider: provider || 'unknown',
        providerUsage: {}
      });
    }
    
    const stats = this.models.get(model);
    stats.count++;
    
    // Track token usage
    if (tokenUsage) {
      stats.promptTokens += tokenUsage.promptTokens || 0;
      stats.completionTokens += tokenUsage.completionTokens || 0;
      stats.totalTokens += tokenUsage.totalTokens || 0;
    }
    
    // Track usage by provider
    if (provider) {
      if (!stats.providerUsage[provider]) {
        stats.providerUsage[provider] = {
          count: 0,
          tokens: 0
        };
      }
      
      stats.providerUsage[provider].count++;
      
      if (tokenUsage && tokenUsage.totalTokens) {
        stats.providerUsage[provider].tokens += tokenUsage.totalTokens;
      }
    }
  }
  
  /**
   * Track endpoint usage statistics
   * @param {string} endpoint - Endpoint identifier
   */
  trackEndpointUsage(endpoint) {
    if (!this.endpoints.has(endpoint)) {
      this.endpoints.set(endpoint, {
        count: 0,
        lastUsed: Date.now()
      });
    }
    
    const stats = this.endpoints.get(endpoint);
    stats.count++;
    stats.lastUsed = Date.now();
  }
  
  /**
   * Update provider usage statistics
   * @param {string} provider - Provider identifier
   * @param {number} statusCode - HTTP status code
   * @param {number} responseTime - Response time in ms
   * @param {Object} tokenUsage - Token usage data
   */
  updateProviderStats(provider, statusCode = 200, responseTime = 0, tokenUsage = {}) {
    if (!this.providers.has(provider)) {
      this.providers.set(provider, {
        count: 0,
        errors: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        statusCodes: {}
      });
    }
    
    const stats = this.providers.get(provider);
    stats.count++;
    
    // Track response time
    stats.totalResponseTime += responseTime;
    stats.avgResponseTime = stats.totalResponseTime / stats.count;
    
    // Track status code distribution
    const statusKey = Math.floor(statusCode / 100) + 'xx';
    stats.statusCodes[statusKey] = (stats.statusCodes[statusKey] || 0) + 1;
    
    // Track error count
    if (statusCode >= 400) {
      stats.errors++;
    }
    
    // Track token usage
    if (tokenUsage) {
      stats.promptTokens += tokenUsage.promptTokens || 0;
      stats.completionTokens += tokenUsage.completionTokens || 0;
      stats.totalTokens += tokenUsage.totalTokens || 0;
    }
  }
  
  /**
   * Update session statistics
   * @param {string} sessionId - Session identifier
   * @param {string} agentType - Type of agent used
   * @param {string} model - Model identifier
   * @param {Object} tokenUsage - Token usage data
   */
  updateSessionStats(sessionId, agentType = null, model = null, tokenUsage = {}) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        lastActive: Date.now(),
        firstActive: Date.now(),
        requestCount: 0,
        totalTokens: 0,
        models: [],
        agents: [],
        tokenHistory: []
      });
    }
    
    const session = this.sessions.get(sessionId);
    session.lastActive = Date.now();
    session.requestCount++;
    
    // Track token usage
    if (tokenUsage) {
      const totalTokens = tokenUsage.totalTokens || 0;
      session.totalTokens += totalTokens;
      
      // Add to token history
      session.tokenHistory.push({
        timestamp: Date.now(),
        tokens: totalTokens,
        model: model
      });
      
      // Keep token history at reasonable size
      if (session.tokenHistory.length > 100) {
        session.tokenHistory.shift();
      }
    }
    
    // Track models used
    if (model && !session.models.includes(model)) {
      session.models.push(model);
    }
    
    // Track agent types used
    if (agentType && !session.agents.includes(agentType)) {
      session.agents.push(agentType);
    }
  }
  
  /**
   * Clean up old data to maintain size limits
   */
  cleanup() {
    const now = Date.now();
    
    // Clean up requests data
    if (this.requests.length > this.maxSize) {
      this.requests = this.requests.slice(-Math.floor(this.maxSize / 2));
    }
    
    // Clean up old response times
    if (this.responseTimes.length > this.maxSize) {
      this.responseTimes = this.responseTimes.slice(-Math.floor(this.maxSize / 2));
    }
    
    // Clean up old token usage data
    if (this.tokenUsage.length > this.maxSize) {
      this.tokenUsage = this.tokenUsage.slice(-Math.floor(this.maxSize / 2));
    }
    
    // Clean up old sessions
    this.sessions.forEach((session, id) => {
      if (now - session.lastActive > this.retention) {
        this.sessions.delete(id);
      }
    });
  }
  
  /**
   * Synchronize with OneAPI metrics
   */
  async syncWithOneAPI() {
    if (!this.oneAPI) return;
    
    try {
      // Get metrics from OneAPI
      const oneApiMetrics = await this.oneAPI.getMetrics({
        timeframe: 'day'
      });
      
      if (!oneApiMetrics || !oneApiMetrics.data) return;
      
      // Process and merge provider metrics
      if (oneApiMetrics.data.providers) {
        for (const [provider, data] of Object.entries(oneApiMetrics.data.providers)) {
          if (!this.providers.has(provider)) {
            this.providers.set(provider, {
              count: 0,
              errors: 0,
              totalTokens: 0,
              totalResponseTime: 0,
              avgResponseTime: 0,
              statusCodes: {}
            });
          }
          
          const localStats = this.providers.get(provider);
          const remoteStats = data;
          
          // Merge remote metrics with local ones
          if (remoteStats.count > localStats.count) {
            localStats.count = remoteStats.count;
            localStats.errors = remoteStats.errors || 0;
            localStats.totalTokens = remoteStats.totalTokens || 0;
            
            if (remoteStats.responseTime) {
              localStats.avgResponseTime = remoteStats.responseTime.avg || 0;
              localStats.totalResponseTime = localStats.avgResponseTime * localStats.count;
            }
          }
        }
      }
      
      // Process and merge model metrics
      if (oneApiMetrics.data.models) {
        for (const [model, data] of Object.entries(oneApiMetrics.data.models)) {
          if (!this.models.has(model)) {
            this.models.set(model, {
              count: 0,
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              provider: data.provider || 'unknown',
              providerUsage: {}
            });
          }
          
          const localStats = this.models.get(model);
          const remoteStats = data;
          
          // Merge remote metrics with local ones if they have more data
          if (remoteStats.count > localStats.count) {
            localStats.count = remoteStats.count;
            localStats.promptTokens = remoteStats.promptTokens || 0;
            localStats.completionTokens = remoteStats.completionTokens || 0;
            localStats.totalTokens = remoteStats.totalTokens || 0;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing with OneAPI metrics:', error);
    }
  }
  
  /**
   * Get all session data
   * @returns {Array} Array of session objects
   */
  getSessions() {
    return Array.from(this.sessions.values()).map((session, index) => {
      return {
        id: Array.from(this.sessions.keys())[index],
        ...session
      };
    });
  }
  
  /**
   * Get all provider statistics
   * @returns {Array} Array of provider stats objects
   */
  getProviders() {
    return Array.from(this.providers.entries()).map(([provider, stats]) => {
      return {
        provider,
        ...stats
      };
    });
  }
  
  /**
   * Get model usage statistics
   * @returns {Array} Array of model stats objects
   */
  getModels() {
    return Array.from(this.models.entries()).map(([model, stats]) => {
      return {
        model,
        ...stats
      };
    });
  }
  
  /**
   * Get endpoint usage statistics
   * @returns {Array} Array of endpoint stats objects
   */
  getEndpoints() {
    return Array.from(this.endpoints.entries()).map(([endpoint, stats]) => {
      return {
        endpoint,
        ...stats
      };
    });
  }
}

// Create a global metrics store instance
const metrics = new MetricsStore();

export default metrics;
