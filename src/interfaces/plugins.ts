/**
 * Plugin interfaces for OpenRouter
 */

/**
 * Base plugin interface
 */
export interface Plugin {
  /**
   * Unique identifier for the plugin
   */
  id: string;

  /**
   * Any additional plugin parameters
   */
  [key: string]: any;
}

/**
 * Web search plugin
 * Enables real-time web search capabilities powered by Exa
 */
export interface WebPlugin extends Plugin {
  /**
   * Plugin identifier for web search
   */
  id: 'web';

  /**
   * Maximum number of search results to return
   * Default: 5
   */
  max_results?: number;

  /**
   * Custom prompt to attach the search results to the message
   * Default includes instructions to cite sources using markdown links with the domain name
   * 
   * Example default prompt:
   * "A web search was conducted on [date]. Incorporate the following web search results into your response.
   * IMPORTANT: Cite them using markdown links named using the domain of the source.
   * Example: [nytimes.com](https://nytimes.com/some-page)."
   */
  search_prompt?: string;
}

/**
 * Plugin pricing information
 */
export interface PluginPricing {
  /**
   * Cost per 1000 results in USD
   * For web search plugin, this is $4 per 1000 results
   */
  costPer1000Results: number;
}
