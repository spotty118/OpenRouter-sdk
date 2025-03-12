/**
 * Simple Metrics Generation Script for OpenRouter SDK
 * 
 * This script generates metrics data by making API calls
 * through OneAPI using configured API keys.
 */

import oneapiModule from './src/oneapi.js';

// Get a fresh OneAPI instance
oneapiModule.resetOneAPI();
const oneAPI = oneapiModule.getOneAPI();

// Test messages
const messages = [
  { role: 'system', content: 'You are a helpful AI assistant.' },
  { role: 'user', content: 'Write a short paragraph about artificial intelligence.' }
];

async function generateMetrics() {
  console.log('Starting metrics generation...');
  
  // Check provider status
  const status = oneAPI.checkStatus();
  console.log('Provider status:', status);
  
  // Try each available provider
  const providers = ['openai', 'anthropic', 'gemini', 'mistral', 'together'];
  
  for (const provider of providers) {
    if (status[provider]) {
      console.log(`Testing ${provider}...`);
      
      try {
        // Get appropriate model for the provider
        let model;
        switch (provider) {
          case 'openai': model = 'gpt-3.5-turbo'; break;
          case 'anthropic': model = 'claude-instant-1.2'; break;
          case 'gemini': model = 'gemini-pro'; break;
          case 'mistral': model = 'mistral-tiny'; break;
          case 'together': model = 'llama-3-8b-instruct'; break;
          default: model = 'gpt-3.5-turbo';
        }
        
        console.log(`Using model ${model} for ${provider}`);
        
        // Make an API call
        const result = await oneAPI.createChatCompletion({
          provider: provider,
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 100
        });
        
        console.log(`✅ ${provider} call successful`);
        if (result.usage) {
          console.log(`   Usage: ${result.usage.prompt_tokens} prompt tokens, ${result.usage.completion_tokens} completion tokens`);
        }
      } catch (error) {
        console.error(`❌ Error with ${provider}:`, error.message);
      }
    } else {
      console.log(`Skipping ${provider} - not configured`);
    }
  }
  
  console.log('\nMetrics generation complete.');
  console.log('Please check the dashboard to see the metrics data.');
}

// Run the function
generateMetrics().catch(console.error); 