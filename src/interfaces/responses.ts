export interface CompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingResponse {
  id: string;
  model: string;
  object?: string; // Added for compatibility with provider implementations
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface AudioTranscriptionResponse {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  language?: string;
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: number;
    details?: unknown;
    type?: string;
  };
}
