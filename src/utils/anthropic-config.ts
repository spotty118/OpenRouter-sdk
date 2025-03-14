/**
 * Configuration constants for Anthropic provider
 */
import { ModelCapabilities } from '../interfaces/provider-capabilities.js';

/**
 * Model mapping between OpenRouter and Anthropic models
 */
export const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Anthropic model
  'anthropic/claude-3.7-sonnet': 'claude-3.7-sonnet',
  'anthropic/claude-3.7-sonnet:thinking': 'claude-3.7-sonnet:thinking',
  'anthropic/claude-3.5-haiku-20241022': 'claude-3.5-haiku-20241022',
  'anthropic/claude-3.5-sonnet': 'claude-3.5-sonnet',
  'anthropic/claude-2.1': 'claude-2.1',
  'anthropic/claude-2.0': 'claude-2.0',
  'anthropic/claude-instant-1.2': 'claude-instant-1.2',

  // Anthropic model to OpenRouter model ID
  'claude-3.7-sonnet': 'anthropic/claude-3.7-sonnet',
  'claude-3.7-sonnet:thinking': 'anthropic/claude-3.7-sonnet:thinking',
  'claude-3.5-haiku-20241022': 'anthropic/claude-3.5-haiku-20241022',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-2.1': 'anthropic/claude-2.1',
  'claude-2.0': 'anthropic/claude-2.0',
  'claude-instant-1.2': 'anthropic/claude-instant-1.2'
};

/**
 * Token limits per model
 */
export const TOKEN_LIMITS: Record<string, number> = {
  'claude-3.7-sonnet': 4096 * 4,             // 16K context
  'claude-3.7-sonnet:thinking': 4096 * 4,    // 16K context
  'claude-3.5-haiku-20241022': 4096 * 2,     // 8K context
  'claude-3.5-sonnet': 4096 * 3,             // 12K context
  'claude-2.1': 4096 * 4,                    // 16K context
  'claude-2.0': 4096 * 4,                    // 16K context
  'claude-instant-1.2': 4096 * 4             // 16K context
};

/**
 * Rate limits per model
 */
export const RATE_LIMITS = {
  default: {
    requestsPerMinute: 450,
    tokensPerMinute: 90000,
    maxConcurrentRequests: 50
  },
  models: {
    'claude-3.7-sonnet': {
      requestsPerMinute: 400,
      tokensPerMinute: 85000
    },
    'claude-3.7-sonnet:thinking': {
      requestsPerMinute: 350,
      tokensPerMinute: 75000
    },
    'claude-3.5-haiku-20241022': {
      requestsPerMinute: 450,
      tokensPerMinute: 90000
    },
    'claude-3.5-sonnet': {
      requestsPerMinute: 350,
      tokensPerMinute: 75000
    }
  }
};

/**
 * Model capabilities and features
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'claude-3.7-sonnet': {
    vision: true,
    embeddings: true,
    imageGeneration: true,
    toolUse: true,
    thinking: false,
    audioTranscription: false,
    maxTokens: TOKEN_LIMITS['claude-3.7-sonnet'],
    structuredOutput: true
  },
  'claude-3.7-sonnet:thinking': {
    vision: true,
    embeddings: true,
    imageGeneration: true,
    toolUse: true,
    thinking: true,
    audioTranscription: false,
    maxTokens: TOKEN_LIMITS['claude-3.7-sonnet:thinking'],
    structuredOutput: true
  },
  'claude-3.5-haiku-20241022': {
    vision: true,
    embeddings: true,
    imageGeneration: false,
    toolUse: false,
    thinking: false,
    audioTranscription: false,
    maxTokens: TOKEN_LIMITS['claude-3.5-haiku-20241022'],
    structuredOutput: true
  },
  'claude-3.5-sonnet': {
    vision: true,
    embeddings: true,
    imageGeneration: false,
    toolUse: true,
    thinking: false,
    audioTranscription: false,
    maxTokens: TOKEN_LIMITS['claude-3.5-sonnet'],
    structuredOutput: true
  }
};
