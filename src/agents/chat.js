/**
 * Chat Agent for OpenRouter SDK
 * 
 * This agent maintains context and engages in conversation with users through OneAPI.
 * Enhanced with comprehensive metrics tracking and improved error handling.
 */

import oneapiModule from '../oneapi.js';

export class ChatAgent {
  constructor(config = {}) {
    this.name = 'Chat Agent';
    this.description = 'AI Agent that maintains context and engages in conversation';
    this.conversationHistory = new Map(); // Map to store conversation contexts
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
    this.defaultModel = config.defaultModel || 'openai/gpt-3.5-turbo';
    this.fallbackModels = config.fallbackModels || ['anthropic/claude-instant-1', 'google/gemini-pro'];
    this.metricsEnabled = config.trackMetrics !== false; // Enable metrics by default
    this.metadata = {
      agentType: 'chat',
      version: '1.1.0',
      capabilities: ['conversation', 'context-tracking']
    };
  }

  /**
   * Execute a chat interaction
   * @param {Object} options - Chat options
   * @param {string} options.message - User message
   * @param {string} options.context - Previous conversation context
   * @param {string} options.personality - Agent personality type
   * @param {string} options.model - LLM model to use (with provider prefix)
   * @param {number} options.temperature - Temperature for response generation
   * @param {number} options.maxTokens - Maximum tokens for response
   * @param {boolean} options.stream - Whether to stream the response
   * @param {string} options.sessionId - Optional session identifier for conversation tracking
   * @param {boolean} options.trackMetrics - Whether to track metrics for this interaction
   * @param {Object} options.metadata - Additional metadata for metrics tracking
   * @returns {Promise<Object>} Chat response
   */
  async execute({ 
    message, 
    context = '', 
    personality = 'helpful', 
    model, 
    temperature = 0.7, 
    maxTokens = 1000,
    stream = false,
    sessionId = null,
    trackMetrics = this.metricsEnabled,
    metadata = {}
  }) {
    console.log(`Processing chat message with personality: ${personality}`);
    
    // Generate tracking ID for this interaction
    const trackingId = sessionId || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const startTime = new Date();
    
    // Combine metadata
    const combinedMetadata = {
      ...this.metadata,
      ...metadata,
      personality,
      sessionId,
      temperature,
      maxTokens
    };
    
    try {
      // Set model with fallback to default
      let useModel = model || this.defaultModel;
      
      // Parse context into messages if available
      let messages = [];
      if (context) {
        // Try to parse context into a messages array
        try {
          if (typeof context === 'string') {
            // Split context by newlines and map to messages
            const contextLines = context.split('\n');
            for (let i = 0; i < contextLines.length; i++) {
              const line = contextLines[i];
              if (line.startsWith('User: ')) {
                messages.push({
                  role: 'user',
                  content: line.substring(6)
                });
              } else if (line.startsWith('Assistant: ')) {
                messages.push({
                  role: 'assistant',
                  content: line.substring(11)
                });
              } else if (line.startsWith('System: ')) {
                messages.push({
                  role: 'system',
                  content: line.substring(8)
                });
              }
            }
          } else if (Array.isArray(context)) {
            // Context is already a messages array
            messages = context;
          }
        } catch (e) {
          console.warn('Failed to parse context into messages:', e);
          // Fall back to empty messages array
          messages = [];
        }
      }
      
      // Add system message with personality if no system message exists
      if (!messages.some(m => m.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: `You are a ${personality} assistant that provides accurate and helpful responses.`
        });
      }
      
      // Add the current message
      messages.push({
        role: 'user',
        content: message
      });
      
      // Start OneAPI metric tracking for this interaction
      if (trackMetrics && this.oneAPI && this.oneAPI.trackMetric) {
        this.oneAPI.trackMetric({
          type: 'chat_start',
          provider: useModel.split('/')[0],
          model: useModel,
          trackingId,
          metadata: combinedMetadata,
          status: 'start'
        });
      }
      
      // Get response from OneAPI with fallback handling
      let response;
      let attemptedModels = [];
      let lastError = null;
      
      // Try primary model first, then fallbacks if needed
      const modelsToTry = [useModel, ...this.fallbackModels];
      
      for (const modelToTry of modelsToTry) {
        try {
          attemptedModels.push(modelToTry);
          
          if (stream) {
            response = await this.oneAPI.createChatCompletionStream({
              model: modelToTry,
              messages,
              temperature,
              maxTokens,
              metadata: trackMetrics ? {
                trackingId,
                ...combinedMetadata
              } : undefined
            });
            
            // For streaming, return the stream directly with tracking info
            if (trackMetrics && this.oneAPI && this.oneAPI.trackMetric) {
              this.oneAPI.trackMetric({
                type: 'chat_stream',
                provider: modelToTry.split('/')[0],
                model: modelToTry,
                trackingId,
                status: 'success',
                metadata: {
                  ...combinedMetadata,
                  attemptedModels,
                  usedFallback: attemptedModels.length > 1
                }
              });
            }
            
            return {
              stream: response,
              messages,
              model: modelToTry,
              personality,
              timestamp: new Date().toISOString(),
              trackingId: trackMetrics ? trackingId : undefined,
              fallback: attemptedModels.length > 1 ? attemptedModels : undefined
            };
          } else {
            response = await this.oneAPI.createChatCompletion({
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
          }
        } catch (error) {
          lastError = error;
          console.warn(`Model ${modelToTry} failed, trying next fallback if available`, error);
          
          // If this is the last model to try, throw the error
          if (modelToTry === modelsToTry[modelsToTry.length - 1]) {
            if (trackMetrics && this.oneAPI && this.oneAPI.trackMetric) {
              this.oneAPI.trackMetric({
                type: 'chat_error',
                provider: modelToTry.split('/')[0],
                model: modelToTry,
                trackingId,
                status: 'error',
                error: {
                  message: error.message,
                  code: error.code || 'unknown'
                },
                metadata: {
                  ...combinedMetadata,
                  attemptedModels,
                  failedAllModels: true
                }
              });
            }
            throw error;
          }
          // Otherwise continue to the next model
        }
      }
      
      // Extract the assistant's message
      const assistantMessage = response.choices[0].message.content;
      
      // Add the response to messages
      messages.push({
        role: 'assistant',
        content: assistantMessage
      });
      
      // Convert messages back to context format if needed
      const newContext = messages.map(m => {
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') return `Assistant: ${m.content}`;
        if (m.role === 'system') return `System: ${m.content}`;
        return `${m.role.charAt(0).toUpperCase() + m.role.slice(1)}: ${m.content}`;
      }).join('\n');
      
      // Store conversation history if sessionId provided
      if (sessionId) {
        this.conversationHistory.set(sessionId, messages);
      }
      
      // Finalize metrics if tracking is enabled
      if (trackMetrics && this.oneAPI && this.oneAPI.trackMetric) {
        const endTime = new Date();
        const duration = endTime - startTime;
        const finalModel = attemptedModels[attemptedModels.length - 1];
        
        this.oneAPI.trackMetric({
          type: 'chat_completion',
          provider: finalModel.split('/')[0],
          model: finalModel,
          trackingId,
          status: 'success',
          processingTime: duration,
          tokenUsage: {
            input: response.usage?.prompt_tokens || 0,
            output: response.usage?.completion_tokens || 0
          },
          metadata: {
            ...combinedMetadata,
            attemptedModels,
            usedFallback: attemptedModels.length > 1,
            finalModel
          }
        });
      }
      
      return {
        message: assistantMessage,
        context: newContext,
        messages,
        model: attemptedModels[attemptedModels.length - 1],
        personality,
        timestamp: new Date().toISOString(),
        usage: response.usage,
        trackingId: trackMetrics ? trackingId : undefined,
        fallback: attemptedModels.length > 1 ? attemptedModels : undefined,
        duration: new Date() - startTime
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime - startTime;
      
      // Record error metrics if tracking is enabled
      if (trackMetrics && this.oneAPI && this.oneAPI.trackMetric) {
        this.oneAPI.trackMetric({
          type: 'chat_error',
          provider: (attemptedModels && attemptedModels.length > 0) ? 
            attemptedModels[attemptedModels.length - 1].split('/')[0] : 
            useModel.split('/')[0],
          model: (attemptedModels && attemptedModels.length > 0) ? 
            attemptedModels[attemptedModels.length - 1] : 
            useModel,
          trackingId,
          status: 'error',
          processingTime: duration,
          error: {
            message: error.message,
            code: error.code || 'unknown'
          },
          metadata: {
            ...combinedMetadata,
            attemptedModels: attemptedModels || [useModel]
          }
        });
      }
      
      console.error('Chat agent error:', error);
      throw new Error(`Chat processing failed: ${error.message}`);
    }
  }

  /**
   * Clear conversation history for a specific session
   * @param {string} sessionId - Session identifier
   * @param {boolean} trackMetrics - Whether to track this operation
   * @returns {boolean} Success status
   */
  clearConversation(sessionId, trackMetrics = this.metricsEnabled) {
    if (this.conversationHistory.has(sessionId)) {
      // Track operation if enabled
      if (trackMetrics && this.oneAPI && this.oneAPI.trackMetric) {
        this.oneAPI.trackMetric({
          type: 'conversation_cleared',
          status: 'success',
          metadata: {
            sessionId,
            messageCount: this.conversationHistory.get(sessionId).length,
            ...this.metadata
          }
        });
      }
      
      this.conversationHistory.delete(sessionId);
      return true;
    }
    return false;
  }
  
  /**
   * Get metrics for this chat agent
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for metrics
   * @param {Date} options.endDate - End date for metrics
   * @param {string} options.model - Filter by model
   * @param {string} options.sessionId - Filter by session ID
   * @returns {Promise<Object>} Metrics data
   */
  async getMetrics(options = {}) {
    if (this.oneAPI && this.oneAPI.getMetrics) {
      return this.oneAPI.getMetrics();
    }
    return {
      totalRequests: 0,
      operations: []
    };
  }
}
