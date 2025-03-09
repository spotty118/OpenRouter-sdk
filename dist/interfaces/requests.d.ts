/**
 * Request type interfaces
 */
import { ChatMessage } from './messaging';
import { ToolDefinition } from './tools';
import { ProviderPreferences } from './provider-routing';
import { Plugin } from './plugins';
import { ReasoningConfig } from './reasoning';
import { ResponseFormat } from './structured-outputs';
/**
 * Chat completion request
 */
export interface CompletionRequest {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stream?: boolean;
    transforms?: string[];
    additional_stop_sequences?: string[];
    response_format?: ResponseFormat;
    seed?: number;
    tools?: ToolDefinition[] | null;
    tool_choice?: 'auto' | 'none' | {
        type: 'function';
        function: {
            name: string;
        };
    };
    frequency_penalty?: number;
    presence_penalty?: number;
    repetition_penalty?: number;
    logit_bias?: Record<string, number>;
    top_logprobs?: number;
    min_p?: number;
    user?: string;
    /**
     * Fallback models to try if the primary model is unavailable
     * Will automatically try other models if the primary model's providers are down,
     * rate-limited, or refuse to reply due to content moderation
     */
    models?: string[];
    /**
     * Provider routing preferences
     * Controls how OpenRouter routes requests to different providers
     */
    provider?: ProviderPreferences;
    /**
     * Plugins to use with the request
     * Currently supports the web search plugin
     */
    plugins?: Plugin[];
    /**
     * Reasoning tokens configuration
     * Controls how the model generates and returns reasoning tokens
     */
    reasoning?: ReasoningConfig;
    /**
     * Legacy parameter for backward compatibility
     * @deprecated Use reasoning.exclude instead
     */
    include_reasoning?: boolean;
}
/**
 * Embedding request
 */
export interface EmbeddingRequest {
    model: string;
    input: string | string[];
    encoding_format?: 'float' | 'base64';
    user?: string;
}
/**
 * Image generation request
 */
export interface ImageGenerationRequest {
    model: string;
    prompt: string;
    n?: number;
    size?: string;
    response_format?: 'url' | 'b64_json';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    user?: string;
}
/**
 * Audio transcription request
 */
export interface AudioTranscriptionRequest {
    model: string;
    file: Blob | ArrayBuffer | string;
    language?: string;
    prompt?: string;
    response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    temperature?: number;
    timestamp_granularities?: Array<'segment' | 'word'>;
}
//# sourceMappingURL=requests.d.ts.map