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
     */
    search_prompt?: string;
}
//# sourceMappingURL=plugins.d.ts.map