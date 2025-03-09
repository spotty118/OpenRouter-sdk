/**
 * Response type interfaces
 */
import { ChatMessage } from './messaging.js';

/**
 * Chat completion response
 */
export interface CompletionResponse {
  id: string;
  model: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
    index: number;
    logprobs?: any;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  id: string;
  object: string;
  data: {
    embedding: number[];
    index: number;
    object: string;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
  created: number;
  data: {
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }[];
}

/**
 * Audio transcription response
 */
export interface AudioTranscriptionResponse {
  text: string;
  segments?: Array<{
    id: number;
    text: string;
    start: number;
    end: number;
  }>;
  language?: string;
}

/**
 * Models response
 */
export interface ModelsResponse {
  data: ModelInfo[];
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: string;
  created?: number;
  owned_by?: string;
  capabilities?: {
    chat?: boolean;
    embeddings?: boolean;
    images?: boolean;
    audio?: boolean;
    tools?: boolean;
    json_mode?: boolean;
    vision?: boolean;
  };
}

/**
 * Cost estimation result
 */
export interface CostEstimate {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  currency: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}