/**
 * Utility for generating embeddings from text
 */
/**
 * Configuration options for embedding generation
 */
export interface EmbeddingGeneratorConfig {
    /** API key for the embedding service */
    apiKey?: string;
    /** Model to use for embeddings (default: text-embedding-3-small) */
    model?: string;
    /** API endpoint for the embedding service (default: OpenAI) */
    endpoint?: string;
    /** Dimensions of the embedding vectors */
    dimensions: number;
    /** Whether to use OpenRouter API instead of OpenAI directly */
    useOpenRouter?: boolean;
}
/**
 * Utility class for generating embeddings from text
 */
export declare class EmbeddingGenerator {
    private config;
    private logger;
    /**
     * Create a new embedding generator
     *
     * @param config - Configuration options
     */
    constructor(config: EmbeddingGeneratorConfig);
    /**
     * Generate an embedding for a text string
     *
     * @param text - The text to generate an embedding for
     * @returns Promise resolving to the embedding vector
     */
    generateEmbedding(text: string): Promise<number[]>;
    /**
     * Generate embeddings for multiple text strings
     *
     * @param texts - Array of text strings to generate embeddings for
     * @returns Promise resolving to an array of embedding vectors
     */
    generateEmbeddings(texts: string[]): Promise<number[][]>;
    /**
     * Create a random embedding vector (for fallback)
     *
     * @returns A random embedding vector
     */
    private createRandomEmbedding;
}
//# sourceMappingURL=embedding-generator.d.ts.map