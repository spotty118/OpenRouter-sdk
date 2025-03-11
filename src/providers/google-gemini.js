/**
 * Google Gemini Provider Implementation
 */
export class GeminiProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async createChatCompletion(params) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${params.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: params.messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.max_tokens,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: data.candidates[0].content.parts[0].text
        }
      }]
    };
  }

  async createChatCompletionStream(params) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${params.model}:streamGenerateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: params.messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.max_tokens,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google Gemini API error: ${response.status}`);
    }

    return response.body;
  }
}
