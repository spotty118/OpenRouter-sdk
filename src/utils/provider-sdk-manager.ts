/**
 * Provider SDK Manager
 *
 * This class manages the integration with OpenAI, Claude/Anthropic, and Google Gemini SDKs.
 * It provides a unified interface for accessing these SDKs and handles authentication.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiClient, GeminiResponse } from '../interfaces/gemini-client.js';
// Re-export the GeminiClient type for use in examples
export type { GeminiClient, GeminiResponse };

// Define enhanced Anthropic type to include messages.create() method
// This matches the expected API in the example files
export interface AnthropicMessages {
  create: (params: any) => Promise<any>;
}

export interface EnhancedAnthropic {
  apiKey: string;
  messages: AnthropicMessages;
  // Add other properties as needed
}

/**
 * Provider SDK Manager class
 */
export class ProviderSDKManager {
  private openAIClient: OpenAI | null = null;
  private anthropicClient: EnhancedAnthropic | null = null;
  private geminiClient: GeminiClient | null = null;
  private googleAIClient: GoogleGenerativeAI | null = null;
  
  /**
   * Initialize the OpenAI client
   * @returns OpenAI client instance
   */
  public getOpenAIClient(): OpenAI {
    if (!this.openAIClient) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
      
      if (!apiKey || apiKey === '') {
        throw new Error('OpenAI API key not found. Set OPENAI_API_KEY or OPENROUTER_API_KEY environment variable.');
      }
      
      this.openAIClient = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.OPENAI_API_KEY ? undefined : 'https://openrouter.ai/api/v1'
      });
    }
    
    return this.openAIClient;
  }
  
  /**
   * Initialize the Anthropic client
   * @returns Enhanced Anthropic client instance with messages API
   */
  public getAnthropicClient(): EnhancedAnthropic {
    if (!this.anthropicClient) {
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
      
      if (!apiKey) {
        throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY environment variable.');
      }
      
      if (process.env.ANTHROPIC_API_KEY) {
        // Create an enhanced Anthropic client wrapper
        const anthropicSdk = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        
        // Create our enhanced client with the messages.create method
        this.anthropicClient = {
          apiKey: process.env.ANTHROPIC_API_KEY,
          messages: {
            create: async (params: any) => {
              try {
                // For newer SDK versions that have messages API
                // Use type assertion to avoid TypeScript errors
                const sdkWithMessages = anthropicSdk as any;
                if (sdkWithMessages.messages && typeof sdkWithMessages.messages.create === 'function') {
                  return await sdkWithMessages.messages.create(params);
                }
                
                // Fallback to completions API for older SDK versions
                // Convert the request format to match what completions expects
                let prompt = '';
                
                if (params.system) {
                  prompt += `\n\nSystem: ${params.system}`;
                }
                
                // Format messages
                for (const msg of params.messages) {
                  const role = msg.role === 'assistant' ? 'Assistant' : 'Human';
                  prompt += `\n\n${role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`;
                }
                
                prompt += '\n\nAssistant:';
                
                // Use the completions API
                const response = await anthropicSdk.completions.create({
                  model: params.model,
                  prompt: prompt,
                  // Map parameters appropriately
                  max_tokens_to_sample: params.max_tokens || 1000,
                  temperature: params.temperature,
                  top_p: params.top_p,
                  top_k: params.top_k,
                  stop_sequences: params.stop_sequences,
                  stream: params.stream,
                });
                
                // Transform the completions response to match messages response format
                // Use type assertion for response properties to avoid TypeScript errors
                const responseData = response as any;
                return {
                  id: responseData.id || 'completion_id',
                  model: responseData.model || params.model,
                  content: [{ type: 'text', text: response.completion }],
                  role: 'assistant',
                  stop_reason: responseData.stop_reason || 'stop',
                  usage: responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                };
              } catch (error) {
                console.error('Anthropic API error:', error);
                throw error;
              }
            }
          }
        };
      } else {
        // Use OpenRouter as a proxy
        this.anthropicClient = this.createOpenRouterAnthropicClient(apiKey);
      }
    }
    
    return this.anthropicClient;
  }
  
  /**
   * Initialize the Google Generative AI client
   * @returns GeminiClient interface for interacting with Google's AI models
   */
  public getGeminiClient(): GeminiClient {
    // If we already have a client instance, return a wrapper for it
    if (this.geminiClient) {
      return this.geminiClient;
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey || apiKey === '') {
      throw new Error('Google API key not found. Set GOOGLE_API_KEY or OPENROUTER_API_KEY environment variable.');
    }
    
    if (process.env.GOOGLE_API_KEY) {
      // Direct Google AI integration
      this.googleAIClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      
      // Create a client wrapper
      this.geminiClient = this.createGeminiClientWrapper();
    } else {
      // Use OpenRouter as a proxy
      this.geminiClient = this.createOpenRouterGeminiClient(apiKey);
    }
    
    return this.geminiClient;
  }
  
  /**
   * Create a wrapper for the Google Gemini client that matches our interface
   * @private
   * @returns GeminiClient wrapper
   */
  private createGeminiClientWrapper(): GeminiClient {
    if (!this.googleAIClient) {
      throw new Error('GoogleAI client not initialized');
    }
    
    return {
      generateText: async (model: string, prompt: string, options: Record<string, unknown> = {}) => {
        const geminiModel = this.googleAIClient!.getGenerativeModel({ model });
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        return {
          text: response.text(),
          raw: response
        };
      },
      
      multiModal: async (model: string, prompt: string, imageUrl: string, options: Record<string, unknown> = {}) => {
        const geminiModel = this.googleAIClient!.getGenerativeModel({ model });
        
        // Fetch the image data
        const response = await fetch(imageUrl);
        const imageData = await response.arrayBuffer();
        
        // Convert to base64
        const base64 = Buffer.from(imageData).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        
        // Create multimodal content
        const parts = [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64
            }
          }
        ];
        
        const result = await geminiModel.generateContent(parts);
        const textResponse = result.response;
        
        return {
          text: textResponse.text(),
          raw: textResponse
        };
      }
    };
  }
  
  /**
   * Create an Anthropic client that uses OpenRouter as a proxy
   * @param apiKey OpenRouter API key
   * @returns Enhanced Anthropic client that uses OpenRouter
   */
  private createOpenRouterAnthropicClient(apiKey: string): EnhancedAnthropic {
    // Anthropic client implementation using OpenRouter
    // This is a simplified adapter implementation
    return {
      apiKey,
      messages: {
        create: async ({ model, system, messages, temperature, max_tokens }: any) => {
          const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://openrouter.ai/api/v1'
          });
          
          // Convert Anthropic API format to OpenRouter format
          const openaiMessages: any[] = [];
          
          if (system) {
            openaiMessages.push({ role: 'system', content: system });
          }
          
          // Add user messages
          for (const msg of messages) {
            openaiMessages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            });
          }
          
          const response = await openai.chat.completions.create({
            model: `anthropic/${model}`,
            messages: openaiMessages,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 1000
          });
          
          // Convert OpenRouter response back to Anthropic format
          return {
            id: response.id,
            model: model,
            content: [{ 
              type: 'text',
              text: response.choices[0].message.content || ''
            }]
          };
        }
      }
    };
  }
  
  /**
   * Create a Google Gemini client that uses OpenRouter as a proxy
   * @param apiKey OpenRouter API key
   * @returns Google Gemini client that uses OpenRouter
   */
  private createOpenRouterGeminiClient(apiKey: string): GeminiClient {
    return {
      generateText: async (model: string, prompt: string, options: Record<string, unknown> = {}) => {
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: 'https://openrouter.ai/api/v1'
        });
        
        const response = await openai.chat.completions.create({
          model: `google/${model}`,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature as number || 0.7,
          max_tokens: options.maxOutputTokens as number || 1000
        });
        
        return {
          text: response.choices[0].message.content || '',
          raw: response
        };
      },
      
      multiModal: async (model: string, prompt: string, imageUrl: string, options: Record<string, unknown> = {}) => {
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: 'https://openrouter.ai/api/v1'
        });
        
        // Create a multimodal message with image
        const response = await openai.chat.completions.create({
          model: `google/${model}`,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          temperature: options.temperature as number || 0.7,
          max_tokens: options.maxOutputTokens as number || 1000
        });
        
        return {
          text: response.choices[0].message.content || '',
          raw: response
        };
      }
    };
  }
}

