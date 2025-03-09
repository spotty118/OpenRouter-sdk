/**
 * Google Gemini API provider implementation
 */

import { Provider, ProviderConfig } from '../interfaces/provider.js';
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
import { ChatMessage } from '../interfaces/messaging.js';
import { Logger } from '../utils/logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

/**
 * Google Gemini specific configuration
 */
export interface GeminiConfig extends ProviderConfig {
  /**
   * Whether to include safety settings
   */
  includeSafetySettings?: boolean;

  /**
   * Safety settings for content generation
   */
  safetySettings?: any;
}

/**
 * Model mapping between OpenRouter and Gemini models
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Gemini model
  'google/gemini-pro': 'gemini-pro',
  'google/gemini-pro-vision': 'gemini-pro-vision',
  'google/gemini-1.5-pro': 'gemini-1.5-pro',
  'google/gemini-1.5-flash': 'gemini-1.5-flash',

  // Gemini model to OpenRouter model ID
  'gemini-pro': 'google/gemini-pro',
  'gemini-pro-vision': 'google/gemini-pro-vision',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'gemini-1.5-flash': 'google/gemini-1.5-flash'
};

/**
 * Google Gemini provider implementation
 */
export class GeminiProvider implements Provider {
  readonly name = 'google-gemini';
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;
  private safetySettings: any;
  private includeSafetySettings: boolean;

  /**
   * Create a new Gemini provider instance
   * 
   * @param config Gemini configuration options
   */
  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger('info');
    this.includeSafetySettings = config.includeSafetySettings !== undefined ? config.includeSafetySettings : true;
    this.safetySettings = config.safetySettings || this.getDefaultSafetySettings();

    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  /**
   * Get default safety settings for Gemini
   */
  private getDefaultSafetySettings() {
    return [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ];
  }

  /**
   * Map OpenRouter model ID to Gemini model
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns Gemini model name
   */
  mapToProviderModel(openRouterModelId: string): string {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Gemini model to OpenRouter model ID
   * 
   * @param geminiModel Gemini model name
   * @returns OpenRouter model ID
   */
  mapToOpenRouterModel(geminiModel: string): string {
    return MODEL_MAPPING[geminiModel] || geminiModel;
  }

  /**
   * Convert OpenRouter chat messages to Gemini format
   * 
   * @param messages OpenRouter chat messages
   * @returns Gemini format content parts
   */
  private convertMessagesToGeminiFormat(messages: ChatMessage[]): Array<{role: string, parts: Array<{text?: string, inlineData?: {mimeType: string, data: string}}>}> {
    const geminiMessages: Array<{role: string, parts: Array<{text?: string, inlineData?: {mimeType: string, data: string}}>}> = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (message.role === 'system' && i === 0) {
        // Handle system message - convert to user message for Gemini
        geminiMessages.push({
          role: 'user',
          parts: [{ text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }]
        });
        
        // Add a fake model response acknowledging the system instruction
        geminiMessages.push({
          role: 'model',
          parts: [{ text: 'I understand. I will act according to those instructions.' }]
        });
        continue;
      }
      
      // Map OpenRouter roles to Gemini roles
      let role = 'user';
      if (message.role === 'assistant') {
        role = 'model';
      }
      
      // Convert content to Gemini parts format
      let parts: Array<{text?: string, inlineData?: {mimeType: string, data: string}}> = [];
      if (typeof message.content === 'string') {
        parts = [{ text: message.content as string }];
      } else if (Array.isArray(message.content)) {
        parts = message.content.map(part => {
          if (part.type === 'text') {
            return { text: part.text };
          } else if (part.type === 'image_url') {
            // Convert image URLs to Gemini's inlineData format
            const url = part.image_url?.url || '';
            
            // If it's a data URL, parse it
            if (url.startsWith('data:image/')) {
              const match = url.match(/^data:image\/\w+;base64,(.+)$/);
              if (match) {
                return {
                  inlineData: {
                    mimeType: url.substring(5, url.indexOf(';')),
                    data: match[1]
                  }
                };
              }
            }
            
            // Regular URL - fetch will happen in client implementation
            return {
              inlineData: {
                mimeType: 'image/jpeg', // Default, could be improved with content negotiation
                data: '' // This would be filled by the actual implementation
              }
            };
          }
          return { text: JSON.stringify(part) }; // Fallback
        });
      }
      
      geminiMessages.push({ role, parts });
    }
    
    return geminiMessages;
  }

