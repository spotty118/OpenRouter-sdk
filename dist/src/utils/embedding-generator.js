/**
 * Utility for generating embeddings from text
 */
import { Logger } from './logger';
/**
 * Utility class for generating embeddings from text
 */
export class EmbeddingGenerator {
    /**
     * Create a new embedding generator
     *
     * @param config - Configuration options
     */
    constructor(config) {
        this.config = {
            apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
            model: config.model || 'text-embedding-3-small',
            endpoint: config.endpoint || 'https://api.openai.com/v1/embeddings',
            dimensions: config.dimensions,
            useOpenRouter: config.useOpenRouter || false
        };
        this.logger = new Logger('info');
        if (this.config.useOpenRouter) {
            this.config.endpoint = 'https://openrouter.ai/api/v1/embeddings';
        }
    }
    /**
     * Generate an embedding for a text string
     *
     * @param text - The text to generate an embedding for
     * @returns Promise resolving to the embedding vector
     */
    async generateEmbedding(text) {
        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    ...(this.config.useOpenRouter ? {
                        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://api.openrouter.ai',
                        'X-Title': 'OpenRouter SDK'
                    } : {})
                },
                body: JSON.stringify({
                    input: text,
                    model: this.config.model
                })
            });
            if (!response.ok) {
                throw new Error(`Embedding API returned status ${response.status}`);
            }
            const data = await response.json();
            // Handle different API response formats
            let embedding;
            if (this.config.useOpenRouter) {
                embedding = data.data[0].embedding;
            }
            else {
                // OpenAI format
                embedding = data.data[0].embedding;
            }
            // Validate dimensions
            if (embedding.length !== this.config.dimensions) {
                this.logger.warn(`Embedding dimensions mismatch: expected ${this.config.dimensions}, got ${embedding.length}`);
            }
            return embedding;
        }
        catch (err) {
            this.logger.error('Failed to generate embedding:', err);
            // Return a random embedding as fallback
            return this.createRandomEmbedding();
        }
    }
    /**
     * Generate embeddings for multiple text strings
     *
     * @param texts - Array of text strings to generate embeddings for
     * @returns Promise resolving to an array of embedding vectors
     */
    async generateEmbeddings(texts) {
        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    ...(this.config.useOpenRouter ? {
                        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://api.openrouter.ai',
                        'X-Title': 'OpenRouter SDK'
                    } : {})
                },
                body: JSON.stringify({
                    input: texts,
                    model: this.config.model
                })
            });
            if (!response.ok) {
                throw new Error(`Embedding API returned status ${response.status}`);
            }
            const data = await response.json();
            // Handle different API response formats
            let embeddings;
            if (this.config.useOpenRouter) {
                embeddings = data.data.map((item) => item.embedding);
            }
            else {
                // OpenAI format
                embeddings = data.data.map((item) => item.embedding);
            }
            return embeddings;
        }
        catch (err) {
            this.logger.error('Failed to generate embeddings:', err);
            // Return random embeddings as fallback
            return texts.map(() => this.createRandomEmbedding());
        }
    }
    /**
     * Create a random embedding vector (for fallback)
     *
     * @returns A random embedding vector
     */
    createRandomEmbedding() {
        return Array.from({ length: this.config.dimensions }, () => Math.random() * 2 - 1);
    }
}
//# sourceMappingURL=embedding-generator.js.map