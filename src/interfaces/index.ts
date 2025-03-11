/**
 * Export all interfaces
 */
export * from './cache.js';
export * from './config.js';
export * from './messaging.js';
export * from './middleware.js';
// Explicitly re-export from requests.js to resolve ambiguity with ChatMessage
import type * as Requests from './requests.js';
export type {
  CompletionRequest,
  EmbeddingRequest,
  ImageGenerationRequest,
  AudioTranscriptionRequest
} from './requests.js';
// Export the rest without naming them explicitly
export * from './responses.js';
export * from './tools.js';
export * from './provider-routing.js';
export * from './plugins.js';
export * from './reasoning.js';
export * from './structured-outputs.js';
export * from './crew-ai.js';
export * from './vector-db.js';
export * from './provider.js';

// Add missing interfaces that are referenced in the codebase
export interface ModelsResponse {
  data: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  [key: string]: any;
}

export interface CostEstimate {
  input?: number;
  output?: number;
  total?: number;
  totalCost: number; // Used consistently across the codebase
  promptCost: number; // Used consistently across the codebase
  completionCost: number; // Used consistently across the codebase
  currency: string; // Currency used for the cost estimate
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
