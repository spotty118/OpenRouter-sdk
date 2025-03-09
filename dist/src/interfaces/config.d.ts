/**
 * Configuration interfaces for OpenRouter
 */
/**
 * OpenRouter configuration options
 */
export interface OpenRouterConfig {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
    headers?: Record<string, string>;
    timeout?: number;
    maxRetries?: number;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
    enableCaching?: boolean;
    cacheTTL?: number;
    rateLimitRPM?: number;
}
//# sourceMappingURL=config.d.ts.map