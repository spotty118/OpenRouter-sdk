/**
 * Anthropic API provider implementation for Claude models
 */

import { Provider } from '../interfaces/provider.js';
import { ModelCapabilities } from '../interfaces/provider-capabilities.js';
import { AnthropicConfig } from '../interfaces/provider-config.js';
import { 
  CompletionRequest, 
  EmbeddingRequest,
  ImageGenerationRequest,
  AudioTranscriptionRequest
} from '../interfaces/requests.js';
import {
  CompletionResponse,
  EmbeddingResponse,
  ImageGenerationResponse,
  AudioTranscriptionResponse
} from '../interfaces/responses.js';
import { countTokens } from '../utils/token-counter.js';
import { ChatMessage } from '../interfaces/messaging.js';
import { Logger } from '../utils/logger.js';
import { APIClient, APIError } from '../utils/provider-utils.js';
import { AnthropicRateLimiter } from '../utils/anthropic-rate-limiter.js';
import { dynamicCapabilities } from '../utils/dynamic-capabilities.js';
import { MODEL_CAPABILITIES } from '../utils/anthropic-config.js';
import { 
  validateAnthropicCompletionRequest,
  validateAnthropicEmbeddingRequest,
  validateAnthropicImageRequest
} from '../utils/anthropic-validation.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * Model mapping between OpenRouter and Anthropic models
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Anthropic model
  'anthropic/claude-3-opus-20240229': 'claude-3-opus-20240229',
  'anthropic/claude-3-sonnet-20240229': 'claude-3-sonnet-20240229',
  'anthropic/claude-3-haiku-20240307': 'claude-3-haiku-20240307',
  'anthropic/claude-2.1': 'claude-2.1',
  'anthropic/claude-2.0': 'claude-2.0',
  'anthropic/claude-instant-1.2': 'claude-instant-1.2',

  // Anthropic model to OpenRouter model ID
  'claude-3-opus-20240229': 'anthropic/claude-3-opus-20240229',
  'claude-3-sonnet-20240229': 'anthropic/claude-3-sonnet-20240229',
  'claude-3-haiku-20240307': 'anthropic/claude-3-haiku-20240307',
  'claude-2.1': 'anthropic/claude-2.1',
  'claude-2.0': 'anthropic/claude-2.0',
  'claude-instant-1.2': 'anthropic/claude-instant-1.2'
};

/**
 * Anthropic error response type
 */
interface AnthropicErrorResponse {
  error: {
    type: string;
    message: string;
    code?: string;
  };
}

/**
 * Anthropic (Claude) provider implementation
 */
export class AnthropicProvider implements Provider {
  readonly name = 'anthropic';
  readonly oneApiEnabled: boolean;
  readonly oneApiClient?: any;
  
  private apiClient: APIClient;
  private rateLimiter: AnthropicRateLimiter;
  private logger: Logger;
  private claudeVersion: string;
  private metricsEnabled: boolean;
  
  private readonly supportedFeatures = {
    embeddings: true,
    imageGeneration: true,
    audioTranscription: false,
    visionPreview: true
  };

  // Add messages property to match the Anthropic client API format
  public messages = {
    create: async (params: any) => {
      // Convert from Anthropic SDK format to our internal format
      const adaptedRequest: CompletionRequest = {
        model: params.model,
        messages: params.messages || [],
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        top_p: params.top_p,
        top_k: params.top_k,
        stream: params.stream
      };
      
      return this.createChatCompletion(adaptedRequest);
    }
  };

