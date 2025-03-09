/**
 * Google Vertex AI provider implementation
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
 * Google Vertex AI specific configuration
 */
export interface VertexAIConfig extends ProviderConfig {
  /**
   * Google Cloud project ID
   */
  projectId: string;

  /**
   * Google Cloud location/region
   */
  location?: string;
}

/**
 * Model mapping between OpenRouter and Vertex AI models
 */
const MODEL_MAPPING: Record<string, string> = {
  // OpenRouter model ID to Vertex AI model
  'google-vertex/text-bison': 'text-bison',
  'google-vertex/gemini-pro': 'gemini-pro',
  'google-vertex/gemini-pro-vision': 'gemini-pro-vision',
  'google-vertex/gemini-ultra': 'gemini-ultra',
  'google-vertex/gemini-1.5-pro': 'gemini-1.5-pro',
  'google-vertex/gemini-1.5-flash': 'gemini-1.5-flash',
  'google-vertex/text-embedding-gecko': 'text-embedding-gecko',
  'google-vertex/multimodalembedding': 'multimodalembedding',
  'google-vertex/imagegeneration': 'imagegeneration',
  
  // Vertex AI model to OpenRouter model ID
  'text-bison': 'google-vertex/text-bison',
  'gemini-pro': 'google-vertex/gemini-pro',
  'gemini-pro-vision': 'google-vertex/gemini-pro-vision',
  'gemini-ultra': 'google-vertex/gemini-ultra',
  'gemini-1.5-pro': 'google-vertex/gemini-1.5-pro',
  'gemini-1.5-flash': 'google-vertex/gemini-1.5-flash',
  'text-embedding-gecko': 'google-vertex/text-embedding-gecko',
  'multimodalembedding': 'google-vertex/multimodalembedding',
  'imagegeneration': 'google-vertex/imagegeneration'
};

/**
 * Google Vertex AI provider implementation
 */
export class VertexAIProvider implements Provider {
  readonly name = 'google-vertex';
  private apiKey: string;
  private baseUrl: string;
  private projectId: string;
  private location: string;
  private headers: Record<string, string>;
  private timeout: number;
  private maxRetries: number;
  private logger: Logger;

