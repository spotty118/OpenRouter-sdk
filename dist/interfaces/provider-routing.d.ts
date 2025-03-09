/**
 * Provider routing preferences interfaces
 */
/**
 * Provider routing preferences
 * Controls how OpenRouter routes requests to different providers
 */
export interface ProviderPreferences {
    /**
     * List of provider names to try in order (e.g. ["Anthropic", "OpenAI"])
     * The router will prioritize providers in this list, and in this order
     */
    order?: string[];
    /**
     * Whether to allow backup providers when the primary is unavailable
     * Default: true
     */
    allow_fallbacks?: boolean;
    /**
     * Only use providers that support all parameters in your request
     * Default: false
     */
    require_parameters?: boolean;
    /**
     * Control whether to use providers that may store data
     * - "allow": (default) allow providers which store user data and may train on it
     * - "deny": use only providers which do not collect user data
     */
    data_collection?: 'allow' | 'deny';
    /**
     * List of provider names to skip for this request
     */
    ignore?: string[];
    /**
     * List of quantization levels to filter by (e.g. ["int4", "int8"])
     */
    quantizations?: ('int4' | 'int8' | 'fp4' | 'fp6' | 'fp8' | 'fp16' | 'bf16' | 'fp32' | 'unknown')[];
    /**
     * Sort providers by price or throughput
     * - "price": prioritize lowest price
     * - "throughput": prioritize highest throughput
     * - "latency": prioritize lowest latency
     */
    sort?: 'price' | 'throughput' | 'latency';
}
/**
 * Model suffix type for shorthand notation
 */
export type ModelSuffix = 'nitro' | 'floor' | 'online';
//# sourceMappingURL=provider-routing.d.ts.map