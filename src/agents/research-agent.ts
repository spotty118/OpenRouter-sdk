/**
 * Research Agent Implementation
 * 
 * Specialized agent for research tasks with web search capabilities
 */
import { Agent, Task, TaskResult, TaskExecutionConfig, AgentStatus } from '../interfaces/crew-ai.js';
import { Logger } from '../utils/logger.js';
import { dynamicCapabilities } from '../utils/dynamic-capabilities.js';
import { agentManager } from '../utils/agent-manager.js';
import { WebSearch } from '../utils/web-search.js';
import { OpenRouter } from '../core/open-router.js';

interface ResearchAgentConfig {
  id: string;
  name: string;
  model: string;
  maxSearchResults?: number;
  maxDepth?: number;
  apiKey?: string;
}

interface ResearchResult {
  query: string;
  sources: {
    title: string;
    url: string;
    snippet: string;
  }[];
  summary: string;
  insights: string[];
}

/**
 * Research Agent implementation
 */
export class ResearchAgent implements Agent {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  
  private logger: Logger;
  private openRouter: OpenRouter;
  private maxSearchResults: number;
  private maxDepth: number;
  private activeTasks: Set<string> = new Set();
  private recentTasks: Array<{
    id: string;
    status: 'success' | 'error';
    timestamp: Date;
  }> = [];
  private errorCount: number = 0;
  private totalTasks: number = 0;
  private totalLatency: number = 0;

  constructor(config: ResearchAgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.model = config.model;
    this.maxSearchResults = config.maxSearchResults || 5;
    this.maxDepth = config.maxDepth || 2;
    this.logger = new Logger('info');
    
    // Initialize OpenRouter client
    this.openRouter = new OpenRouter({
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY || '',
      defaultModel: this.model
    });
    
    // Register with agent manager
    agentManager.registerAgent(this, {
      thinking: true,
      toolUse: true,
      reasoning: true,
      collaboration: false,
      maxContextLength: 16384
    });
  }

  /**
   * Execute a research task
   */
  async execute(task: Task, config?: TaskExecutionConfig): Promise<TaskResult> {
    const startTime = Date.now();
    this.activeTasks.add(task.id);
    this.totalTasks++;
    
    try {
      this.logger.info(`Research agent ${this.id} executing task: ${task.description}`);
      
      // Extract research query from task
      const query = task.input?.query || task.description;
      
      // Determine search depth
      const depth = task.input?.depth || this.maxDepth;
      
      // Perform web search
      const searchResults = await this.performWebSearch(query, this.maxSearchResults);
      
      // Generate research summary
      const summary = await this.generateResearchSummary(query, searchResults, depth);
      
      // Extract key insights
      const insights = await this.extractInsights(summary);
      
      // Prepare result
      const result: ResearchResult = {
        query,
        sources: searchResults.map(result => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet
        })),
        summary,
        insights
      };
      
      // Track task completion
      const latency = Date.now() - startTime;
      this.totalLatency += latency;
      this.recentTasks.unshift({
        id: task.id,
        status: 'success',
        timestamp: new Date()
      });
      
      // Keep only last 10 tasks
      if (this.recentTasks.length > 10) {
        this.recentTasks.pop();
      }
      
      // Track capability success
      dynamicCapabilities.trackRequest(
        this.model,
        'research',
        true,
        latency
      );
      
