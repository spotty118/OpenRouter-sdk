/**
 * Google Search API integration
 * This service provides a wrapper around the Google Custom Search API
 * to enable Claude AI models to access real-time information from the web.
 */

import { OpenRouterError } from '../errors/openrouter-error.js';
import { Logger } from '../utils/logger.js';

/**
 * Configuration for Google Search
 */
export interface GoogleSearchConfig {
  /**
   * Google Custom Search API key
   */
  apiKey: string;

  /**
   * Google Custom Search Engine ID
   */
  searchEngineId: string;

  /**
   * Maximum number of results to return (default: 5)
   */
  maxResults?: number;

  /**
   * ISO language code (e.g., 'en', 'es', 'fr')
   * Default: 'en'
   */
  language?: string;

  /**
   * Country restriction (e.g., 'us', 'gb', 'ca')
   * Default: 'us'
   */
  country?: string;

  /**
   * Safe search level: 'off', 'medium', or 'high'
   * Default: 'medium'
   */
  safeSearch?: 'off' | 'medium' | 'high';
  
  /**
   * Search result type: 'web', 'image', or 'both'
   * Default: 'web'
   */
  searchType?: 'web' | 'image' | 'both';
  
  /**
   * Timeout for search requests in milliseconds
   * Default: 5000 (5 seconds)
   */
  timeout?: number;
  
  /**
   * Number of retries for failed requests
   * Default: 2
   */
  maxRetries?: number;
  
  /**
   * Log level for search operations
   * Default: 'info'
   */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Search result interface
 */
export interface SearchResult {
  /**
   * Title of the search result
   */
  title: string;
  
  /**
   * URL link to the result
   */
  link: string;
  
  /**
   * Text snippet from the result
   */
  snippet: string;
  
  /**
   * HTML formatted version of the snippet (if available)
   */
  htmlSnippet?: string;
  
  /**
   * Display URL (may be different from link)
   */
  displayLink?: string;
  
  /**
   * Metadata about the result
   */
  pagemap?: {
    /**
     * Thumbnail image information
     */
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    
    /**
     * Meta tags from the page
     */
    metatags?: Array<Record<string, string>>;
    
    /**
     * Other metadata
     */
    [key: string]: any;
  };
  
  /**
   * Source of the result (e.g., domain name)
   */
  source?: string;
  
  /**
   * Published date if available (ISO string)
   */
  publishedDate?: string;
  
  /**
   * File format if applicable (e.g., 'PDF', 'DOC')
   */
  fileFormat?: string;
}

/**
 * Google Search API service
 * Provides search capabilities that can be integrated with AI models
 */
export class GoogleSearch {
  private apiKey: string;
  private searchEngineId: string;
  private maxResults: number;
  private language: string;
  private country: string;
  private safeSearch: 'off' | 'medium' | 'high';
  private searchType: 'web' | 'image' | 'both';
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;
  private baseUrl: string = 'https://www.googleapis.com/customsearch/v1';

  /**
   * Create a new Google Search instance
   * 
   * @param config Google Search configuration
   */
  constructor(config: GoogleSearchConfig) {
    this.apiKey = config.apiKey;
    this.searchEngineId = config.searchEngineId;
    this.maxResults = config.maxResults || 5;
    this.language = config.language || 'en';
    this.country = config.country || 'us';
    this.safeSearch = config.safeSearch || 'medium';
    this.searchType = config.searchType || 'web';
    this.timeout = config.timeout || 5000;
    this.maxRetries = config.maxRetries || 2;
    this.logger = new Logger(config.logLevel || 'info');
  }

