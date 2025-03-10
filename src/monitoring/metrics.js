/**
 * Metrics collection and monitoring system for OpenRouter SDK
 * 
 * This module provides utilities for collecting, storing, and retrieving
 * metrics about API usage, performance, and errors.
 */

// Simple in-memory metrics store
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
    
    // Set up cleanup interval
    const cleanupInterval = options.cleanupInterval || 10 * 60 * 1000; // 10 minutes
    setInterval(() => this.cleanup(), cleanupInterval);
  }
  
  /**
   * Record a new API request
   * @param {Object} data - Request data to record
   */
  recordRequest(data) {
    const timestamp = Date.now();
    
    // Basic request data
    const request = {
      id: data.requestId,
      timestamp,
      method: data.method,
      path: data.path,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      ip: data.ip,
      userAgent: data.userAgent,
      authenticated: !!data.authenticated
    };
    
    // Add to requests list with size limit
    this.requests.unshift(request);
    if (this.requests.length > this.maxSize) {
      this.requests.pop();
    }
    
    // Update endpoint stats
    this.updateEndpointStats(data.path, data.statusCode, data.responseTime);
    
    // Record model usage if applicable
    if (data.model) {
      this.updateModelStats(data.model, data.tokenUsage);
    }
    
    // Record response time
    this.responseTimes.push({
      timestamp,
      value: data.responseTime
    });
    
    // Record token usage if applicable
    if (data.tokenUsage) {
      this.tokenUsage.push({
        timestamp,
        promptTokens: data.tokenUsage.promptTokens || 0,
        completionTokens: data.tokenUsage.completionTokens || 0,
        totalTokens: data.tokenUsage.totalTokens || 0,
        model: data.model
      });
    }
    
    return request;
  }
  
  /**
   * Record an error
   * @param {Object} data - Error data to record
   */
  recordError(data) {
    const timestamp = Date.now();
    
    // Format error data
    const error = {
      id: data.requestId,
      timestamp,
      path: data.path,
      method: data.method,
      statusCode: data.statusCode,
      errorType: data.errorType,
      message: data.message,
      ip: data.ip
    };
    
    // Add to errors list with size limit
    this.errors.unshift(error);
    if (this.errors.length > this.maxSize) {
      this.errors.pop();
    }
    
    return error;
  }
  
  /**
   * Update endpoint statistics
   * @param {string} path - API endpoint path
   * @param {number} statusCode - HTTP status code
   * @param {number} responseTime - Response time in ms
   */
  updateEndpointStats(path, statusCode, responseTime) {
    if (!this.endpoints.has(path)) {
      this.endpoints.set(path, {
        count: 0,
        errors: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        statusCodes: {}
      });
    }
    
    const stats = this.endpoints.get(path);
    stats.count++;
    stats.totalTime += responseTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, responseTime);
    stats.maxTime = Math.max(stats.maxTime, responseTime);
    
    // Track status code distribution
    const statusKey = Math.floor(statusCode / 100) + 'xx';
    stats.statusCodes[statusKey] = (stats.statusCodes[statusKey] || 0) + 1;
    
    // Track error count
    if (statusCode >= 400) {
      stats.errors++;
    }
  }
  
  /**
   * Update model usage statistics
   * @param {string} model - Model identifier
   * @param {Object} tokenUsage - Token usage data
   */
  updateModelStats(model, tokenUsage = {}) {
    if (!this.models.has(model)) {
      this.models.set(model, {
        count: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      });
    }
    
    const stats = this.models.get(model);
    stats.count++;
    
    if (tokenUsage) {
      stats.promptTokens += tokenUsage.promptTokens || 0;
      stats.completionTokens += tokenUsage.completionTokens || 0;
      stats.totalTokens += tokenUsage.totalTokens || 0;
    }
  }
  
  /**
   * Clean up old metrics data based on retention period
   */
  cleanup() {
    const cutoff = Date.now() - this.retention;
    
    // Clean up requests
    this.requests = this.requests.filter(req => req.timestamp >= cutoff);
    
    // Clean up errors
    this.errors = this.errors.filter(err => err.timestamp >= cutoff);
    
    // Clean up response times
    this.responseTimes = this.responseTimes.filter(rt => rt.timestamp >= cutoff);
    
    // Clean up token usage
    this.tokenUsage = this.tokenUsage.filter(tu => tu.timestamp >= cutoff);
  }
  
  /**
   * Get summary statistics for dashboard
   * @returns {Object} Summary metrics
   */
  getSummary() {
    try {
      const now = Date.now();
      const last24h = now - (24 * 60 * 60 * 1000);
      const last1h = now - (60 * 60 * 1000);
      
      // Filter requests for different time windows
      const requests24h = this.requests.filter(req => req.timestamp >= last24h);
      const requests1h = requests24h.filter(req => req.timestamp >= last1h);
      
      // Calculate error rates
      const errors24h = this.errors.filter(err => err.timestamp >= last24h);
      const errors1h = errors24h.filter(err => err.timestamp >= last1h);
      
      // Calculate success/error ratios
      const successRate24h = requests24h.length ? 
        (requests24h.length - errors24h.length) / requests24h.length * 100 : 100;
      const successRate1h = requests1h.length ? 
        (requests1h.length - errors1h.length) / requests1h.length * 100 : 100;
      
      // Calculate performance metrics
      const responseTimes24h = this.responseTimes.filter(rt => rt.timestamp >= last24h);
      let avgResponseTime = 0;
      if (responseTimes24h.length) {
        avgResponseTime = responseTimes24h.reduce((sum, rt) => sum + rt.value, 0) / responseTimes24h.length;
      }
      
      // Get top endpoints (safely handle empty collections)
      let topEndpoints = [];
      try {
        topEndpoints = Array.from(this.endpoints.entries() || [])
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([path, stats]) => ({
            path,
            count: stats.count || 0,
            errors: stats.errors || 0,
            avgTime: stats.avgTime || 0
          }));
      } catch (e) {
        topEndpoints = [];
      }
      
      // Get top models (safely handle empty collections)
      let topModels = [];
      try {
        topModels = Array.from(this.models.entries() || [])
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([model, stats]) => ({
            model,
            count: stats.count || 0, 
            totalTokens: stats.totalTokens || 0
          }));
      } catch (e) {
        topModels = [];
      }
      
      // Get top errors (safely handle empty collections)
      let topErrors = [];
      try {
        topErrors = Array.from(this.errors || [])
          .slice(0, 5)
          .map(err => ({
            timestamp: err.timestamp || Date.now(),
            path: err.path || '',
            statusCode: err.statusCode || 500,
            errorType: err.errorType || 'UNKNOWN',
            message: err.message || 'No message'
          }));
      } catch (e) {
        topErrors = [];
      }
      
      // Calculate token usage
      const tokenUsage24h = this.tokenUsage.filter(tu => tu.timestamp >= last24h);
      const totalTokens24h = tokenUsage24h.reduce((sum, tu) => sum + (tu.totalTokens || 0), 0);
    
    return {
      timestamp: now,
      requests: {
        total: this.requests.length || 0,
        last24h: requests24h.length || 0,
        last1h: requests1h.length || 0,
        successRate24h: isNaN(successRate24h) ? 100 : successRate24h,
        successRate1h: isNaN(successRate1h) ? 100 : successRate1h
      },
      errors: {
        total: this.errors.length || 0,
        last24h: errors24h.length || 0,
        last1h: errors1h.length || 0,
        topErrors: topErrors || []
      },
      performance: {
        avgResponseTime: isNaN(avgResponseTime) ? 0 : avgResponseTime,
        topEndpoints: topEndpoints || []
      },
      models: {
        total: (this.models && this.models.size) || 0,
        topModels: topModels || []
      },
      tokens: {
        last24h: totalTokens24h || 0
      }
    };
    } catch (error) {
      // Provide fallback data in case of any error
      console.error('Error generating metrics summary:', error);
      return {
        timestamp: Date.now(),
        requests: { total: 0, last24h: 0, last1h: 0, successRate24h: 100, successRate1h: 100 },
        errors: { total: 0, last24h: 0, last1h: 0, topErrors: [] },
        performance: { avgResponseTime: 0, topEndpoints: [] },
        models: { total: 0, topModels: [] },
        tokens: { last24h: 0 }
      };
    }
  }
  
  /**
   * Get detailed metrics for a specific time range
   * @param {Object} options - Query options
   * @returns {Object} Detailed metrics
   */
  getDetailedMetrics(options = {}) {
    const {
      startTime = Date.now() - (24 * 60 * 60 * 1000),
      endTime = Date.now(),
      interval = 'hour' // 'minute', 'hour', 'day'
    } = options;
    
    // Filter by time range
    const filteredRequests = this.requests.filter(
      req => req.timestamp >= startTime && req.timestamp <= endTime
    );
    
    const filteredErrors = this.errors.filter(
      err => err.timestamp >= startTime && err.timestamp <= endTime
    );
    
    const filteredResponseTimes = this.responseTimes.filter(
      rt => rt.timestamp >= startTime && rt.timestamp <= endTime
    );
    
    // Group by interval
    const timeGroups = this.groupByTimeInterval(
      [...filteredRequests, ...filteredErrors, ...filteredResponseTimes],
      interval
    );
    
    // Calculate metrics for each time group
    const timeSeriesData = Object.entries(timeGroups).map(([timeKey, items]) => {
      const requests = items.filter(item => 'method' in item);
      const errors = items.filter(item => 'errorType' in item);
      const responseTimes = items.filter(item => 'value' in item);
      
      const avgResponseTime = responseTimes.length ?
        responseTimes.reduce((sum, rt) => sum + rt.value, 0) / responseTimes.length : 0;
      
      return {
        timeKey,
        timestamp: parseInt(timeKey),
        requestCount: requests.length,
        errorCount: errors.length,
        avgResponseTime
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    // Get error distribution by type
    const errorTypes = {};
    filteredErrors.forEach(err => {
      errorTypes[err.errorType] = (errorTypes[err.errorType] || 0) + 1;
    });
    
    return {
      timeRange: {
        startTime,
        endTime,
        interval
      },
      timeSeries: timeSeriesData,
      totals: {
        requests: filteredRequests.length,
        errors: filteredErrors.length,
        avgResponseTime: filteredResponseTimes.length ?
          filteredResponseTimes.reduce((sum, rt) => sum + rt.value, 0) / filteredResponseTimes.length : 0
      },
      errorDistribution: Object.entries(errorTypes).map(([type, count]) => ({ type, count }))
    };
  }
  
  /**
   * Group data by time interval
   * @param {Array} data - Data items with timestamp
   * @param {string} interval - Time interval ('minute', 'hour', 'day')
   * @returns {Object} Grouped data
   */
  groupByTimeInterval(data, interval) {
    const groups = {};
    
    data.forEach(item => {
      let timeKey;
      const timestamp = item.timestamp;
      const date = new Date(timestamp);
      
      switch (interval) {
        case 'minute':
          date.setSeconds(0, 0);
          timeKey = date.getTime();
          break;
        case 'hour':
          date.setMinutes(0, 0, 0);
          timeKey = date.getTime();
          break;
        case 'day':
          date.setHours(0, 0, 0, 0);
          timeKey = date.getTime();
          break;
        default:
          timeKey = timestamp;
      }
      
      if (!groups[timeKey]) {
        groups[timeKey] = [];
      }
      
      groups[timeKey].push(item);
    });
    
    return groups;
  }
}

// Create a global metrics store instance
const metrics = new MetricsStore();

export default metrics;