  /**
   * Convert Gemini response to OpenRouter format
   * 
   * @param geminiResponse Gemini API response
   * @param modelName Model name used for the request
   * @returns OpenRouter format completion response
   */
  private convertGeminiResponseToOpenRouterFormat(geminiResponse: any, modelName: string): CompletionResponse {
    const text = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Estimate token usage (very approximate)
    const promptTokens = Math.ceil(JSON.stringify(geminiResponse.promptFeedback).length / 4);
    const completionTokens = Math.ceil(text.length / 4);
    
    return {
      id: geminiResponse.candidates?.[0]?.responseId || `gemini-${Date.now()}`,
      model: this.mapToOpenRouterModel(modelName),
      choices: [
        {
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: geminiResponse.candidates?.[0]?.finishReason?.toLowerCase() || 'stop',
          index: 0
        }
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  }

  /**
   * Create chat completion with Gemini
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const geminiModel = this.mapToProviderModel(request.model);
    const geminiMessages = this.convertMessagesToGeminiFormat(request.messages);
    
    // Build the API URL with API key
    const url = `${this.baseUrl}/models/${geminiModel}:generateContent?key=${this.apiKey}`;
    
    // Build request payload
    const payload: any = {
      contents: geminiMessages,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        topP: request.top_p ?? 0.95,
        topK: request.top_k ?? 40,
        maxOutputTokens: request.max_tokens,
        stopSequences: request.additional_stop_sequences
      }
    };
    
    // Add safety settings if enabled
    if (this.includeSafetySettings) {
      payload.safetySettings = this.safetySettings;
    }
    
    // Add system instructions if present (for Gemini 1.5+)
    const systemMessage = request.messages.find(m => m.role === 'system');
    if (systemMessage && typeof systemMessage.content === 'string' && 
        (geminiModel.includes('gemini-1.5') || geminiModel.includes('1.5'))) {
      payload.systemInstruction = { text: systemMessage.content };
    }
    
    try {
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Gemini request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const geminiResponse = await response.json();
      return this.convertGeminiResponseToOpenRouterFormat(geminiResponse, geminiModel);
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling Gemini API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Stream chat completions from Gemini
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const geminiModel = this.mapToProviderModel(request.model);
    const geminiMessages = this.convertMessagesToGeminiFormat(request.messages);
    
    // Build the API URL with API key
    const url = `${this.baseUrl}/models/${geminiModel}:streamGenerateContent?key=${this.apiKey}`;
    
    // Build request payload
    const payload: any = {
      contents: geminiMessages,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        topP: request.top_p ?? 0.95,
        topK: request.top_k ?? 40,
        maxOutputTokens: request.max_tokens,
        stopSequences: request.additional_stop_sequences
      }
    };
    
    // Add safety settings if enabled
    if (this.includeSafetySettings) {
      payload.safetySettings = this.safetySettings;
    }
    
    // Add system instructions if present (for Gemini 1.5+)
    const systemMessage = request.messages.find(m => m.role === 'system');
    if (systemMessage && typeof systemMessage.content === 'string' && 
        (geminiModel.includes('gemini-1.5') || geminiModel.includes('1.5'))) {
      payload.systemInstruction = { text: systemMessage.content };
    }
    
    try {
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Gemini streaming request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new OpenRouterError('Response body is not readable', 0, null);
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      let responseId = `gemini-${Date.now()}`;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || line.includes('[DONE]')) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.promptFeedback) continue; // Skip prompt feedback
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const finishReason = data.candidates?.[0]?.finishReason?.toLowerCase();
            
            // Use response ID if provided
            if (data.candidates?.[0]?.responseId) {
              responseId = data.candidates[0].responseId;
            }
            
            yield {
              id: responseId,
              model: this.mapToOpenRouterModel(geminiModel),
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: text
                  },
                  finish_reason: finishReason || 'stop',
                  index: 0
                }
              ]
            };
          } catch (e) {
            this.logger.warn('Failed to parse Gemini stream data:', line);
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error streaming from Gemini API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate embeddings with Gemini
   * 
   * @param request Embedding request parameters
   * @returns Promise resolving to embedding response
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const embeddingModel = this.mapToProviderModel(request.model);
    
    // Build the API URL with API key
    const url = `${this.baseUrl}/models/${embeddingModel}:embedContent?key=${this.apiKey}`;
    
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    
    try {
      const results = [];
      let totalTokens = 0;
      
      for (let i = 0; i < inputs.length; i++) {
        const payload = {
          model: embeddingModel,
          content: {
            parts: [{ text: inputs[i] }]
          }
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeout)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new OpenRouterError(
            `Gemini embedding request failed with status ${response.status}`, 
            response.status, 
            errorData
          );
        }
        
        const data = await response.json();
        const embedding = data.embedding?.values || [];
        
        // Estimate token count based on input length
        const tokens = Math.ceil(inputs[i].length / 4);
        totalTokens += tokens;
        
        results.push({
          embedding,
          index: i,
          object: 'embedding'
        });
      }
      
      return {
        id: `gemini-emb-${Date.now()}`,
        object: 'list',
        data: results,
        model: this.mapToOpenRouterModel(embeddingModel),
        usage: {
          prompt_tokens: totalTokens,
          total_tokens: totalTokens
        }
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error creating embeddings with Gemini API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
}
