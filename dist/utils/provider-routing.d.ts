/**
 * Provider routing utility functions
 *
 * This module provides utility functions for working with OpenRouter's provider routing capabilities,
 * allowing you to control which providers handle your requests and how fallbacks are managed.
 */
import { ProviderPreferences, ModelSuffix } from '../interfaces/provider-routing';
/**
 * Utility class for working with OpenRouter provider routing
 */
export declare class ProviderRouting {
    /**
     * Create provider routing preferences
     *
     * @param options Provider routing options
     * @returns A provider preferences object to include in your request
     *
     * @example
     * ```typescript
     * const preferences = ProviderRouting.createPreferences({
     *   order: ['Anthropic', 'OpenAI'],
     *   allow_fallbacks: true,
     *   require_parameters: true,
     *   data_collection: 'deny'
     * });
     * ```
     */
    static createPreferences(options: Partial<ProviderPreferences>): ProviderPreferences;
    /**
     * Create a provider order preference
     *
     * @param providerNames Array of provider names in order of preference
     * @param allowFallbacks Whether to allow fallbacks to other providers
     * @returns A provider preferences object with ordered providers
     *
     * @example
     * ```typescript
     * // Try Anthropic first, then OpenAI, with no other fallbacks
     * const preferences = ProviderRouting.orderProviders(
     *   ['Anthropic', 'OpenAI'],
     *   false
     * );
     * ```
     */
    static orderProviders(providerNames: string[], allowFallbacks?: boolean): ProviderPreferences;
    /**
     * Create a provider preference sorted by price, throughput, or latency
     *
     * @param sortBy The attribute to sort providers by
     * @returns A provider preferences object with sorting enabled
     *
     * @example
     * ```typescript
     * // Sort providers by lowest price
     * const preferences = ProviderRouting.sortProviders('price');
     *
     * // Sort providers by highest throughput
     * const preferences = ProviderRouting.sortProviders('throughput');
     * ```
     */
    static sortProviders(sortBy: 'price' | 'throughput' | 'latency'): ProviderPreferences;
    /**
     * Create provider routing preferences to only use quantized models
     *
     * @param quantizations Array of quantization levels to filter by
     * @returns A provider preferences object with quantization filtering
     *
     * @example
     * ```typescript
     * // Only use models with int4 or int8 quantization
     * const preferences = ProviderRouting.filterByQuantization(['int4', 'int8']);
     * ```
     */
    static filterByQuantization(quantizations: ('int4' | 'int8' | 'fp4' | 'fp6' | 'fp8' | 'fp16' | 'bf16' | 'fp32' | 'unknown')[]): ProviderPreferences;
    /**
     * Create provider routing preferences to ignore specific providers
     *
     * @param providerNames Array of provider names to ignore
     * @returns A provider preferences object with ignored providers
     *
     * @example
     * ```typescript
     * // Ignore Azure for this request
     * const preferences = ProviderRouting.ignoreProviders(['Azure']);
     * ```
     */
    static ignoreProviders(providerNames: string[]): ProviderPreferences;
    /**
     * Create a provider preference that requires all request parameters to be supported
     *
     * @param requireParameters Whether to require support for all parameters
     * @returns A provider preferences object with parameter requirement setting
     *
     * @example
     * ```typescript
     * // Only use providers that support all parameters in the request
     * const preferences = ProviderRouting.requireParameterSupport(true);
     * ```
     */
    static requireParameterSupport(requireParameters?: boolean): ProviderPreferences;
    /**
     * Create a provider preference with data collection policy
     *
     * @param dataCollection Data collection policy ('allow' or 'deny')
     * @returns A provider preferences object with data collection policy
     *
     * @example
     * ```typescript
     * // Only use providers that don't collect/store user data
     * const preferences = ProviderRouting.setDataCollectionPolicy('deny');
     * ```
     */
    static setDataCollectionPolicy(dataCollection: 'allow' | 'deny'): ProviderPreferences;
    /**
     * Apply a model suffix to a model ID
     *
     * @param modelId The original model ID
     * @param suffix The suffix to apply (nitro, floor, or online)
     * @returns The model ID with the suffix applied
     *
     * @example
     * ```typescript
     * // Sort by throughput
     * const model = ProviderRouting.applyModelSuffix('openai/gpt-4o', 'nitro');
     *
     * // Sort by price
     * const model = ProviderRouting.applyModelSuffix('meta-llama/llama-3.1-70b-instruct', 'floor');
     *
     * // Enable web search
     * const model = ProviderRouting.applyModelSuffix('anthropic/claude-3.5-sonnet', 'online');
     * ```
     */
    static applyModelSuffix(modelId: string, suffix: ModelSuffix): string;
}
