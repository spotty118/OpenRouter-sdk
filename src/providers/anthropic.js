/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async createChatCompletion(params) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        temperature: params.temperature,
        max_tokens: params.max_tokens
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: data.content[0].text
        }
      }]
    };
  }

  async createChatCompletionStream(params) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    return response.body;
  }
}