  /**
   * Perform a search query
   * 
   * @param query Search query
   * @param options Optional search parameters to override defaults
   * @returns Promise resolving to search results
   */
  async search(query: string, options?: {
    maxResults?: number;
    searchType?: 'web' | 'image' | 'both';
    language?: string;
    country?: string;
    safeSearch?: 'off' | 'medium' | 'high';
  }): Promise<SearchResult[]> {
    // Apply options or use defaults
    const maxResults = options?.maxResults || this.maxResults;
    const searchType = options?.searchType || this.searchType;
    const language = options?.language || this.language;
    const country = options?.country || this.country;
    const safeSearch = options?.safeSearch || this.safeSearch;
    
    this.logger.debug(`Searching for "${query}" with max ${maxResults} results`);
    
    // Implement retry logic
    let retries = 0;
    while (retries <= this.maxRetries) {
      try {
        // Build URL with query parameters
        const url = new URL(this.baseUrl);
        url.searchParams.append('key', this.apiKey);
        url.searchParams.append('cx', this.searchEngineId);
        url.searchParams.append('q', query);
        url.searchParams.append('num', maxResults.toString());
        url.searchParams.append('hl', language);
        url.searchParams.append('gl', country);
        url.searchParams.append('safe', safeSearch);
        
        // Add search type parameter if not 'web' (default)
        if (searchType === 'image') {
          url.searchParams.append('searchType', 'image');
        }

        // Make the request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        this.logger.debug(`Making request to ${url.toString()}`);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage = `Google Search API request failed with status ${response.status}`;
          this.logger.error(errorMessage, errorData);
          
          if (response.status === 429 || response.status >= 500) {
            // Retry on rate limit (429) or server errors (5xx)
            retries++;
            if (retries <= this.maxRetries) {
              const delay = Math.pow(2, retries) * 1000; // Exponential backoff
              this.logger.warn(`Retrying search after ${delay}ms (attempt ${retries} of ${this.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          throw new OpenRouterError(errorMessage, response.status, errorData);
        }

        const data = await response.json();
        this.logger.debug(`Received search results: ${data.searchInformation?.totalResults || 0} total results`);
        
        // Extract and return search results
        if (data.items && Array.isArray(data.items)) {
          return data.items.map((item: any) => ({
            title: item.title || '',
            link: item.link || '',
            snippet: item.snippet || '',
            htmlSnippet: item.htmlSnippet,
            displayLink: item.displayLink,
            pagemap: item.pagemap,
            source: item.displayLink || new URL(item.link).hostname,
            publishedDate: this.extractPublishedDate(item),
            fileFormat: this.extractFileFormat(item)
          }));
        }
        
        return [];
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          this.logger.warn(`Search request timed out after ${this.timeout}ms`);
          retries++;
          if (retries <= this.maxRetries) {
            const delay = Math.pow(2, retries) * 1000; // Exponential backoff
            this.logger.warn(`Retrying search after ${delay}ms (attempt ${retries} of ${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new OpenRouterError(`Search request timed out after ${this.timeout}ms`, 408, null);
        }
        
        if (error instanceof OpenRouterError) {
          throw error;
        }
        
        this.logger.error(`Error calling Google Search API: ${error instanceof Error ? error.message : String(error)}`);
        throw new OpenRouterError(
          `Error calling Google Search API: ${error instanceof Error ? error.message : String(error)}`,
          500,
          null
        );
      }
    }
    
    // This will only be reached if all retries fail
    throw new OpenRouterError(`Maximum retries (${this.maxRetries}) exceeded for search query`, 429, null);
  }

  /**
   * Extract published date from search result metadata if available
   * @param item Search result item
   * @returns ISO date string or undefined
   */
  private extractPublishedDate(item: any): string | undefined {
    try {
      // Try to extract from metatags
      if (item.pagemap?.metatags?.[0]) {
        const metatags = item.pagemap.metatags[0];
        return metatags['article:published_time'] || 
               metatags['datePublished'] || 
               metatags['pubdate'] || 
               undefined;
      }
      return undefined;
    } catch (e) {
      return undefined;
    }
  }
  
  /**
   * Extract file format from URL if applicable
   * @param item Search result item
   * @returns File format string or undefined
   */
  private extractFileFormat(item: any): string | undefined {
    try {
      if (item.fileFormat) return item.fileFormat;
      if (item.link) {
        const url = item.link.toLowerCase();
        if (url.endsWith('.pdf')) return 'PDF';
        if (url.endsWith('.doc') || url.endsWith('.docx')) return 'DOC';
        if (url.endsWith('.ppt') || url.endsWith('.pptx')) return 'PPT';
        if (url.endsWith('.xls') || url.endsWith('.xlsx')) return 'XLS';
      }
      return undefined;
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Perform a search and format results for AI context
   * 
   * @param query Search query
   * @param options Optional search parameters to override defaults
   * @returns Formatted search results as a string
   */
  async searchFormatted(query: string, options?: {
    maxResults?: number;
    searchType?: 'web' | 'image' | 'both';
    format?: 'simple' | 'detailed' | 'markdown';
  }): Promise<string> {
    const format = options?.format || 'simple';
    const results = await this.search(query, options);
    
    if (results.length === 0) {
      return "No search results found.";
    }
    
    if (format === 'simple') {
      return results.map((result, index) => {
        return `[${index + 1}] ${result.title}\n${result.link}\n${result.snippet}\n`;
      }).join('\n');
    } else if (format === 'detailed') {
      return results.map((result, index) => {
        let output = `[${index + 1}] ${result.title}\n`;
        output += `URL: ${result.link}\n`;
        output += `Source: ${result.source || 'Unknown'}\n`;
        if (result.publishedDate) output += `Date: ${result.publishedDate}\n`;
        if (result.fileFormat) output += `Format: ${result.fileFormat}\n`;
        output += `\n${result.snippet}\n`;
        return output;
      }).join('\n---\n\n');
    } else if (format === 'markdown') {
      return results.map((result, index) => {
        let output = `### [${index + 1}] ${result.title}\n\n`;
        output += `**URL**: [${result.link}](${result.link})\n\n`;
        output += `**Source**: ${result.source || 'Unknown'}`;
        if (result.publishedDate) output += ` | **Date**: ${result.publishedDate}`;
        if (result.fileFormat) output += ` | **Format**: ${result.fileFormat}`;
        output += `\n\n${result.snippet}\n`;
        return output;
      }).join('\n\n---\n\n');
    }
    
    // Default fallback
    return results.map(r => `${r.title}\n${r.link}`).join('\n\n');
  }
  
  /**
   * Perform a search optimized for data extraction by Claude AI
   * This provides results in a format that's easier for Claude to extract structured information from
   * 
   * @param query Search query
   * @returns Formatted search results in a Claude-friendly format
   */
  async searchForClaude(query: string, options?: {
    maxResults?: number;
    includeMetadata?: boolean;
  }): Promise<string> {
    const includeMetadata = options?.includeMetadata !== false;
    const results = await this.search(query, { maxResults: options?.maxResults || this.maxResults });
    
    if (results.length === 0) {
      return "No search results found for the query.";
    }
    
    let output = `# Search Results for: "${query}"\n\n`;
    output += `Found ${results.length} results. Current date/time: ${new Date().toISOString()}\n\n`;
    
    results.forEach((result, index) => {
      output += `## Result ${index + 1}: ${result.title}\n\n`;
      output += `URL: ${result.link}\n`;
      
      if (includeMetadata) {
        output += `Source: ${result.source || new URL(result.link).hostname}\n`;
        if (result.publishedDate) output += `Date Published: ${result.publishedDate}\n`;
        if (result.fileFormat) output += `File Type: ${result.fileFormat}\n`;
      }
      
      output += `\n### Content:\n${result.snippet}\n\n`;
      
      // Add separator between results
      if (index < results.length - 1) {
        output += `-----\n\n`;
      }
    });
    
    return output;
  }
  
  /**
   * Perform an image search and return results suitable for AI models
   * 
   * @param query Search query
   * @param maxResults Maximum number of image results to return
   * @returns Formatted image search results
   */
  async searchImages(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    return this.search(query, {
      maxResults,
      searchType: 'image'
    });
  }
}
