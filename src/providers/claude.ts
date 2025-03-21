/**
 * Claude AI provider implementation with Google Search API integration
 * 
 * This provider allows using Claude AI models with the OpenRouter SDK, with the added
 * ability to enhance responses using Google Search results. When enabled, the provider
 * will automatically detect user queries, perform a Google search, and include relevant
 * search results as context for Claude to use when generating responses.
 * 
 * Features:
 * - Full support for Claude 3 models (Opus, Sonnet, Haiku)
 * - Google Search integration for augmenting Claude with up-to-date information
 * - Support for both streaming and non-streaming completions
 * 
 * Configuration options:
 * - enableSearch: Toggle Google Search integration on/off
 * - googleSearchApiKey: Google Custom Search API key
 * - googleSearchEngineId: Google Custom Search Engine ID
 * - maxSearchResults: Maximum number of search results to include (default: 3)
 * 
 * Example usage:
 * ```typescript
 * import { ClaudeProvider, ClaudeConfig } from '@openrouter/sdk';
 * 
 * const config: ClaudeConfig = {
 *   apiKey: 'your-claude-api-key',
 *   enableSearch: true,
 *   googleSearchApiKey: 'your-google-api-key',
 *   googleSearchEngineId: 'your-search-engine-id'
 * };
 * 
 * const claude = new ClaudeProvider(config);
 * 
 * // Use with search capability
 * const response = await claude.createChatCompletion({
 *   model: 'anthropic/claude-3-opus-20240229',
 *   messages: [{ role: 'user', content: 'What are the latest developments in AI?' }],
 *   tools: [{ type: 'function', function: { name: 'search' } }]
 * });
 * ```
 */

import { Provider, ProviderConfig } from '../interfaces/provider.js';
import { 
  CompletionRequest, 
  EmbeddingRequest,
  ImageGenerationRequest,
  AudioTranscriptionRequest
} from '../interfaces/requests.js';
import {
  CompletionResponse,
  EmbeddingResponse,
  ImageGenerationResponse,
  AudioTranscriptionResponse
} from '../interfaces/responses.js';
import { ChatMessage } from '../interfaces/messaging.js';
import { Logger } from '../utils/logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';
import Anthropic from '@anthropic-ai/sdk';

// Define GoogleSearch interface here since it's a new service
interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: Record<string, any>;
}

interface GoogleSearchConfig {
  apiKey: string;
  searchEngineId: string;
  maxResults?: number;
}

/**
 * GoogleSearch class for integrating with Google Custom Search API
 * This implementation provides search functionality to Claude AI
 */
class GoogleSearch {
  private apiKey: string;
  private searchEngineId: string;
  private maxResults: number;
  private logger: Logger;
  
  /**
   * Create a new GoogleSearch instance
   * 
   * @param config Google Search configuration options
   */
  constructor(config: GoogleSearchConfig) {
    this.apiKey = config.apiKey;
    this.searchEngineId = config.searchEngineId;
    this.maxResults = config.maxResults || 5;
    this.logger = new Logger('info');
  }
  
