/**
 * Analysis Agent for OpenRouter SDK
 * 
 * This agent analyzes data and provides insights and visualizations using OneAPI.
 */

import oneapiModule from '../oneapi.js';

export class AnalysisAgent {
  constructor() {
    this.name = 'Analysis Agent';
    this.description = 'AI Agent that analyzes data and provides insights';
    // Will be set by OneAPI after initialization to avoid circular dependency
    this.oneAPI = null;
    this.defaultModel = 'openai/gpt-4-turbo'; // GPT-4 for better data analysis
  }

  /**
   * Execute a data analysis task
   * @param {Object} options - Analysis options
   * @param {string|Object} options.data - Data to analyze (JSON or string)
   * @param {string|Array} options.metrics - Metrics to calculate (comma-separated or array)
   * @param {boolean} options.visualize - Generate visualization suggestions
   * @param {string} options.model - LLM model to use
   * @param {number} options.temperature - Temperature for generation
   * @returns {Promise<Object>} Analysis results
   */
  async execute({ 
    data, 
    metrics, 
    visualize = false,
    model,
    temperature = 0.2,
    maxTokens = 2000,
    format = 'json'
  }) {
    console.log(`Analyzing data with metrics: ${metrics}, visualize: ${visualize}`);
    
    try {
      // Parse data if it's a string
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Parse metrics
      const metricsList = typeof metrics === 'string' 
        ? metrics.split(',').map(m => m.trim()) 
        : (Array.isArray(metrics) ? metrics : []);
        
      // Use OneAPI to analyze data
      const useModel = model || this.defaultModel;
      
      // Construct system prompt for data analysis
      const systemPrompt = `You are a data analyst with expertise in statistics and data science.
      Analyze the provided data and provide insights ${metricsList.length > 0 ? `focusing on these metrics: ${metricsList.join(', ')}` : 'on any relevant metrics'}.${visualize ? '\nAdditionally, suggest appropriate visualizations to represent this data, including chart types and key elements to include.' : ''}
      ${format === 'json' ? 'Provide your analysis in a structured JSON format with sections for "insights", "summary", and ' + (visualize ? '"visualizations"' : '') + '.' : 'Provide your analysis in a well-structured format with clear sections.'}`;
      
      // Stringify data for inclusion in prompt
      const dataString = JSON.stringify(parsedData, null, 2);
      
      // Construct messages for LLM
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Please analyze the following data:\n\n\`\`\`json\n${dataString}\n\`\`\`\n\nMetrics to focus on: ${metricsList.length > 0 ? metricsList.join(', ') : 'general statistical analysis'}`
        }
      ];
      
      // Get response from OneAPI
      const response = await this.oneAPI.createChatCompletion({
        model: useModel,
        messages,
        temperature,
        maxTokens
      });
      
      // Extract and process content
      const analysisContent = response.choices[0].message.content;
      
      // Try to parse JSON if format is JSON
      let parsedAnalysis = {
        insights: analysisContent,
        summary: 'Analysis complete',
        visualizations: []
      };
      
      if (format === 'json') {
        try {
          // Try to extract JSON from the response
          const jsonMatch = analysisContent.match(/```json\n([\s\S]*?)\n```/) || 
                         analysisContent.match(/({[\s\S]*})/); 
          
          if (jsonMatch && jsonMatch[1]) {
            parsedAnalysis = JSON.parse(jsonMatch[1]);
          } else {
            // Try to parse the entire response as JSON
            parsedAnalysis = JSON.parse(analysisContent);
          }
        } catch (error) {
          console.warn('Could not parse analysis as JSON, using raw content', error);
          // Fall back to raw content
          parsedAnalysis = {
            insights: analysisContent,
            summary: 'Analysis complete (JSON parsing failed)',
            visualizations: []
          };
        }
      }
      
      return {
        metrics: metricsList,
        model: useModel,
        visualizeRequested: visualize,
        insights: parsedAnalysis.insights || analysisContent,
        visualizations: parsedAnalysis.visualizations || [],
        summary: parsedAnalysis.summary || 'Analysis complete',
        rawContent: analysisContent,
        timestamp: new Date().toISOString(),
        usage: response.usage
      };
    } catch (error) {
      console.error('Analysis agent error:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }
}
