import { ValidationError } from '../errors/validation-error.js';

import { ContentPart } from './messaging.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
}

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
  response_format?: any;
  seed?: number;
  tools?: any[];
  tool_choice?: any;
  frequency_penalty?: number;
  presence_penalty?: number;
  logit_bias?: Record<string, number>;
  repetition_penalty?: number;
  top_logprobs?: number;
  min_p?: number;
  models?: string[];
  provider?: any;
  plugins?: any[];
  reasoning?: any;
  include_reasoning?: boolean;
  user?: string;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  encoding_format?: string; // Added for OpenAI provider compatibility
  user?: string;
}

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  response_format?: string;
  quality?: string;
  style?: string;
  user?: string;
}

export interface AudioTranscriptionRequest {
  model: string;
  file: string | Blob | ArrayBuffer | Buffer;
  language?: string;
  prompt?: string;
  response_format?: string;
  temperature?: number;
  timestamp_granularities?: string[];
}

/**
 * Validates a completion request
 * @throws {ValidationError} if the request is invalid
 */
export function validateCompletionRequest(request: CompletionRequest): void {
  const errors: string[] = [];

  if (!request.model) {
    errors.push('model is required');
  }

  if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
    errors.push('messages must be a non-empty array');
  } else {
    for (const [index, message] of request.messages.entries()) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        errors.push(`message[${index}].role must be 'system', 'user', or 'assistant'`);
      }
      if (typeof message.content !== 'string' || message.content.trim().length === 0) {
        errors.push(`message[${index}].content must be a non-empty string`);
      }
    }
  }

  if (request.max_tokens !== undefined && (
    typeof request.max_tokens !== 'number' ||
    request.max_tokens < 1 ||
    !Number.isInteger(request.max_tokens)
  )) {
    errors.push('max_tokens must be a positive integer');
  }

  if (request.temperature !== undefined && (
    typeof request.temperature !== 'number' ||
    request.temperature < 0 ||
    request.temperature > 2
  )) {
    errors.push('temperature must be a number between 0 and 2');
  }

  if (request.top_p !== undefined && (
    typeof request.top_p !== 'number' ||
    request.top_p < 0 ||
    request.top_p > 1
  )) {
    errors.push('top_p must be a number between 0 and 1');
  }

  if (request.frequency_penalty !== undefined && (
    typeof request.frequency_penalty !== 'number' ||
    request.frequency_penalty < -2 ||
    request.frequency_penalty > 2
  )) {
    errors.push('frequency_penalty must be a number between -2 and 2');
  }

  if (request.presence_penalty !== undefined && (
    typeof request.presence_penalty !== 'number' ||
    request.presence_penalty < -2 ||
    request.presence_penalty > 2
  )) {
    errors.push('presence_penalty must be a number between -2 and 2');
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid completion request', errors);
  }
}
