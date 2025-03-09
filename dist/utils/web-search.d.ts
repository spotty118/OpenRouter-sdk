/**
 * Web search plugin utility for OpenRouter
 *
 * This module provides utility functions for working with OpenRouter's web search plugin,
 * which enables real-time web search capabilities powered by Exa.
 */
import { WebPlugin, Plugin } from '../interfaces/plugins';
/**
 * Utility class for working with OpenRouter's web search plugin
 */
export declare class WebSearch {
    /**
     * Create a web search plugin configuration
     *
     * @param maxResults Maximum number of search results to return (default: 5)
     * @param searchPrompt Custom prompt to attach the search results to the message
     * @returns A WebPlugin configuration object
     *
     * @example
     * ```typescript
     * // Basic web search plugin
     * const webPlugin = WebSearch.createPlugin();
     *
     * // Custom web search with 3 results
     * const webPlugin = WebSearch.createPlugin(3);
     *
     * // Custom web search with specific prompt
     * const webPlugin = WebSearch.createPlugin(
     *   5,
     *   "Here are some search results that might help:"
     * );
     * ```
     */
    static createPlugin(maxResults?: number, searchPrompt?: string): WebPlugin;
    /**
     * Apply the 'online' suffix to a model ID to enable web search
     *
     * @param modelId The original model ID
     * @returns The model ID with the 'online' suffix
     *
     * @example
     * ```typescript
     * // Enable web search for GPT-4
     * const model = WebSearch.enableForModel('openai/gpt-4');
     * // Returns: 'openai/gpt-4:online'
     * ```
     */
    static enableForModel(modelId: string): string;
    /**
     * Add the web search plugin to an existing array of plugins
     *
     * @param plugins Existing array of plugins (optional)
     * @param maxResults Maximum number of search results to return (default: 5)
     * @param searchPrompt Custom prompt to attach the search results to the message
     * @returns An array of plugins with web search added
     *
     * @example
     * ```typescript
     * // Add web search to existing plugins
     * const plugins = WebSearch.addToPlugins(existingPlugins);
     *
     * // Add web search with custom settings
     * const plugins = WebSearch.addToPlugins([], 3, "Custom search prompt");
     * ```
     */
    static addToPlugins(plugins?: Plugin[], maxResults?: number, searchPrompt?: string): Plugin[];
    /**
     * Get the default search prompt used by the plugin
     *
     * @returns The default search prompt template
     */
    static getDefaultSearchPrompt(): string;
}
