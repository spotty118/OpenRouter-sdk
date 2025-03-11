/**
 * Response interface for Gemini API calls
 */
export interface GeminiResponse {
  /**
   * Generated text
   */
  text: string;
  
  /**
   * Raw response from the API
   */
  raw: unknown;
}

/**
 * Interface for working with Google's Gemini AI models
 */
export interface GeminiClient {
  /**
   * Generate text using a Gemini model
   * 
   * @param model - The model name/identifier
   * @param prompt - The text prompt to send to the model
   * @param options - Additional options like temperature, maxTokens, etc.
   */
  generateText(
    model: string, 
    prompt: string, 
    options?: Record<string, unknown>
  ): Promise<GeminiResponse>;

  /**
   * Process a multimodal input (text + image) using a Gemini model
   * 
   * @param model - The model name/identifier
   * @param prompt - The text prompt to send with the image
   * @param imageUrl - URL of the image to analyze
   * @param options - Additional options like temperature, maxTokens, etc.
   */
  multiModal(
    model: string, 
    prompt: string, 
    imageUrl: string, 
    options?: Record<string, unknown>
  ): Promise<GeminiResponse>;
}