  /**
   * Perform a Google search query
   * 
   * @param query The search query string
   * @returns Promise resolving to array of search results
   */
  async search(query: string): Promise<GoogleSearchResult[]> {
    try {
      this.logger.info(`Performing Google search for query: ${query}`);
      
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.append('key', this.apiKey);
      url.searchParams.append('cx', this.searchEngineId);
      url.searchParams.append('q', query);
      url.searchParams.append('num', this.maxResults.toString());
      url.searchParams.append('safe', 'active'); // Safe search filtering
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Google Search API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Google Search API request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        this.logger.info('Google Search returned no results');
        return [];
      }
      
      this.logger.info(`Google Search returned ${data.items.length} results`);
      
      return data.items.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        pagemap: item.pagemap || {}
      }));
    } catch (error) {
      this.logger.error(`Error in Google Search: ${error instanceof Error ? error.message : String(error)}`);
      // Return empty array instead of throwing to maintain resilience
      return [];
    }
  }
  
  /**
   * Extract search queries from a user message
   * This helps identify what to search for in complex messages
   * 
   * @param message User message to analyze
   * @returns Extracted search query
   */
  extractSearchQuery(message: string): string {
    // Simple implementation - could be enhanced with NLP techniques
    // Look for patterns like "search for X" or "find information about X"
    const searchPatterns = [
      /search (?:for|about) ["'](.+?)["']/i,
      /search (?:for|about) (.+?)(?:\.|$)/i,
      /find (?:information|details|data) (?:about|on|for) ["'](.+?)["']/i,
      /find (?:information|details|data) (?:about|on|for) (.+?)(?:\.|$)/i,
      /look up ["'](.+?)["']/i,
      /look up (.+?)(?:\.|$)/i,
    ];
    
    for (const pattern of searchPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no explicit search patterns found, use the whole message
    // but limit to a reasonable length
    return message.length > 150 ? message.substring(0, 150) : message;
  }
}

/**
 * Claude AI specific configuration
 */
export interface ClaudeConfig extends ProviderConfig {
  /**
   * Optional API version
   */
  apiVersion?: string;

  /**
   * Google Search API key for search capabilities
   */
  googleSearchApiKey?: string;

  /**
   * Google Custom Search Engine ID
   */
  googleSearchEngineId?: string;

  /**
   * Whether to enable search capabilities
   */
  enableSearch?: boolean;

  /**
   * Maximum number of search results to return
   */
  maxSearchResults?: number;
}

/**
 * Model mapping between OpenRouter and Claude AI models
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Claude AI model
  'anthropic/claude-3-opus-20240229': 'claude-3-opus-20240229',
  'anthropic/claude-3-sonnet-20240229': 'claude-3-sonnet-20240229',
  'anthropic/claude-3-haiku-20240307': 'claude-3-haiku-20240307',
  'anthropic/claude-2.1': 'claude-2.1',
  'anthropic/claude-2.0': 'claude-2.0',
  'anthropic/claude-instant-1.2': 'claude-instant-1.2',
  
  // Claude AI model to OpenRouter model ID
  'claude-3-opus-20240229': 'anthropic/claude-3-opus-20240229',
  'claude-3-sonnet-20240229': 'anthropic/claude-3-sonnet-20240229',
  'claude-3-haiku-20240307': 'anthropic/claude-3-haiku-20240307',
  'claude-2.1': 'anthropic/claude-2.1',
  'claude-2.0': 'anthropic/claude-2.0',
  'claude-instant-1.2': 'anthropic/claude-instant-1.2'
};

/**
 * Claude AI provider implementation with Google Search integration
 */
export class ClaudeProvider implements Provider {
  readonly name = 'claude';
  private client: Anthropic;
  private searchClient?: GoogleSearch;
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;
  private enableSearch: boolean;
  private maxSearchResults: number;

  /**
   * Create a new Claude AI provider instance
   * 
   * @param config Claude AI configuration options
   */
  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger('info');
    this.enableSearch = config.enableSearch || false;
    this.maxSearchResults = config.maxSearchResults || 3;

    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': config.apiVersion || '2023-06-01',
      ...config.headers
    };

    // Initialize Google Search client if search is enabled and API key is provided
    if (this.enableSearch && config.googleSearchApiKey && config.googleSearchEngineId) {
      this.searchClient = new GoogleSearch({
        apiKey: config.googleSearchApiKey,
        searchEngineId: config.googleSearchEngineId,
        maxResults: this.maxSearchResults
      });
    }
  }

  /**
   * Map OpenRouter model ID to Claude AI model
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns Claude AI model name
   */
  mapToProviderModel(openRouterModelId: string): string {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Claude AI model to OpenRouter model ID
   * 
   * @param claudeModel Claude AI model name
   * @returns OpenRouter model ID
   */
  mapToOpenRouterModel(claudeModel: string): string {
    return MODEL_MAPPING[claudeModel] || claudeModel;
  }

  /**
   * Create chat completion with Claude AI, optionally using Google Search
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const claudeModel = this.mapToProviderModel(request.model);
    this.logger.info(`Creating chat completion with Claude model: ${claudeModel}`);
    
    try {
      // Check if search is enabled through either explicit tools or configuration
      const useSearch = this.enableSearch && (
        // Either search is requested explicitly in tools
        request.tools?.some(tool => 
          tool.type === 'function' && 
          (tool.function.name === 'search' || tool.function.name === 'google_search')
        ) ||
        // OR search is enabled globally in provider config
        (this.enableSearch === true && this.searchClient != null)
      );

      let messages = [...request.messages];
      
      // Perform web search if enabled and there's a user query
      if (useSearch && this.searchClient) {
        this.logger.info('Search functionality is enabled for this completion request');
        
        // Get the last user message
        const lastUserMessage = messages
          .filter(msg => msg.role === 'user')
          .pop();
        
        if (lastUserMessage) {
          let queryText: string;
          
          // Handle both string and ContentPart[] content types
          if (typeof lastUserMessage.content === 'string') {
            queryText = lastUserMessage.content;
          } else if (Array.isArray(lastUserMessage.content)) {
            // Extract text from content parts
            queryText = lastUserMessage.content
              .filter(part => part.type === 'text')
              .map(part => part.text)
              .join(' ');
          } else {
            this.logger.warn('Unable to extract search query from user message');
            queryText = '';
          }
          
          if (queryText) {
            // Extract search query from user message if possible
            const searchQuery = this.searchClient.extractSearchQuery(queryText);
            this.logger.info(`Extracted search query: ${searchQuery}`);
            
            // Perform web search based on extracted query
            let searchResults: GoogleSearchResult[] = [];
            try {
              searchResults = await this.searchClient.search(searchQuery);
              this.logger.info(`Search completed successfully for query: ${searchQuery}`);
            } catch (searchError) {
              this.logger.error(`Error performing search for query "${searchQuery}": ${searchError instanceof Error ? searchError.message : String(searchError)}`);
              // Continue without search results rather than failing the entire request
              searchResults = [];
            }
            
            // Add search results as a system message before the user's query
            if (searchResults && searchResults.length > 0) {
              this.logger.info(`Found ${searchResults.length} search results for query`);
              
              // Format search results in a clear, structured way for Claude
              const formattedResults = searchResults.map((result: GoogleSearchResult, i: number) => 
                `[Result ${i+1}]\nTitle: ${result.title}\nURL: ${result.link}\nSnippet: ${result.snippet}\n`
              ).join('\n');
              
              this.logger.debug(`Formatted search results: ${formattedResults.substring(0, 100)}...`);
              
              const searchResultsMessage: ChatMessage = {
                role: 'system',
                content: `Web search results for query: "${searchQuery}"\n\n${formattedResults}\n\nBase your response on these search results when answering the user's query.`
              };
              
              // Insert search results before the last user message
              const lastUserIndex = messages.lastIndexOf(lastUserMessage);
              this.logger.debug(`Inserting search results at index ${lastUserIndex}`);
              
              messages = [
                ...messages.slice(0, lastUserIndex),
                searchResultsMessage,
                ...messages.slice(lastUserIndex)
              ];
              
              this.logger.info(`Updated messages array now has ${messages.length} messages`);
            } else {
              this.logger.info('No search results found, proceeding without search context');
            }
          }
        }
      }
      
      // Log the messages for debugging
      this.logger.info(`Processing ${messages.length} messages for Claude API`);
      messages.forEach((msg, i) => {
        this.logger.debug(`Message ${i}: role=${msg.role}, content=${typeof msg.content === 'string' ? msg.content.substring(0, 50) + '...' : 'complex content'}`);
      });
      
      // Create Claude message format
      const claudeMessages = messages.map(msg => {
        if (msg.role === 'assistant') return { role: 'assistant', content: msg.content };
        if (msg.role === 'user') return { role: 'user', content: msg.content };
        if (msg.role === 'system') return { role: 'system', content: msg.content };
        // Default to user for any other roles
        return { role: 'user', content: msg.content };
      });

      // Make request to Claude API
      // Use type assertion to access messages property on Anthropic client
      const response = await (this.client as any).messages.create({
        model: claudeModel,
        messages: claudeMessages,
        max_tokens: request.max_tokens || 1024,
        temperature: request.temperature,
        top_p: request.top_p,
        stream: false,
      });
      
      // Convert Claude response to OpenRouter format
      return {
        id: response.id || `claude-${Date.now()}`,
        model: this.mapToOpenRouterModel(claudeModel),
        choices: [{
          message: {
            role: 'assistant',
            content: response.content[0].text
          },
          finish_reason: response.stop_reason || 'stop',
          index: 0
        }],
        usage: {
          prompt_tokens: response.usage?.input_tokens || 0,
          completion_tokens: response.usage?.output_tokens || 0,
          total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        }
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling Claude AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Stream chat completions from Claude AI
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const claudeModel = this.mapToProviderModel(request.model);
    this.logger.info(`Creating streaming chat completion with Claude model: ${claudeModel}`);
    
    try {
      // Check if search is enabled through either explicit tools or configuration
      const useSearch = this.enableSearch && (
        // Either search is requested explicitly in tools
        request.tools?.some(tool => 
          tool.type === 'function' && 
          (tool.function.name === 'search' || tool.function.name === 'google_search')
        ) ||
        // OR search is enabled globally in provider config
        (this.enableSearch === true && this.searchClient != null)
      );

      let messages = [...request.messages];
      
      // Perform web search if enabled and there's a user query
      if (useSearch && this.searchClient) {
        this.logger.info('Search functionality is enabled for this streaming completion request');
        
        // Get the last user message
        const lastUserMessage = messages
          .filter(msg => msg.role === 'user')
          .pop();
        
        if (lastUserMessage) {
          let queryText: string;
          
          // Handle both string and ContentPart[] content types
          if (typeof lastUserMessage.content === 'string') {
            queryText = lastUserMessage.content;
          } else if (Array.isArray(lastUserMessage.content)) {
            // Extract text from content parts
            queryText = lastUserMessage.content
              .filter(part => part.type === 'text')
              .map(part => part.text)
              .join(' ');
          } else {
            this.logger.warn('Unable to extract search query from user message');
            queryText = '';
          }
          
          if (queryText) {
            // Extract search query from user message if possible
            const searchQuery = this.searchClient.extractSearchQuery(queryText);
            this.logger.info(`Extracted search query for streaming: ${searchQuery}`);
            
            // Perform web search based on extracted query
            let searchResults: GoogleSearchResult[] = [];
            try {
              searchResults = await this.searchClient.search(searchQuery);
              this.logger.info(`Search completed successfully for query: ${searchQuery}`);
            } catch (searchError) {
              this.logger.error(`Error performing search for query "${searchQuery}": ${searchError instanceof Error ? searchError.message : String(searchError)}`);
              // Continue without search results rather than failing the entire request
              searchResults = [];
            }
            
            // Add search results as a system message before the user's query
            if (searchResults && searchResults.length > 0) {
              this.logger.info(`Found ${searchResults.length} search results for streaming query`);
              
              // Format search results in a clear, structured way for Claude
              const formattedResults = searchResults.map((result: GoogleSearchResult, i: number) => 
                `[Result ${i+1}]\nTitle: ${result.title}\nURL: ${result.link}\nSnippet: ${result.snippet}\n`
              ).join('\n');
              
              this.logger.debug(`Formatted search results: ${formattedResults.substring(0, 100)}...`);
              
              const searchResultsMessage: ChatMessage = {
                role: 'system',
                content: `Web search results for query: "${searchQuery}"\n\n${formattedResults}\n\nBase your response on these search results when answering the user's query.`
              };
              
              // Insert search results before the last user message
              const lastUserIndex = messages.lastIndexOf(lastUserMessage);
              this.logger.debug(`Inserting search results at index ${lastUserIndex}`);
              
              messages = [
                ...messages.slice(0, lastUserIndex),
                searchResultsMessage,
                ...messages.slice(lastUserIndex)
              ];
              
              this.logger.info(`Updated messages array now has ${messages.length} messages`);
            }
          }
        }
      }
      
      // Log the messages for debugging
      this.logger.info(`Processing ${messages.length} messages for Claude API`);
      messages.forEach((msg, i) => {
        this.logger.debug(`Message ${i}: role=${msg.role}, content=${typeof msg.content === 'string' ? msg.content.substring(0, 50) + '...' : 'complex content'}`);
      });
      
      // Create Claude message format
      const claudeMessages = messages.map(msg => {
        if (msg.role === 'assistant') return { role: 'assistant', content: msg.content };
        if (msg.role === 'user') return { role: 'user', content: msg.content };
        if (msg.role === 'system') return { role: 'system', content: msg.content };
        // Default to user for any other roles
        return { role: 'user', content: msg.content };
      });

      // Log the messages for debugging
      this.logger.info(`Processing ${claudeMessages.length} messages for Claude API streaming`);
      claudeMessages.forEach((msg, i) => {
        this.logger.debug(`Message ${i}: role=${msg.role}, content=${typeof msg.content === 'string' ? msg.content.substring(0, 50) + '...' : 'complex content'}`);
      });
      
      // Create a streaming response from Claude
      // Use type assertion to access messages property on Anthropic client
      const stream = await (this.client as any).messages.create({
        model: claudeModel,
        messages: claudeMessages,
        max_tokens: request.max_tokens || 1024,
        temperature: request.temperature,
        top_p: request.top_p,
        stream: true,
      });
      
      // Common response properties
      const commonResponse = {
        id: `claude-stream-${Date.now()}`,
        model: this.mapToOpenRouterModel(claudeModel),
      };

      try {
        // Process the stream
        for await (const chunk of stream) {
          // Handle Claude streaming response format
          if (chunk.type === 'content_block_delta' && chunk.delta && chunk.delta.text) {
            yield {
              ...commonResponse,
              choices: [{
                // Use a type that matches the CompletionResponse format
                message: {
                  role: 'assistant',
                  content: chunk.delta.text
                },
                index: 0,
                finish_reason: ''
              }]
            };
          } else if (chunk.type === 'content_block_start' && chunk.content_block && 
                    chunk.content_block.type === 'text' && chunk.content_block.text) {
            // Handle content_block_start events
            yield {
              ...commonResponse,
              choices: [{
                // Use a type that matches the CompletionResponse format
                message: {
                  role: 'assistant',
                  content: chunk.content_block.text
                },
                index: 0,
                finish_reason: ''
              }]
            };
          }
        }
      } catch (streamError) {
        this.logger.error(`Error processing Claude stream: ${streamError instanceof Error ? streamError.message : String(streamError)}`);
        throw new OpenRouterError(
          `Error processing Claude stream: ${streamError instanceof Error ? streamError.message : String(streamError)}`,
          500,
          null
        );
      }
      
      // Send final completion message
      yield {
        ...commonResponse,
        choices: [{
          message: {
            role: 'assistant',
            content: ''
          },
          finish_reason: 'stop',
          index: 0
        }]
      };
    } catch (error: unknown) {
      this.logger.error(`Error streaming from Claude API: ${error instanceof Error ? error.message : String(error)}`);
      throw new OpenRouterError(
        `Error streaming from Claude API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate embeddings from text using Claude
   * Note: Currently not supported by Claude API
   * 
   * @param request Embedding request parameters
   * @returns Promise resolving to embedding response
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // Not supported by Claude API
    throw new OpenRouterError(
      'Embeddings are not currently supported with the Claude provider', 
      400, 
      null
    );
  }
  
  /**
   * Create image with Claude AI
   * Note: Currently not supported by Claude API
   * 
   * @param request Image generation request parameters
   * @returns Promise resolving to image generation response
   */
  async createImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    // Not supported by Claude API
    throw new OpenRouterError(
      'Image generation is not currently supported with the Claude provider', 
      400, 
      null
    );
  }
  
  /**
   * Transcribe audio with Claude AI
   * Note: Currently not supported by Claude API
   * 
   * @param request Audio transcription request parameters
   * @returns Promise resolving to audio transcription response
   */
  async createTranscription(request: AudioTranscriptionRequest): Promise<AudioTranscriptionResponse> {
    // Not supported by Claude API
    throw new OpenRouterError(
      'Audio transcription is not currently supported with the Claude provider', 
      400, 
      null
    );
  }
}
