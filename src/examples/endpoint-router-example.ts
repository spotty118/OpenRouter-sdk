/**
 * Endpoint Router Example
 * 
 * This example demonstrates how to use the EndpointRouter to easily switch
 * between different LLM providers by just changing the API endpoint configuration.
 */

import { EndpointRouter, EndpointConfig } from '../core/endpoint-router.js';
import { ProviderManager } from '../utils/provider-manager.js';
import { OpenAIConfig } from '../providers/openai.js';
import { GeminiConfig } from '../providers/google-gemini.js';
import { AnthropicConfig } from '../providers/anthropic.js';
import { ProviderType } from '../interfaces/provider.js';

/**
 * Example showing how to use the Endpoint Router
 */
async function main() {
  console.log('OpenRouter SDK Endpoint Router Example');
  console.log('-------------------------------------\n');

  // Define provider configurations for direct access (optional)
  const providerManager = new ProviderManager({
    openai: {
      apiKey: 'OPENAI_API_KEY'
    },
    gemini: {
      apiKey: 'GEMINI_API_KEY'
    },
    anthropic: {
      apiKey: 'ANTHROPIC_API_KEY'
    }
  });

  // Define various endpoint configurations
  const endpoints: Record<string, EndpointConfig> = {
    // Official OpenRouter API endpoint
    'openrouter': {
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'OPENROUTER_API_KEY',
      type: 'openrouter'
    },
    
    // Direct OpenAI API endpoint
    'openai': {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'OPENAI_API_KEY',
      type: 'openai'
    },
    
    // Direct Anthropic API endpoint
    'anthropic': {
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: 'ANTHROPIC_API_KEY',
      type: 'anthropic'
    },
    
    // Direct Google Gemini API endpoint
    'gemini': {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: 'GEMINI_API_KEY', 
      type: 'gemini'
    },
    
    // Custom hosted LLM API endpoint (e.g. self-hosted Llama)
    'custom-llm': {
      baseUrl: 'https://your-custom-llm-api.example.com/v1',
      apiKey: 'CUSTOM_API_KEY',
      type: 'openai', // Uses OpenAI-compatible format
      headers: {
        'X-Custom-Header': 'custom-value'
      }
    },
    
    // Custom LLM endpoint with custom format
    'custom-format': {
      baseUrl: 'https://your-custom-format-api.example.com/api',
      apiKey: 'CUSTOM_FORMAT_API_KEY',
      type: 'custom',
      requestTransformer: (request, endpoint, headers) => {
        // Transform the request to the custom format
        return {
          prompt: request.messages.map((m: { role: string; content: string | any[] }) => 
            `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
          ).join('\n'),
          parameters: {
            temperature: request.temperature || 0.7,
            max_length: request.max_tokens || 1000
          }
        };
      },
      responseTransformer: (response) => {
        // Transform the response back to OpenRouter format
        return {
          id: `custom-${Date.now()}`,
          model: response.model || 'custom/model',
          choices: [
            {
              message: {
                role: 'assistant',
                content: response.generated_text || ''
              },
              finish_reason: 'stop',
              index: 0
            }
          ],
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          }
        };
      }
    }
  };

  // Create the endpoint router
  const router = new EndpointRouter({
    defaultEndpointId: 'openrouter', // Default to OpenRouter API
    endpoints,
    providerManager, // Optional: For direct provider access
    logLevel: 'info'
  });

  // Example request
  const request = {
    model: 'openai/gpt-4o', // Model ID (will be transformed as needed for each endpoint)
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Tell me about the solar system.' }
    ],
    temperature: 0.7,
    max_tokens: 500
  };

  console.log('Example 1: Using the default endpoint (OpenRouter)');
  console.log('------------------------------------------------');
  
  try {
    /*
    // In a real scenario, you'd execute this:
    const openRouterResponse = await router.createChatCompletion(request);
    console.log('Response from OpenRouter:');
    console.log(openRouterResponse.choices[0].message.content);
    */
    
    // For this example, we'll just show what would happen
    console.log('Request would be sent to OpenRouter API with model: openai/gpt-4o');
    console.log('Response would be returned in OpenRouter format');
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n-------------------------------------\n');
  console.log('Example 2: Using a different endpoint (Direct OpenAI)');
  console.log('------------------------------------------------');
  
  try {
    /*
    // In a real scenario, you'd execute this:
    const openAIResponse = await router.createChatCompletion(request, {
      endpointId: 'openai'
    });
    console.log('Response from direct OpenAI:');
    console.log(openAIResponse.choices[0].message.content);
    */
    
    // For this example, we'll just show what would happen
    console.log('Request would be sent to OpenAI API');
    console.log('Model ID "openai/gpt-4o" would be transformed to "gpt-4o" for OpenAI');
    console.log('Response would be in OpenAI format and transformed to OpenRouter format');
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n-------------------------------------\n');
  console.log('Example 3: Using a different model with Anthropic');
  console.log('------------------------------------------------');
  
  const claudeRequest = {
    ...request,
    model: 'anthropic/claude-3-opus-20240229'
  };
  
  try {
    /*
    // In a real scenario, you'd execute this:
    const anthropicResponse = await router.createChatCompletion(claudeRequest, {
      endpointId: 'anthropic'
    });
    console.log('Response from Anthropic:');
    console.log(anthropicResponse.choices[0].message.content);
    */
    
    // For this example, we'll just show what would happen
    console.log('Request would be sent to Anthropic API');
    console.log('Model ID "anthropic/claude-3-opus-20240229" would be transformed to "claude-3-opus-20240229"');
    console.log('Messages would be transformed to Anthropic format (system prompt handled specially)');
    console.log('Response would be transformed from Anthropic format to OpenRouter format');
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n-------------------------------------\n');
  console.log('Example 4: Streaming with Endpoint Router');
  console.log('------------------------------------------------');
  
  try {
    /*
    // In a real scenario, you'd stream like this:
    const stream = router.streamChatCompletions(request, {
      endpointId: 'openai'
    });
    
    console.log('Streaming response:');
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.message?.content || '';
      process.stdout.write(content);
    }
    console.log('\n');
    */
    
    // For this example, we'll just show what would happen
    console.log('Streaming request would be sent to OpenAI API');
    console.log('Stream chunks would be transformed to OpenRouter format');
    console.log('Each chunk would be yielded as it arrives');
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n-------------------------------------\n');
  console.log('Example 5: Adding a new endpoint at runtime');
  console.log('------------------------------------------------');
  
  // Add a new endpoint at runtime
  router.addEndpoint('azure-openai', {
    baseUrl: 'https://your-azure-instance.openai.azure.com/openai/deployments/your-deployment-name',
    apiKey: 'AZURE_OPENAI_API_KEY',
    type: 'openai',
    headers: {
      'api-key': 'AZURE_OPENAI_API_KEY' // Azure uses a different header format
    }
  });
  
  console.log('Added new Azure OpenAI endpoint');
  console.log('Available endpoints:', router.getEndpointIds());
  
  // Change the default endpoint
  router.setDefaultEndpoint('azure-openai');
  console.log('Changed default endpoint to:', router.getDefaultEndpointId());
  
  console.log('\n-------------------------------------\n');
  console.log('Benefits of the Endpoint Router approach:');
  console.log('1. Switch between providers with a single config change');
  console.log('2. Use the same code for different endpoints (no API-specific code)');
  console.log('3. Fallback to OpenRouter when direct endpoint access fails');
  console.log('4. Support for custom endpoints and formats');
  console.log('5. Optional direct provider integration for even more control');
  console.log('\n-------------------------------------\n');
}

// Run the examples
if (require.main === module) {
  main().catch(console.error);
}

export default main;
