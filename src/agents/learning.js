/**
 * Learning Agent for OpenRouter SDK
 * 
 * This agent learns from interactions and improves over time using OneAPI.
 */

import oneapiModule from '../oneapi.js';

export class LearningAgent {
  constructor() {
    this.name = 'Learning Agent';
    this.description = 'AI Agent that learns from interactions and improves over time';
    this.feedbackStore = new Map(); // Store feedback for learning
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
    this.defaultModel = 'openai/gpt-4-turbo'; // Advanced model for learning tasks
  }

  /**
   * Execute a learning-based task
   * @param {Object} options - Learning options
   * @param {string} options.input - Input data or query
   * @param {string} options.feedback - Previous interaction feedback
   * @param {string} options.modelPath - Path to trained model
   * @returns {Promise<Object>} Learning agent results
   */
  async execute({ 
    input, 
    feedback = '', 
    modelPath = '',
    model,
    temperature = 0.4,
    maxTokens = 1000,
    sessionId = null
  }) {
    console.log(`Processing learning agent input with ${feedback ? 'feedback' : 'no feedback'}`);
    
    try {
      // Use OneAPI for learning tasks
      const useModel = model || this.defaultModel;
      
      // Apply feedback if provided
      if (feedback) {
        this._applyFeedback(input, feedback);
      }
      
      // Get feedback history for context
      const feedbackHistory = this._getFeedbackHistory();
      
      // Build system prompt with learning context
      const systemPrompt = `You are an advanced learning assistant that improves with feedback.
      You've received ${this.feedbackStore.size} pieces of feedback so far, which has shaped your responses.
      ${feedbackHistory.length > 0 ? 'Here is some recent feedback you\'ve learned from:\n' + feedbackHistory.join('\n') : ''}
      Respond thoughtfully to the user's input, applying what you've learned from previous feedback.`;
      
      // Construct messages for LLM
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: input
        }
      ];
      
      // Get response from OneAPI
      const response = await this.oneAPI.createChatCompletion({
        model: useModel,
        messages,
        temperature,
        maxTokens
      });
      
      // Extract the content
      const assistantResponse = response.choices[0].message.content;
      
      // Store session ID for future feedback
      if (sessionId) {
        this._storeSession(sessionId, input, assistantResponse);
      }
      
      // Calculate confidence score based on feedback history
      const confidence = this._calculateConfidence(input);
      
      return {
        input,
        response: assistantResponse,
        confidence: confidence,
        modelInfo: { 
          name: useModel,
          path: modelPath || 'oneapi-model'
        },
        learningProgress: this._getLearningProgress(),
        timestamp: new Date().toISOString(),
        usage: response.usage
      };
    } catch (error) {
      console.error('Learning agent error:', error);
      throw new Error(`Learning agent failed: ${error.message}`);
    }
  }

  /**
   * Apply feedback to improve the agent
   * @private
   */
  _applyFeedback(input, feedback) {
    // Store feedback for this input with timestamp
    this.feedbackStore.set(input, {
      feedback: feedback,
      timestamp: new Date().toISOString()
    });
    
    // In a real implementation, this would update the model based on feedback
    console.log(`Applied feedback for input: "${input}"`);
  }
  
  /**
   * Store session information for future feedback
   * @private
   */
  _storeSession(sessionId, input, response) {
    // Store the session data in a way that can be referenced later
    const sessionData = {
      input,
      response,
      timestamp: new Date().toISOString()
    };
    
    // Use a sessionStore to track sessions (could be expanded in a real implementation)
    if (!this.sessionStore) {
      this.sessionStore = new Map();
    }
    
    this.sessionStore.set(sessionId, sessionData);
  }
  
  /**
   * Get formatted feedback history for context
   * @private
   */
  _getFeedbackHistory() {
    // Convert feedback store to array and sort by timestamp
    const feedbackEntries = Array.from(this.feedbackStore.entries())
      .map(([input, data]) => ({
        input, 
        feedback: typeof data === 'string' ? data : data.feedback,
        timestamp: typeof data === 'string' ? new Date(0).toISOString() : data.timestamp
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Take only the 5 most recent feedback items
    return feedbackEntries.slice(0, 5).map(entry => 
      `Input: "${entry.input}"\nFeedback: ${entry.feedback}`
    );
  }
  
  /**
   * Calculate confidence based on similar inputs
   * @private
   */
  _calculateConfidence(input) {
    // Base confidence level
    let confidence = 0.7;
    
    // Increase confidence based on feedback store size
    confidence += Math.min(0.2, this.feedbackStore.size * 0.01);
    
    // In a more advanced implementation, we would:  
    // 1. Use embeddings to find similar previous inputs
    // 2. Adjust confidence based on the similarity and positive feedback
    
    return Math.min(0.98, confidence);
  }

  /**
   * Get current learning progress information
   * @private
   */
  _getLearningProgress() {
    // Calculate metrics based on feedback
    const feedbackCount = this.feedbackStore.size;
    
    // In a real implementation, we would analyze feedback quality
    // and calculate actual improvements
    return {
      trainedExamples: feedbackCount,
      positiveExamples: Math.floor(feedbackCount * 0.7), // Mock positive feedback ratio
      accuracy: Math.min(0.98, 0.78 + (feedbackCount * 0.01)), // Mock improvement with more feedback
      lastTrainingDate: new Date().toISOString(),
      estimatedImprovement: `${Math.min(95, feedbackCount * 5)}%`
    };
  }
  
  /**
   * Reset the learning progress
   */
  reset() {
    this.feedbackStore.clear();
    return { status: 'reset', timestamp: new Date().toISOString() };
  }
}
