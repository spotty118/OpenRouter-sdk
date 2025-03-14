/**
 * Web Search Utility
 * 
 * Provides web search capabilities for agents and tools
 * Powered by Exa (https://exa.ai)
 */

/**
 * Create a web search plugin for use with OpenRouter
 */
export class WebSearch {
  /**
   * Create a web search plugin
   * @param {number} maxResults - Maximum number of search results to return (default: 5)
   * @param {string} searchPrompt - Custom prompt to attach the search results
   * @returns {Object} - Plugin configuration
   */
  static createPlugin(maxResults = 5, searchPrompt) {
    return {
      id: 'web',
      max_results: maxResults,
      ...(searchPrompt && { search_prompt: searchPrompt })
    };
  }

  /**
   * Enable web search for a model by appending the :online suffix
   * @param {string} modelId - The model ID
   * @returns {string} - The model ID with online suffix
   */
  static enableForModel(modelId) {
    return `${modelId}:online`;
  }

  /**
   * Perform a web search using the Exa API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  static async search(query, options = {}) {
    try {
      const maxResults = options.maxResults || 5;
      const searchUrl = `https://api.exa.ai/search?q=${encodeURIComponent(query)}&max_results=${maxResults}`;
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (options.apiKey) {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
      }
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Web search error:', error);
      throw error;
    }
  }

  /**
   * Parse search results from LLM response
   * @param {string} content - LLM response content
   * @returns {Array} - Parsed search results
   */
  static parseResults(content) {
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
      console.warn('Failed to parse search results:', error);
      return [];
    }
  }

  /**
   * Format search results as markdown
   * @param {Array} results - Search results
   * @returns {string} - Markdown formatted results
   */
  static formatResultsMarkdown(results) {
    if (!results || results.length === 0) {
      return 'No search results found.';
    }
    
    let markdown = '## Search Results\n\n';
    
    results.forEach((result, index) => {
      markdown += `### ${index + 1}. [${result.title}](${result.url})\n\n`;
      markdown += `${result.snippet || 'No description available.'}\n\n`;
    });
    
    return markdown;
  }

  /**
   * Format search results as HTML
   * @param {Array} results - Search results
   * @returns {string} - HTML formatted results
   */
  static formatResultsHtml(results) {
    if (!results || results.length === 0) {
      return '<p>No search results found.</p>';
    }
    
    let html = '<div class="search-results">';
    
    results.forEach((result, index) => {
      html += `
        <div class="search-result">
          <h3>${index + 1}. <a href="${result.url}" target="_blank">${result.title}</a></h3>
          <p>${result.snippet || 'No description available.'}</p>
        </div>
      `;
    });
    
    html += '</div>';
    
    return html;
  }
}

export default WebSearch;
