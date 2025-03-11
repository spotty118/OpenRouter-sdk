// Type definitions for @google/generative-ai
// Project: https://github.com/google/generative-ai-js
// Definitions by: OpenRouter SDK Team

declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(options: { model: string }): GenerativeModel;
  }

  export interface GenerationConfig {
    temperature?: number;
    maxOutputTokens?: number;
    [key: string]: any;
  }

  export interface Content {
    parts: Part[];
    role?: string;
  }

  export type Part = 
    | { text: string } 
    | { inlineData: { mimeType: string; data: string } };

  export interface GenerativeModel {
    generateContent(
      contents: string | Content | Part[] | Part,
      config?: GenerationConfig
    ): Promise<GenerateContentResponse>;
  }

  export interface GenerateContentResponse {
    response: {
      text(): string;
      [key: string]: any;
    };
  }
}