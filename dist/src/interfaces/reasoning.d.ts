/**
 * Reasoning tokens interfaces
 */
/**
 * Reasoning config interface
 * Controls how the model generates and returns reasoning tokens
 */
export interface ReasoningConfig {
    /**
     * The effort level to use for reasoning
     * - "high": Allocates a large portion of tokens for reasoning (approx. 80% of max_tokens)
     * - "medium": Allocates a moderate portion of tokens (approx. 50% of max_tokens)
     * - "low": Allocates a smaller portion of tokens (approx. 20% of max_tokens)
     */
    effort?: 'high' | 'medium' | 'low';
    /**
     * Maximum number of tokens to use for reasoning
     * This is more precise than effort but only supported by certain models
     */
    max_tokens?: number;
    /**
     * Whether to exclude reasoning tokens from the response
     * When true, the model will still use reasoning but won't return it
     * Default: false
     */
    exclude?: boolean;
}
//# sourceMappingURL=reasoning.d.ts.map