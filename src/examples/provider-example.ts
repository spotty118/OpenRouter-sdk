/**
 * Provider Integration Example
 * 
 * This example demonstrates how to use the provider implementations 
 * for direct interaction with Google Gemini, Google Vertex AI, and OpenAI.
 */

import { OpenRouter } from '../core/open-router.js';
import { ProviderType } from '../interfaces/provider.js';
import { ProviderManager } from '../utils/provider-manager.js';
import { ProviderIntegration } from '../utils/provider-integration.js';
import { GeminiConfig } from '../providers/google-gemini.js';
import { OpenAIConfig } from '../providers/openai.js';
import { VertexAIConfig } from '../providers/google-vertex.js';

/**
 * Examples of using provider integration
 */
async function main() {
  console.log('OpenRouter SDK Provider Integration Example');
  console.log('-------------------------------------------\n');

  // Example 1: Using Provider Integration with OpenRouter
  console.log('Example 1: Using Provider Integration with OpenRouter');
  
  // Create provider configurations
  const openaiConfig: OpenAIConfig = {
    apiKey: 'OPENAI_API_KEY',
    // Optional organization ID
    organizationId: 'OPENAI_ORG_ID',
  };

  const geminiConfig: GeminiConfig = {
    apiKey: 'GEMINI_API_KEY',
    // Optional safety settings toggle
    includeSafetySettings: true,
  };

  const vertexConfig: VertexAIConfig = {
    apiKey: 'VERTEX_API_KEY',
    projectId: 'VERTEX_PROJECT_ID',
    location: 'us-central1',
  };

  // Create provider manager
  const mainProviderManager = new ProviderManager({
    openai: openaiConfig,
    gemini: geminiConfig,
    vertex: vertexConfig
  });

  // Create provider integration helper
  const providerIntegration = new ProviderIntegration(
    mainProviderManager,
    'info',
    true // enable direct integration
  );

  // Create OpenRouter instance for fallback
  const openRouter = new OpenRouter({
    apiKey: 'OPENROUTER_API_KEY'
  });

  // Example request with provider integration
  const request = {
    model: 'openai/gpt-4o',
    messages: [
      { role: 'system' as const, content: 'You are a helpful assistant.' },
      { role: 'user' as const, content: 'Tell me about the solar system.' }
    ],
    temperature: 0.7,
  };

  try {
    // Try to use direct provider integration
    const directResponse = await providerIntegration.tryChatCompletion(request);
    
    if (directResponse) {
      console.log('Response from direct OpenAI provider:');
      console.log(directResponse.choices[0].message.content);
    } else {
      // Fall back to OpenRouter API
      console.log('Falling back to OpenRouter API...');
      const fallbackResponse = await openRouter.createChatCompletion(request);
      console.log('Response from OpenRouter API:');
      console.log(fallbackResponse.choices[0].message.content);
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n-------------------------------------------\n');

  // Example 2: Using Provider Manager directly
  console.log('Example 2: Using Provider Manager directly');
  
  // Create provider manager with each provider configured
  const exampleProviderManager = new ProviderManager({
    openai: {
      apiKey: 'OPENAI_API_KEY'
    },
    gemini: {
      apiKey: 'GEMINI_API_KEY'
    },
    vertex: {
      apiKey: 'VERTEX_API_KEY',
      projectId: 'VERTEX_PROJECT_ID'
    }
  });
  
  // Use Gemini provider directly
  const geminiProvider = exampleProviderManager.getProvider(ProviderType.GOOGLE_GEMINI);
  if (geminiProvider) {
    try {
      const response = await geminiProvider.createChatCompletion({
        model: 'google/gemini-pro',
        messages: [
          { role: 'user' as const, content: 'Explain quantum computing in simple terms.' }
        ],
        temperature: 0.3,
      });
      
      console.log('Response from Gemini provider:');
      console.log(response.choices[0].message.content);
    } catch (error) {
      console.error('Error with Gemini provider:', error);
    }
  } else {
    console.log('Gemini provider not configured');
  }
  
  console.log('\n-------------------------------------------\n');

  // Example 3: Streaming from Vertex AI
  console.log('Example 3: Streaming from Vertex AI');
  
  const vertexProvider = exampleProviderManager.getProvider(ProviderType.GOOGLE_VERTEX);
  if (vertexProvider) {
    try {
      console.log('Streaming response from Vertex AI:');
      
      // Start streaming request
      const stream = vertexProvider.streamChatCompletions({
        model: 'google-vertex/gemini-1.5-pro',
        messages: [
          { role: 'user' as const, content: 'Write a short poem about artificial intelligence.' }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });
      
      // Process streaming response
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].message) {
          const content = chunk.choices[0].message.content;
          if (typeof content === 'string') {
            process.stdout.write(content);
          } else {
            // Handle multimodal content
            console.log(JSON.stringify(content));
          }
        }
      }
      console.log('\n');
    } catch (error) {
      console.error('Error with Vertex AI streaming:', error);
    }
  } else {
    console.log('Vertex AI provider not configured');
  }
  
  console.log('\n-------------------------------------------\n');

  // Example 4: Multi-modal with Gemini Vision
  console.log('Example 4: Multi-modal with Gemini Vision');
  
  if (geminiProvider) {
    try {
      // Example with an image URL (using a public image)
      const response = await geminiProvider.createChatCompletion({
        model: 'google/gemini-pro-vision',
        messages: [
          {
            role: 'user' as const,
            content: [
              {
                type: 'text',
                text: 'What does this image show? Describe it in detail.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://storage.googleapis.com/cloud-samples-data/vertex-ai/sample_data/images/landmark/lycabettus_hill.jpeg'
                }
              }
            ]
          }
        ]
      });
      
      console.log('Response from Gemini Vision:');
      console.log(response.choices[0].message.content);
    } catch (error) {
      console.error('Error with Gemini Vision:', error);
    }
  } else {
    console.log('Gemini provider not configured');
  }
  
  console.log('\n-------------------------------------------\n');
}

// Run the examples
if (require.main === module) {
  main().catch(console.error);
}

export default main;
