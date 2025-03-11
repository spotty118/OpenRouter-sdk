/**
 * Together Provider Implementation
 */
export class TogetherProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async createChatCompletion(params) {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        request_type: 'language-model-inference'
      })
    });

    if (!response.ok) {
      throw new Error(`Together API error: ${response.status}`);
    }

    return await response.json();
  }

  async createChatCompletionStream(params) {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        stream: true,
        request_type: 'language-model-inference'
      })
    });

    if (!response.ok) {
      throw new Error(`Together API error: ${response.status}`);
    }

    return response.body;
  }
}