      return {
        taskId: task.id,
        success: true,
        data: result,
        metrics: {
          startTime: new Date(startTime),
          endTime: new Date()
        }
      };
      
    } catch (error) {
      // Track error
      this.errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.recentTasks.unshift({
        id: task.id,
        status: 'error',
        timestamp: new Date()
      });
      
      // Track capability failure
      dynamicCapabilities.trackRequest(
        this.model,
        'research',
        false,
        Date.now() - startTime
      );
      
      return {
        taskId: task.id,
        success: false,
        error: {
          message: errorMessage,
          details: error
        },
        metrics: {
          startTime: new Date(startTime),
          endTime: new Date()
        }
      };
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Get agent status
   */
  status(): AgentStatus {
    return {
      available: this.activeTasks.size < 5, // Allow up to 5 concurrent tasks
      load: this.activeTasks.size / 5, // Normalize load between 0-1
      activeTasks: this.activeTasks.size,
      recentTasks: [...this.recentTasks],
      errorRate: this.totalTasks > 0 ? this.errorCount / this.totalTasks : 0,
      averageLatency: this.totalTasks > 0 ? this.totalLatency / this.totalTasks : 0
    };
  }

  /**
   * Perform web search for a query
   */
  private async performWebSearch(query: string, maxResults: number): Promise<any[]> {
    try {
      // Use WebSearch utility with the new web plugin format
      const searchPlugin = WebSearch.createPlugin(maxResults);
      
      // Alternative approach: use the :online suffix
      const onlineModel = WebSearch.enableForModel(this.model);
      
      // Set a reasonable timeout for search operations
      const searchTimeout = 30000; // 30 seconds
      
      // Execute search via completion with plugin
      const response = await Promise.race([
        this.openRouter.createChatCompletion({
          model: onlineModel,
          plugins: [searchPlugin],
          messages: [
            {
              role: 'system',
              content: 'You are a research assistant. Search for information on the user\'s query.'
            },
            {
              role: 'user',
              content: `Research this topic: ${query}`
            }
          ]
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Search timed out after ${searchTimeout}ms`)), searchTimeout)
        )
      ]);
      
      // Verify response structure before extracting content
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid response structure from search API');
      }
      
      // Extract search results from response
      const content = response.choices[0].message.content || '';
      const searchData = this.extractSearchResults(content);
      
      // Return empty array if no results found
      if (!searchData || searchData.length === 0) {
        this.logger.warn(`No search results found for query: ${query}`);
        return [];
      }
      
      return searchData;
    } catch (error) {
      this.logger.error(`Web search failed: ${error}`);
      // Return empty results instead of throwing to allow the agent to continue
      return [];
    }
  }

  /**
   * Extract search results from response
   */
  private extractSearchResults(content: string): any[] {
    try {
      // Look for JSON block in response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Look for search results section
      const resultsMatch = content.match(/Search Results:([\s\S]*?)(?:\n\n|$)/);
      if (resultsMatch && resultsMatch[1]) {
        // Parse results in simple format
        const results = resultsMatch[1].split('\n').filter(line => line.trim().length > 0);
        return results.map(result => {
          const parts = result.split(' | ');
          return {
            title: parts[0]?.trim() || 'Unknown',
            url: parts[1]?.trim() || '#',
            snippet: parts[2]?.trim() || ''
          };
        });
      }
      
      // Fallback to empty results
      return [];
    } catch (error) {
      this.logger.warn(`Failed to parse search results: ${error}`);
      return [];
    }
  }

  /**
   * Generate research summary from search results
   */
  private async generateResearchSummary(query: string, searchResults: any[], depth: number): Promise<string> {
    try {
      // If no search results, return a basic message
      if (!searchResults || searchResults.length === 0) {
        return `No search results were found for the query: "${query}". Please try a different search term or check your internet connection.`;
      }
      
      // Format search results as context
      const searchContext = searchResults.map((result, index) => 
        `[${index + 1}] ${result.title || 'Untitled'}\nURL: ${result.url || 'No URL'}\n${result.snippet || 'No snippet available'}`
      ).join('\n\n');
      
      // Set a reasonable timeout for summary generation
      const summaryTimeout = 45000; // 45 seconds
      
      // Generate summary with thinking mode for deeper analysis
      const response = await Promise.race([
        this.openRouter.createChatCompletion({
          model: this.model,
          reasoning: {
            effort: 'high',
            max_tokens: depth * 1000 // Convert depth to tokens
          },
          messages: [
            {
              role: 'system',
              content: 'You are a research specialist. Analyze search results and provide a comprehensive summary.'
            },
            {
              role: 'user',
              content: `Research query: ${query}\n\nSearch results:\n${searchContext}\n\nProvide a comprehensive research summary based on these results.`
            }
          ]
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Summary generation timed out after ${summaryTimeout}ms`)), summaryTimeout)
        )
      ]);
      
      // Verify response structure
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid response structure from summary generation API');
      }
      
      return response.choices[0].message.content || `Unable to generate summary for query: "${query}"`;
    } catch (error: any) {
      this.logger.error(`Summary generation failed: ${error}`);
      const errorMessage = error?.message || 'Unknown error';
      return `Unable to generate a research summary for "${query}". Error: ${errorMessage}`;
    }
  }

  /**
   * Extract key insights from summary
   */
  private async extractInsights(summary: string): Promise<string[]> {
    try {
      // If summary is an error message or too short, return default message
      if (!summary || summary.length < 50 || summary.includes('Unable to generate') || summary.includes('No search results')) {
        return ['No insights could be extracted due to insufficient search results'];
      }
      
      // Set a reasonable timeout for insight extraction
      const insightTimeout = 30000; // 30 seconds
      
      // Use structured output for consistent format
      const response = await Promise.race([
        this.openRouter.createChatCompletion({
          model: this.model,
          response_format: {
            type: 'json_object',
            schema: {
              type: 'object',
              properties: {
                insights: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Key insights extracted from the research summary'
                }
              },
              required: ['insights']
            }
          },
          messages: [
            {
              role: 'system',
              content: 'Extract the key insights from the research summary. Return 3-5 important points.'
            },
            {
              role: 'user',
              content: summary
            }
          ]
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Insight extraction timed out after ${insightTimeout}ms`)), insightTimeout)
        )
      ]);
      
      // Verify response structure
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid response structure from insight extraction API');
      }
      
      // Parse insights from response
      try {
        const content = response.choices[0].message.content || '';
        const data = JSON.parse(content);
        
        if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
          return data.insights;
        }
        
        throw new Error('No insights found in structured response');
      } catch (e: any) {
        this.logger.warn(`JSON parsing failed, falling back to simple extraction: ${e?.message || 'Unknown error'}`);
        
        // Fallback to simple extraction if JSON parsing fails
        const content = response.choices[0].message.content || '';
        const insights = content.split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map(line => line.replace(/^[-*]\s+/, '').trim());
        
        return insights.length > 0 ? insights : ['No key insights found'];
      }
    } catch (error: any) {
      this.logger.error(`Insight extraction failed: ${error}`);
      return ['Unable to extract insights from the research summary'];
    }
  }
}