  /**
   * Create a new Vertex AI provider instance
   * 
   * @param config Vertex AI configuration options
   */
  constructor(config: VertexAIConfig) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.location = config.location || 'us-central1';
    this.baseUrl = config.baseUrl || `https://${this.location}-aiplatform.googleapis.com/v1`;
    this.timeout = config.timeout || 60000; // Vertex operations might take longer
    this.maxRetries = config.maxRetries || 3;
    this.logger = new Logger('info');

    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...config.headers
    };
  }

  /**
   * Map OpenRouter model ID to Vertex AI model
   * 
   * @param openRouterModelId OpenRouter model ID
   * @returns Vertex AI model name
   */
  mapToProviderModel(openRouterModelId: string): string {
    return MODEL_MAPPING[openRouterModelId] || openRouterModelId;
  }

  /**
   * Map Vertex AI model to OpenRouter model ID
   * 
   * @param vertexModel Vertex AI model name
   * @returns OpenRouter model ID
   */
  mapToOpenRouterModel(vertexModel: string): string {
    return MODEL_MAPPING[vertexModel] || vertexModel;
  }

  /**
   * Convert OpenRouter chat messages to Vertex AI format
   * 
   * @param messages OpenRouter chat messages
   * @param modelId Vertex model ID
   * @returns Vertex AI format content
   */
  private convertMessagesToVertexFormat(messages: ChatMessage[], modelId: string): any {
    // For Gemini models
    if (modelId.includes('gemini')) {
      const geminiMessages: Array<{role: string, parts: Array<{text?: string, inlineData?: {mimeType: string, data: string}}>}> = [];
      
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        if (message.role === 'system' && i === 0) {
          // Handle system message for Gemini - convert to user message
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
      
      return {
        contents: geminiMessages
      };
    } 
    // For PaLM models (text-bison)
    else if (modelId.includes('text-bison')) {
      // Extract system message if present (first message)
      let systemPrompt = '';
      let prompt = '';
      
      // Check for system message (typically the first message)
      if (messages.length > 0 && messages[0].role === 'system') {
        systemPrompt = typeof messages[0].content === 'string' 
          ? messages[0].content 
          : JSON.stringify(messages[0].content);
      }
      
      // Build conversation history
      for (let i = systemPrompt ? 1 : 0; i < messages.length; i++) {
        const message = messages[i];
        const content = typeof message.content === 'string' 
          ? message.content 
          : JSON.stringify(message.content);
        
        if (message.role === 'user') {
          prompt += `User: ${content}\n`;
        } else if (message.role === 'assistant') {
          prompt += `Assistant: ${content}\n`;
        } else if (message.role === 'tool') {
          prompt += `Tool: ${content}\n`;
        }
      }
      
      // Add final prompt
      prompt += 'Assistant:';
      
      // If there's a system prompt, add it at the beginning
      if (systemPrompt) {
        prompt = `${systemPrompt}\n\n${prompt}`;
      }
      
      return {
        prompt: prompt
      };
    }
    
    // Default to standard chat format if model not specifically handled
    const history: any[] = [];
    let context = '';
    
    // Extract system message if present
    if (messages.length > 0 && messages[0].role === 'system') {
      context = typeof messages[0].content === 'string' 
        ? messages[0].content 
        : JSON.stringify(messages[0].content);
      messages = messages.slice(1);
    }
    
    // Convert remaining messages to Vertex format
    for (const message of messages) {
      const content = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
      
      if (message.role === 'user') {
        history.push({ author: 'user', content });
      } else if (message.role === 'assistant') {
        history.push({ author: 'assistant', content });
      }
    }
    
    return {
      context,
      messages: history
    };
  }

  /**
   * Convert Vertex AI response to OpenRouter format
   * 
   * @param vertexResponse Vertex API response
   * @param modelName Model name used for the request
   * @returns OpenRouter format completion response
   */
  private convertVertexResponseToOpenRouterFormat(vertexResponse: any, modelName: string): CompletionResponse {
    let messageContent = '';
    let finishReason = 'stop';
    let promptTokens = 0;
    let completionTokens = 0;
    
    // Parse Gemini model responses
    if (modelName.includes('gemini')) {
      messageContent = vertexResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
      finishReason = vertexResponse.candidates?.[0]?.finishReason?.toLowerCase() || 'stop';
      
      // Estimate token usage (very approximate)
      promptTokens = Math.ceil(JSON.stringify(vertexResponse.promptFeedback).length / 4);
      completionTokens = Math.ceil(messageContent.length / 4);
    } 
    // Parse PaLM model responses
    else if (modelName.includes('text-bison')) {
      messageContent = vertexResponse.predictions?.[0]?.content || vertexResponse.predictions?.[0]?.candidates?.[0]?.content || '';
      finishReason = 'stop'; // PaLM doesn't provide finish reason in the same way
      
      // Estimate token usage (very approximate)
      promptTokens = Math.ceil(vertexResponse.promptInput?.length / 4) || 0;
      completionTokens = Math.ceil(messageContent.length / 4);
    }
    // Default parsing for other models
    else {
      messageContent = vertexResponse.predictions?.[0]?.content || 
                       vertexResponse.predictions?.[0]?.text || 
                       vertexResponse.candidates?.[0]?.content || 
                       '';
      promptTokens = Math.ceil(JSON.stringify(vertexResponse).length / 8);
      completionTokens = Math.ceil(messageContent.length / 4);
    }
    
    return {
      id: `vertex-${Date.now()}`,
      model: this.mapToOpenRouterModel(modelName),
      choices: [
        {
          message: {
            role: 'assistant',
            content: messageContent
          },
          finish_reason: finishReason,
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
   * Create chat completion with Vertex AI
   * 
   * @param request Completion request parameters
   * @returns Promise resolving to completion response
   */
  async createChatCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const vertexModel = this.mapToProviderModel(request.model);
    
    // Build the request based on model type
    let url = '';
    let payload: any = {};
    
    // Configure for Gemini models
    if (vertexModel.includes('gemini')) {
      url = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${vertexModel}:generateContent`;
      
      const messages = this.convertMessagesToVertexFormat(request.messages, vertexModel);
      
      payload = {
        ...messages,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          topP: request.top_p ?? 0.95,
          topK: request.top_k ?? 40,
          maxOutputTokens: request.max_tokens,
          stopSequences: request.additional_stop_sequences
        }
      };
    } 
    // Configure for PaLM models
    else if (vertexModel.includes('text-bison')) {
      url = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${vertexModel}:predict`;
      
      const messages = this.convertMessagesToVertexFormat(request.messages, vertexModel);
      
      payload = {
        instances: [
          { prompt: messages.prompt }
        ],
        parameters: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.max_tokens ?? 1024,
          topP: request.top_p ?? 0.95,
          topK: request.top_k ?? 40
        }
      };
    }
    // Default configuration for other models
    else {
      url = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${vertexModel}:predict`;
      
      const messages = this.convertMessagesToVertexFormat(request.messages, vertexModel);
      
      payload = {
        instances: [messages],
        parameters: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.max_tokens ?? 1024,
          topP: request.top_p ?? 0.95,
          topK: request.top_k ?? 40
        }
      };
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
          `Vertex AI request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const vertexResponse = await response.json();
      return this.convertVertexResponseToOpenRouterFormat(vertexResponse, vertexModel);
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error calling Vertex AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Stream chat completions from Vertex AI
   * 
   * @param request Completion request parameters
   * @returns Async generator yielding completion response chunks
   */
  async *streamChatCompletions(request: CompletionRequest): AsyncGenerator<Partial<CompletionResponse>, void, unknown> {
    const vertexModel = this.mapToProviderModel(request.model);
    
    // Only Gemini models support streaming in Vertex AI
    if (!vertexModel.includes('gemini')) {
      // Fall back to non-streaming request for non-Gemini models
      const response = await this.createChatCompletion(request);
      yield response;
      return;
    }
    
    const url = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${vertexModel}:streamGenerateContent`;
    
    const messages = this.convertMessagesToVertexFormat(request.messages, vertexModel);
    
    const payload = {
      ...messages,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        topP: request.top_p ?? 0.95,
        topK: request.top_k ?? 40,
        maxOutputTokens: request.max_tokens,
        stopSequences: request.additional_stop_sequences
      }
    };
    
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
          `Vertex AI streaming request failed with status ${response.status}`, 
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
      let responseId = `vertex-${Date.now()}`;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.promptFeedback) continue; // Skip prompt feedback
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const finishReason = data.candidates?.[0]?.finishReason?.toLowerCase();
            
            yield {
              id: responseId,
              model: this.mapToOpenRouterModel(vertexModel),
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
            this.logger.warn('Failed to parse Vertex AI stream data:', line);
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error streaming from Vertex AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate embeddings with Vertex AI
   * 
   * @param request Embedding request parameters
   * @returns Promise resolving to embedding response
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const vertexModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${vertexModel}:predict`;
    
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    
    try {
      const results = [];
      let totalTokens = 0;
      
      for (let i = 0; i < inputs.length; i++) {
        const payload = {
          instances: [
            { content: inputs[i] }
          ],
          parameters: {
            autoTruncate: true
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
            `Vertex AI embedding request failed with status ${response.status}`, 
            response.status, 
            errorData
          );
        }
        
        const data = await response.json();
        const embedding = data.predictions?.[0]?.embeddings?.values || 
                          data.predictions?.[0]?.embedding || 
                          [];
        
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
        id: `vertex-emb-${Date.now()}`,
        object: 'list',
        data: results,
        model: this.mapToOpenRouterModel(vertexModel),
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
        `Error creating embeddings with Vertex AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }

  /**
   * Generate images with Vertex AI
   * 
   * @param request Image generation request parameters
   * @returns Promise resolving to image generation response
   */
  async createImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const vertexModel = this.mapToProviderModel(request.model);
    const url = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${vertexModel}:predict`;
    
    // Parse size dimensions
    let width = 1024;
    let height = 1024;
    if (request.size) {
      const dimensions = request.size.split('x');
      if (dimensions.length === 2) {
        width = parseInt(dimensions[0]);
        height = parseInt(dimensions[1]);
      }
    }
    
    const payload = {
      instances: [
        {
          prompt: request.prompt,
          sampleCount: request.n || 1,
          width,
          height
        }
      ],
      parameters: {
        sampleCount: request.n || 1
      }
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OpenRouterError(
          `Vertex AI image generation request failed with status ${response.status}`, 
          response.status, 
          errorData
        );
      }
      
      const vertexResponse = await response.json();
      
      // Convert Vertex AI response to OpenRouter format
      const images = vertexResponse.predictions || [];
      const data = images.map((prediction: any) => {
        if (request.response_format === 'b64_json') {
          return { b64_json: prediction.bytesBase64Encoded || prediction.b64_json };
        } else {
          // Normally Vertex would return a GCS URL, but we can't simulate that here
          // In production code, you'd use the bytesBase64Encoded to generate a URL or manage the files
          return { 
            url: '#vertex-image-placeholder', 
            b64_json: prediction.bytesBase64Encoded 
          };
        }
      });
      
      return {
        created: Date.now(),
        data
      };
    } catch (error: unknown) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterError(
        `Error generating images with Vertex AI API: ${error instanceof Error ? error.message : String(error)}`,
        500,
        null
      );
    }
  }
}
