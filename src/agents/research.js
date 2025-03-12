/**
 * Research Agent for OpenRouter SDK
 * 
 * This agent performs web research on specified topics and returns
 * structured information based on the requested depth and format.
 * Uses OneAPI for powerful language model capabilities with enhanced
 * metrics tracking and improved error handling.
 */

import oneapiModule from '../oneapi.js';

export class ResearchAgent {
  constructor(config = {}) {
    this.name = 'Research Agent';
    this.description = 'AI Agent that performs web research on a given topic';
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
    this.defaultModel = config.defaultModel || 'openai/gpt-4-turbo'; // More powerful model for research
    this.fallbackModels = config.fallbackModels || ['anthropic/claude-3-opus', 'google/gemini-pro'];
    this.metricsEnabled = config.trackMetrics !== false; // Enable metrics by default
    this.metadata = {
      agentType: 'research',
      version: '1.1.0',
      capabilities: ['web-research', 'source-extraction', 'information-synthesis']
    };
  }

  /**
   * Execute a research task
   * @param {Object} options - Research options
   * @param {string} options.topic - Research topic to investigate
   * @param {number} options.depth - Research depth (1-5)
   * @param {string} options.format - Output format (summary/detailed/bullet)
   * @param {string} options.model - LLM model to use
   * @param {number} options.temperature - Temperature for generation
   * @param {number} options.maxTokens - Maximum tokens for response
   * @param {Array} options.searchResults - Optional search results to use as context
   * @param {boolean} options.trackMetrics - Whether to track metrics for this research task
   * @param {Object} options.metadata - Additional metadata for metrics tracking
   * @returns {Promise<Object>} Research results
   */
  async execute({ 
    topic, 
    depth = 3, 
    format = 'summary',
    model,
    temperature = 0.3,
    maxTokens = 2000,
    searchResults = null,
    trackMetrics = this.metricsEnabled,
    metadata = {}
  }) {
    console.log(`Researching topic: ${topic} with depth ${depth} and format ${format}`);
    
    // Generate tracking ID for this research task
    const trackingId = `research_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const startTime = new Date();
    
    // Combine metadata
    const combinedMetadata = {
      ...this.metadata,
      ...metadata,
      topic,
      depth,
      format,
      temperature,
      maxTokens,
      hasSearchResults: searchResults ? true : false,
      searchResultCount: searchResults ? searchResults.length : 0
    };
    
    // Normalize parameters
    const normalizedDepth = Math.min(Math.max(1, depth), 5);
    const normalizedFormat = ['summary', 'detailed', 'bullet'].includes(format) 
      ? format 
      : 'summary';
    const useModel = model || this.defaultModel;
    
    try {
      // Start OneAPI metric tracking for this research task
      if (trackMetrics) {
        this.oneAPI.startMetric({
          type: 'research',
          model: useModel,
          trackingId,
          metadata: combinedMetadata
        });
      }
      
      // Construct prompt based on task parameters
      const systemPrompt = `You are a research assistant with expertise in synthesizing information. 
      Conduct research on the given topic, providing ${normalizedFormat} information at a depth level of ${normalizedDepth}/5.
      Provide ${normalizedDepth >= 4 ? 'comprehensive' : 'concise'} information.
      Format your response as ${format === 'bullet' ? 'bullet points' : format === 'detailed' ? 'detailed paragraphs with sections' : 'a brief summary'}.
      Include key facts, relevant context, and maintain a neutral, informative tone.
      ${normalizedDepth >= 3 ? 'Suggest questions for further research.' : ''}`;
      
      // Prepare search context if provided
      let searchContext = '';
      if (searchResults && Array.isArray(searchResults)) {
        searchContext = 'Search results found:\n' + searchResults.map((result, index) => {
          return `Source ${index+1}: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet || 'No snippet available'}\n`;
        }).join('\n');
      }
      
      // Construct messages for LLM
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Research topic: ${topic}\n${searchContext ? '\nSearch context:\n' + searchContext : ''}`
        }
      ];
      
      // Get response from OneAPI with fallback handling
      let response;
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
                error: lastError?.message || 'Unknown error'
              }
            });
          }
          
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
          
        } catch (error) {
          lastError = error;
          console.warn(`Model ${modelToTry} failed, trying next fallback if available`, error);
          
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
                  failedAllModels: true
                }
              });
            }
            throw error;
          }
        }
      }
      
      // Extract and process content
      const researchContent = response.choices[0].message.content;
      
      // Attempt to extract sources if they're in the response
      const extractedSources = this.extractSources(researchContent);
      
      // Finalize metrics if tracking is enabled
      if (trackMetrics) {
        const endTime = new Date();
        const duration = endTime - startTime;
        
        this.oneAPI.completeMetric({
          trackingId,
          status: 'success',
          model: attemptedModels[attemptedModels.length - 1],
          duration,
          outputTokens: response.usage?.completion_tokens || 0,
          inputTokens: response.usage?.prompt_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          metadata: {
            ...combinedMetadata,
            attemptedModels,
            usedFallback: attemptedModels.length > 1,
            finalModel: attemptedModels[attemptedModels.length - 1],
            extractedSourceCount: extractedSources.length
          }
        });
      }
      
      return {
        topic,
        depth: normalizedDepth,
        format: normalizedFormat,
        model: attemptedModels[attemptedModels.length - 1],
        sources: extractedSources.length > 0 ? extractedSources : 
          (searchResults || [
            { url: 'ai-generated', title: 'AI Synthesized Information' }
          ]),
        content: researchContent,
        rawResponse: response,
        timestamp: new Date().toISOString(),
        trackingId: trackMetrics ? trackingId : undefined,
        fallback: attemptedModels.length > 1 ? attemptedModels : undefined,
        duration: new Date() - startTime,
        usage: response.usage
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
            attemptedModels: attemptedModels || [useModel],
            errorType: error.name || 'UnknownError'
          }
        });
      }
      
      console.error('Research agent error:', error);
      throw new Error(`Research task failed: ${error.message}`);
    }
  }
  
  /**
   * Get metrics for this research agent
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for metrics
   * @param {Date} options.endDate - End date for metrics
   * @param {string} options.model - Filter by model
   * @param {string} options.topic - Filter by topic keyword
   * @returns {Promise<Object>} Metrics data
   */
  async getMetrics(options = {}) {
    return this.oneAPI.getMetrics({
      type: 'research',
      ...options,
      metadata: {
        agentType: 'research',
        ...(options.metadata || {})
      }
    });
  }
  
  /**
   * Extract sources from research content
   * @param {string} content - Research content
   * @returns {Array} Extracted sources
   */
  /**
   * Extract sources from research content
   * @param {string} content - Research content
   * @param {boolean} trackMetrics - Whether to track metrics for this operation
   * @returns {Array} Extracted sources
   */
  extractSources(content, trackMetrics = this.metricsEnabled) {
    const sources = [];
    if (!content) return sources;
    
    const extractionStart = new Date();
    const extractionTrackingId = `source_extraction_${Date.now()}`;
    
    try {
      if (trackMetrics) {
        this.oneAPI.trackEvent({
          type: 'extraction_started',
          trackingId: extractionTrackingId,
          metadata: {
            contentLength: content.length,
            ...this.metadata
          }
        });
      }
      
      // Try to find URLs in the content
      const urlRegex = /(https?:\/\/[^\s)\]]+)/g;
      const matches = content.match(urlRegex) || [];
      
      // Extract unique URLs
      const uniqueUrls = [...new Set(matches)];
      
      // Try to extract source titles for URLs
      uniqueUrls.forEach(url => {
        // Look for title patterns like [Title](URL) or "Title" (URL)
        let title = 'Unknown Source';
        
        // Check for markdown link format [Title](URL)
        const markdownMatch = content.match(new RegExp(`\\[([^\\]]+)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`));
        if (markdownMatch && markdownMatch[1]) {
          title = markdownMatch[1];
        } else {
          // Check for title near URL in parentheses: "Title" (URL)
          const parenthesesMatch = content.match(new RegExp(`"([^"]+)"\\s*\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`));
          if (parenthesesMatch && parenthesesMatch[1]) {
            title = parenthesesMatch[1];
          }
        }
        
        sources.push({ url, title, type: 'web-link' });
      });
      
      // Also look for formatted source lists like "1. Source Title: description"
      const sourceListRegex = /(^|\n)[\d]+\.\s+(.*?)(?::| -)(.*?)(?=$|\n[\d]+\.)/g;
      let sourceMatch;
      while ((sourceMatch = sourceListRegex.exec(content)) !== null) {
        if (sourceMatch[2] && !uniqueUrls.some(url => sourceMatch[0].includes(url))) {
          sources.push({
            title: sourceMatch[2].trim(),
            snippet: sourceMatch[3] ? sourceMatch[3].trim() : '',
            url: 'reference-citation',
            type: 'citation'
          });
        }
      }
      
      // Track successful extraction if enabled
      if (trackMetrics) {
        const extractionEnd = new Date();
        this.oneAPI.trackEvent({
          type: 'extraction_completed',
          trackingId: extractionTrackingId,
          status: 'success',
          duration: extractionEnd - extractionStart,
          metadata: {
            contentLength: content.length,
            sourcesFound: sources.length,
            urlsFound: uniqueUrls.length,
            citationsFound: sources.filter(s => s.type === 'citation').length,
            ...this.metadata
          }
        });
      }
      
      return sources;
    } catch (error) {
      // Track failed extraction if enabled
      if (trackMetrics) {
        const extractionEnd = new Date();
        this.oneAPI.trackEvent({
          type: 'extraction_completed',
          trackingId: extractionTrackingId,
          status: 'error',
          duration: extractionEnd - extractionStart,
          error: error.message,
          metadata: {
            contentLength: content?.length || 0,
            errorType: error.name || 'UnknownError',
            ...this.metadata
          }
        });
      }
      
      console.warn('Error extracting sources:', error);
      return [];
    }
  }
}