  constructor(config: AnthropicConfig) {
    // Validate required config
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    
    this.logger = new Logger('info');
    this.claudeVersion = config.claudeVersion || '2023-06-01';
    
    // Initialize OneAPI integration if enabled
    this.oneApiEnabled = config.oneApi?.enabled || false;
    this.metricsEnabled = config.oneApi?.trackMetrics || false;
    
    if (this.oneApiEnabled && config.oneApi?.configId) {
      try {
        // Initialize OneAPI client (implementation details would go here)
        this.oneApiClient = {}; // Placeholder for actual OneAPI client
      } catch (error) {
        this.logger.warn('Failed to initialize OneAPI client:', error);
      }
    }
    
    // Initialize rate limiter
    this.rateLimiter = new AnthropicRateLimiter(config.rateLimits);
    
    // Initialize capabilities monitoring for each supported model
    Object.entries(MODEL_CAPABILITIES).forEach(([modelId, capabilities]: [string, ModelCapabilities]) => {
      dynamicCapabilities.initializeModelCapabilities(
        modelId,
        capabilities,
        {
          interval: 30000, // Check every 30 seconds
          threshold: 0.85  // 85% success rate required
        }
      );
    });

    // Initialize API client
    this.apiClient = new APIClient({
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': this.claudeVersion,
        ...config.headers
      },
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: 1000,
      shouldRetry: (error) => {
        if (error instanceof Error) {
          // Retry on rate limits and server errors
          return error.message.includes('429') || 
                 error.message.includes('500') ||
                 error.message.includes('503');
        }
        return false;
      }
    });
  }

  mapToProviderModel(openRouterModelId: string): string {
    const model = MODEL_MAPPING[openRouterModelId];
    if (!model) {
      throw new OpenRouterError(
        `Unsupported model: ${openRouterModelId}`,
        400,
        null
      );
    }
    return model;
  }

  mapToOpenRouterModel(anthropicModel: string): string {
    return MODEL_MAPPING[anthropicModel] || anthropicModel;
  }

  async checkModelAvailability(modelId: string): Promise<boolean> {
    try {
      const anthropicModel = this.mapToProviderModel(modelId);
      if (!MODEL_MAPPING[modelId]) {
        return false;
      }

      const status = await this.rateLimiter.getStatus(anthropicModel);
      // Check if we're within rate limits
      if (status.requests === 0 && status.tokens === 0) {
        return true;
      }
      // Allow if we have less than 80% utilization
      return (status.activeRequests < 40); // 80% of default 50 concurrent limit
    } catch {
      return false;
    }
  }

  private convertMessagesToAnthropicFormat(messages: ChatMessage[]): { system?: string; messages: any[] } {
    let systemPrompt: string | undefined;
    const anthropicMessages: any[] = [];
    
    // Extract system message if it's the first one
    if (messages.length > 0 && messages[0].role === 'system') {
      const systemMessage = messages[0];
      if (typeof systemMessage.content === 'string') {
        systemPrompt = systemMessage.content;
      } else {
        // If system message has multiple content parts, convert to text
        systemPrompt = JSON.stringify(systemMessage.content);
      }
      messages = messages.slice(1);
    }
    
    // Convert remaining messages
    for (const message of messages) {
      if (message.role === 'user' || message.role === 'assistant') {
        let content: any;
        
        if (typeof message.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          // For multimodal messages (Claude 3 supports images)
          content = message.content.map(part => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'image_url') {
              // Convert to Claude's media format
              const mediaType = part.image_url?.url?.startsWith('data:') 
                ? 'base64' 
                : 'url';
              
              let source: any = {};
              
              if (mediaType === 'base64') {
                // Extract base64 data
                const match = part.image_url?.url?.match(/^data:image\/\w+;base64,(.+)$/);
                if (match) {
                  source = {
                    type: 'base64',
                    media_type: part.image_url?.url?.substring(5, part.image_url?.url?.indexOf(';')),
                    data: match[1]
                  };
                }
              } else {
                source = {
                  type: 'url',
                  url: part.image_url?.url
                };
              }
              
              return {
                type: 'image',
                source
              };
            }
            
            return { type: 'text', text: JSON.stringify(part) };
          });
        }
        
        anthropicMessages.push({
          role: message.role,
          content
        });
      }
    }
    
    return {
      system: systemPrompt,
      messages: anthropicMessages
    };
  }

  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const requestStartTime = new Date();
    const requestStartMs = Date.now();
    const anthropicModel = this.mapToProviderModel(request.model);
    
    try {
      // Validate request using enhanced validation
      validateAnthropicCompletionRequest(request);
      const formattedRequest = this.convertMessagesToAnthropicFormat(request.messages);
      
      // Calculate token count for rate limiting
      const inputTokens = countTokens(JSON.stringify(request.messages));
      await this.rateLimiter.waitForCapacity(anthropicModel, inputTokens);

      const payload = {
        model: anthropicModel,
        messages: formattedRequest.messages,
        max_tokens: request.max_tokens || 1024,
        stream: false,
        ...(formattedRequest.system && { system: formattedRequest.system }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.top_p !== undefined && { top_p: request.top_p }),
        ...(request.top_k !== undefined && { top_k: request.top_k }),
        ...(request.additional_stop_sequences && { stop_sequences: request.additional_stop_sequences })
      };

      const anthropicResponse = await this.apiClient.request<any>(
        '/messages',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      
      // Process response
      const content = anthropicResponse.content || [];
      let responseText = '';
      
      for (const item of content) {
        if (item.type === 'text') {
          responseText += item.text;
        }
      }
      
      const promptTokens = anthropicResponse.usage?.input_tokens || 0;
      const completionTokens = anthropicResponse.usage?.output_tokens || 0;
      
      const response = {
        id: anthropicResponse.id || `anthropic-${Date.now()}`,
        model: this.mapToOpenRouterModel(anthropicModel),
        choices: [
          {
            message: {
              role: 'assistant',
              content: responseText
            },
            finish_reason: anthropicResponse.stop_reason || 'stop',
            index: 0
          }
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      };

      // Track capabilities and metrics
      const requestLatencyMs = Date.now() - requestStartMs;
      dynamicCapabilities.trackRequest(
        anthropicModel,
        'chat',
        true,
        requestLatencyMs
      );

      // Track standard metrics if enabled
      if (this.metricsEnabled) {
        this.trackMetrics({
          requestType: 'completion',
          model: request.model,
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          startTime: requestStartTime,
          endTime: new Date(),
          status: 'success'
        });
      }

      // Release rate limit
      this.rateLimiter.release(anthropicModel);

      return response;

    } catch (error: unknown) {
      // Track capability failure
      dynamicCapabilities.trackRequest(
        anthropicModel,
        'chat',
        false,
        Date.now() - requestStartMs
      );

      // Release rate limit on error
      this.rateLimiter.release(request.model);

      if (error instanceof APIError || error instanceof OpenRouterError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.metricsEnabled) {
        this.trackMetrics({
          requestType: 'completion',
          model: request.model,
          startTime: requestStartTime,
          endTime: new Date(),
          status: 'error',
          errorMessage
        });
      }
      
      throw new OpenRouterError(
        `Error calling Anthropic API: ${errorMessage}`,
        500,
        null
      );
    }
  }

  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const requestStartTime = new Date();
    const requestStartMs = Date.now();
    let totalOutputTokens = 0;
    let streamSuccess = false;

    const anthropicModel = this.mapToProviderModel(request.model);

    try {
      validateAnthropicCompletionRequest(request);
      const formattedRequest = this.convertMessagesToAnthropicFormat(request.messages);

      // Wait for rate limit capacity
      const inputTokens = countTokens(JSON.stringify(request.messages));
      await this.rateLimiter.waitForCapacity(anthropicModel, inputTokens);
      
      const payload = {
        model: anthropicModel,
        messages: formattedRequest.messages,
        max_tokens: request.max_tokens || 1024,
        stream: true,
        ...(formattedRequest.system && { system: formattedRequest.system }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.top_p !== undefined && { top_p: request.top_p }),
        ...(request.top_k !== undefined && { top_k: request.top_k }),
        ...(request.additional_stop_sequences && { stop_sequences: request.additional_stop_sequences })
      };

      let responseId = `anthropic-${Date.now()}`;

      for await (const chunk of this.apiClient.stream<Partial<CompletionResponse>>(
        '/messages',
        {
          method: 'POST',
          body: JSON.stringify(payload),
          parse: (line: string) => {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') return null;
            
            try {
              const data = JSON.parse(line.slice(6));
              
              if (!data.type || data.type === 'ping') return null;

              if (data.message_id) {
                responseId = data.message_id;
              }

              if (data.type === 'content_block_delta') {
                const content = data.delta?.text || '';
                totalOutputTokens += Math.ceil(content.length / 4);

                return {
                  id: responseId,
                  model: this.mapToOpenRouterModel(anthropicModel),
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content
                      },
                      finish_reason: null as unknown as string,
                      index: 0
                    }
                  ]
                };
              } else if (data.type === 'message_stop') {
                streamSuccess = true;
                return {
                  id: responseId,
                  model: this.mapToOpenRouterModel(anthropicModel),
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content: ''
                      },
                      finish_reason: data.stop_reason || 'stop',
                      index: 0
                    }
                  ]
                };
              }
            } catch (e) {
              this.logger.warn('Failed to parse Anthropic stream data:', line);
              return null;
            }
            return null;
          },
          onError: (error) => {
            this.logger.error('Anthropic streaming error:', error);
          }
        }
      )) {
        yield chunk;
      }

      // Track capabilities and metrics
      const requestLatencyMs = Date.now() - requestStartMs;
      dynamicCapabilities.trackRequest(
        anthropicModel,
        'streaming',
        streamSuccess,
        requestLatencyMs
      );

      if (this.metricsEnabled) {
        this.trackMetrics({
          requestType: 'streaming',
          model: request.model,
          inputTokens,
          outputTokens: totalOutputTokens,
          startTime: requestStartTime,
          endTime: new Date(),
          status: streamSuccess ? 'success' : 'error'
        });
      }

      // Release rate limit
      this.rateLimiter.release(anthropicModel);

    } catch (error: unknown) {
      // Release rate limit on error
      this.rateLimiter.release(request.model);

      if (error instanceof APIError || error instanceof OpenRouterError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.metricsEnabled) {
        this.trackMetrics({
          requestType: 'streaming',
          model: request.model,
          startTime: requestStartTime,
          endTime: new Date(),
          status: 'error',
          errorMessage
        });
      }

      throw new OpenRouterError(
        `Error streaming from Anthropic API: ${errorMessage}`,
        500,
        null
      );
    }
  }

  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.supportedFeatures.embeddings) {
      throw new OpenRouterError('Embeddings not supported by Anthropic', 400, null);
    }

    const requestStartTime = new Date();
    const requestStartMs = Date.now();
    const anthropicModel = this.mapToProviderModel(request.model);

    try {
      validateAnthropicEmbeddingRequest(request);
      const inputTokens = countTokens(
        Array.isArray(request.input) ? request.input.join(' ') : request.input
      );
      
      await this.rateLimiter.waitForCapacity(anthropicModel, inputTokens);

      const response = await this.apiClient.request<any>(
        '/embeddings',
        {
          method: 'POST',
          body: JSON.stringify({
            model: anthropicModel,
            input: request.input,
            encoding_format: request.encoding_format
          })
        }
      );

      const result = {
        id: response.id,
        object: 'embedding',
        data: response.embeddings,
        model: this.mapToOpenRouterModel(response.model),
        usage: {
          prompt_tokens: response.usage?.input_tokens || inputTokens,
          total_tokens: response.usage?.input_tokens || inputTokens
        }
      };

      // Track capabilities and metrics
      const requestLatencyMs = Date.now() - requestStartMs;
      dynamicCapabilities.trackRequest(
        anthropicModel,
        'embeddings',
        true,
        requestLatencyMs
      );

      if (this.metricsEnabled) {
        this.trackMetrics({
          requestType: 'embedding',
          model: request.model,
          inputTokens: result.usage.prompt_tokens,
          startTime: requestStartTime,
          endTime: new Date(),
          status: 'success'
        });
      }

      this.rateLimiter.release(anthropicModel);
      return result;

    } catch (error) {
      this.rateLimiter.release(request.model);

      if (error instanceof APIError) {
        const anthropicError = error.rawError as AnthropicErrorResponse;
        const errorMessage = anthropicError?.error?.message || error.message;

        if (this.metricsEnabled) {
          this.trackMetrics({
            requestType: 'embedding',
            model: request.model,
            startTime: requestStartTime,
            endTime: new Date(),
            status: 'error',
            errorMessage
          });
        }

        throw new OpenRouterError(
          `Anthropic embeddings error: ${errorMessage}`,
          error.status,
          anthropicError
        );
      }
      throw error;
    }
  }

  async createImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.supportedFeatures.imageGeneration) {
      throw new OpenRouterError('Image generation not supported by Anthropic', 400, null);
    }

    const requestStartTime = new Date();
    try {
      validateAnthropicImageRequest(request);
      
      // Use Claude 3 Vision for image generation
      const response = await this.createChatCompletion({
        model: 'anthropic/claude-3-opus-20240229',
        messages: [
          {
            role: 'system',
            content: 'You are an image generation assistant. Generate images based on prompts.'
          },
          {
            role: 'user',
            content: `Generate an image matching this description: ${request.prompt}`
          }
        ],
        max_tokens: 4096
      });

      const imageMatch = response.choices[0].message.content.match(/https:\/\/[^\s)]+/);
      if (!imageMatch) {
        throw new Error('No image URL found in response');
      }

      const result = {
        created: Date.now(),
        data: [
          {
            url: imageMatch[0],
            revised_prompt: request.prompt
          }
        ]
      };

      if (this.metricsEnabled) {
        this.trackMetrics({
          requestType: 'image_generation',
          model: request.model,
          startTime: requestStartTime,
          endTime: new Date(),
          status: 'success'
        });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.metricsEnabled) {
        this.trackMetrics({
          requestType: 'image_generation',
          model: request.model,
          startTime: requestStartTime,
          endTime: new Date(),
          status: 'error',
          errorMessage
        });
      }

      if (error instanceof APIError) {
        const anthropicError = error.rawError as AnthropicErrorResponse;
        throw new OpenRouterError(
          `Anthropic image generation error: ${anthropicError?.error?.message || error.message}`,
          error.status,
          anthropicError
        );
      }
      throw error;
    }
  }

  trackMetrics(metrics: {
    requestType: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    startTime: Date;
    endTime?: Date;
    status: 'success' | 'error';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.metricsEnabled || !this.oneApiClient) {
      return;
    }

    try {
      this.oneApiClient.trackMetrics({
        ...metrics,
        provider: this.name,
        endTime: metrics.endTime || new Date()
      });
    } catch (error) {
      this.logger.warn('Failed to track metrics:', error);
    }
  }

  async getMetrics(options?: {
    startDate?: Date;
    endDate?: Date;
    model?: string;
    requestType?: string;
  }): Promise<any> {
    if (!this.metricsEnabled || !this.oneApiClient) {
      throw new Error('Metrics tracking is not enabled');
    }

    try {
      return await this.oneApiClient.getMetrics({
        provider: this.name,
        ...options
      });
    } catch (error) {
      throw new OpenRouterError(
        `Failed to get metrics: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
}
