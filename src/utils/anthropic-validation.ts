/**
 * Validation utilities specific to Anthropic API requests
 */
import { ValidationError } from '../errors/validation-error.js';
import { ChatMessage, CompletionRequest, EmbeddingRequest, ImageGenerationRequest } from '../interfaces/requests.js';
import { MODEL_CAPABILITIES, MODEL_MAPPING, TOKEN_LIMITS } from './anthropic-config.js';

type ModelCapabilities = typeof MODEL_CAPABILITIES[keyof typeof MODEL_CAPABILITIES];

/**
 * Claude 3 specific validation rules
 */
const VALIDATION_RULES = {
  maxMessagesPerRequest: 50,
  maxImageAttachments: 10,
  maxImageSizeMB: 100,
  supportedImageFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  supportedResponseFormats: ['json_object'],
  minTemperature: 0,
  maxTemperature: 1,
  thinkingMinTemperature: 0.5  // Higher temperature recommended for thinking mode
};

/**
 * Check if model supports specific capability
 */
function hasCapability(model: string, capability: keyof ModelCapabilities): boolean {
  const capabilities = MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES];
  
  if (!capabilities) {
    return false;
  }
  
  // Handle numeric capabilities like maxTokens
  if (capability === 'maxTokens') {
    return typeof capabilities[capability] === 'number' && capabilities[capability] > 0;
  }
  
  // Handle boolean capabilities
  return Boolean(capabilities[capability]);
}

/**
 * Validate Anthropic-specific message content
 */
function validateAnthropicMessage(message: ChatMessage, index: number, model: string): string[] {
  const errors: string[] = [];

  if (Array.isArray(message.content)) {
    let imageCount = 0;
    for (const [partIndex, part] of message.content.entries()) {
      if (part.type === 'image_url') {
        // Check if model supports vision
        if (!hasCapability(model, 'vision')) {
          errors.push(`Model ${model} does not support image input`);
          continue;
        }

        imageCount++;
        
        if (!part.image_url?.url) {
          errors.push(`message[${index}].content[${partIndex}]: image_url.url is required`);
          continue;
        }

        const url = part.image_url.url;
        
        // Check image format
        const format = url.split('.').pop()?.toLowerCase();
        if (format && !VALIDATION_RULES.supportedImageFormats.includes(format)) {
          errors.push(
            `message[${index}].content[${partIndex}]: Unsupported image format. ` +
            `Supported formats: ${VALIDATION_RULES.supportedImageFormats.join(', ')}`
          );
        }

        // Check if base64
        if (url.startsWith('data:image/')) {
          // Estimate base64 size
          const base64Length = url.substring(url.indexOf(',') + 1).length;
          const sizeInMB = (base64Length * 3/4) / (1024 * 1024);
          
          if (sizeInMB > VALIDATION_RULES.maxImageSizeMB) {
            errors.push(
              `message[${index}].content[${partIndex}]: Image size exceeds ` +
              `${VALIDATION_RULES.maxImageSizeMB}MB limit`
            );
          }
        }
      }
    }

    if (imageCount > VALIDATION_RULES.maxImageAttachments) {
      errors.push(
        `message[${index}]: Too many images. Maximum ${VALIDATION_RULES.maxImageAttachments} ` +
        'images allowed per message'
      );
    }
  }

  return errors;
}

/**
 * Validate completion request for Anthropic provider
 * 
 * @throws {ValidationError} if the request is invalid
 */
export function validateAnthropicCompletionRequest(request: CompletionRequest): void {
  const errors: string[] = [];

  // Validate model
  const model = MODEL_MAPPING[request.model];
  if (!model) {
    errors.push(`Unsupported model: ${request.model}`);
  }

  // Validate messages
  if (request.messages.length > VALIDATION_RULES.maxMessagesPerRequest) {
    errors.push(`Maximum ${VALIDATION_RULES.maxMessagesPerRequest} messages allowed per request`);
  }

  // Validate message content
  for (const [index, message] of request.messages.entries()) {
    errors.push(...validateAnthropicMessage(message, index, model));
  }

  // Validate temperature for thinking mode
  if (model?.includes(':thinking') && request.temperature !== undefined) {
    if (request.temperature < VALIDATION_RULES.thinkingMinTemperature) {
      errors.push(
        `Temperature for thinking mode must be >= ${VALIDATION_RULES.thinkingMinTemperature} ` +
        'to encourage more exploratory responses'
      );
    }
  } else if (request.temperature !== undefined) {
    if (request.temperature < VALIDATION_RULES.minTemperature || 
        request.temperature > VALIDATION_RULES.maxTemperature) {
      errors.push(
        `Temperature must be between ${VALIDATION_RULES.minTemperature} and ` +
        `${VALIDATION_RULES.maxTemperature}`
      );
    }
  }

  // Validate token limits
  if (model) {
    const maxTokens = TOKEN_LIMITS[model];
    if (maxTokens && request.max_tokens !== undefined) {
      if (request.max_tokens < 1) {
        errors.push('max_tokens must be greater than 0');
      }
      if (request.max_tokens > maxTokens) {
        errors.push(`max_tokens cannot exceed ${maxTokens}`);
      }
    }
  }

  // Validate response format
  if (request.response_format) {
    if (!VALIDATION_RULES.supportedResponseFormats.includes(request.response_format.type)) {
      errors.push(
        `Unsupported response format. Supported formats: ` +
        `${VALIDATION_RULES.supportedResponseFormats.join(', ')}`
      );
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid Anthropic completion request', errors);
  }
}

/**
 * Validate embedding request for Anthropic provider
 */
export function validateAnthropicEmbeddingRequest(request: EmbeddingRequest): void {
  const errors: string[] = [];

  const model = MODEL_MAPPING[request.model];
  if (!model) {
    errors.push(`Unsupported model: ${request.model}`);
  }

  // Check if model supports embeddings
  if (model && !hasCapability(model, 'embeddings')) {
    errors.push(`Model ${model} does not support embeddings`);
  }

  if (Array.isArray(request.input)) {
    if (request.input.length === 0) {
      errors.push('input array cannot be empty');
    }
    for (const [index, text] of request.input.entries()) {
      if (typeof text !== 'string' || text.trim().length === 0) {
        errors.push(`input[${index}] must be a non-empty string`);
      }
    }
  } else if (typeof request.input !== 'string' || request.input.trim().length === 0) {
    errors.push('input must be a non-empty string or array of strings');
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid Anthropic embedding request', errors);
  }
}

/**
 * Validate image generation request for Anthropic provider
 */
export function validateAnthropicImageRequest(request: ImageGenerationRequest): void {
  const errors: string[] = [];

  const model = MODEL_MAPPING[request.model];
  if (!model) {
    errors.push(`Unsupported model: ${request.model}`);
  }

  // Check if model supports image generation
  if (model && !hasCapability(model, 'imageGeneration')) {
    errors.push(`Model ${model} does not support image generation`);
  }

  if (typeof request.prompt !== 'string' || request.prompt.trim().length === 0) {
    errors.push('prompt must be a non-empty string');
  }

  if (request.n !== undefined && (request.n < 1 || request.n > 4)) {
    errors.push('n must be between 1 and 4');
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid Anthropic image generation request', errors);
  }
}
