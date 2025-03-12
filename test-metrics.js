/**
 * OneAPI Metrics Test Script
 * 
 * This script sends various requests through different providers
 * to populate the metrics dashboard with test data.
 */

import oneapiModule from './src/oneapi.js';

// Get OneAPI instance
const oneAPI = oneapiModule.getOneAPI();

// Test prompts
const chatPrompts = [
  "Explain the concept of machine learning in simple terms.",
  "Write a short poem about artificial intelligence.",
  "What are the three laws of robotics?",
  "Compare and contrast supervised and unsupervised learning.",
  "Explain the difference between AI, ML, and deep learning.",
  "What are large language models and how do they work?",
  "Describe the potential impact of AI on healthcare in the next decade.",
  "What ethical considerations should be made when deploying AI systems?",
  "How can businesses leverage AI to improve customer experience?"
];

const embeddingTexts = [
  "Machine learning algorithms build a model based on sample data.",
  "Artificial intelligence is intelligence demonstrated by machines.",
  "Neural networks are computing systems inspired by biological neural networks.",
  "Deep learning is part of a broader family of machine learning methods.",
  "Natural language processing gives machines the ability to read and understand human language."
];

// Run tests across different providers
async function runMetricsTests() {
  console.log("Starting OneAPI Metrics Test...");
  
  // Get provider configuration status
  let configuredProviders = {};
  try {
    // Try to get provider status from OneAPI
    configuredProviders = oneAPI.checkProviderConfiguration ? 
      oneAPI.checkProviderConfiguration() : {};
  } catch (error) {
    console.warn('Could not check provider configuration:', error.message);
    // Provide default empty configuration
    configuredProviders = {
      openai: false,
      anthropic: false,
      gemini: false,
      mistral: false,
      together: false
    };
  }
  
  console.log('Provider configuration status:', configuredProviders);
  
  const providers = ['openai', 'anthropic', 'gemini', 'mistral', 'together'];
  const models = {
    openai: 'openai/gpt-3.5-turbo',
    anthropic: 'anthropic/claude-instant-1',
    gemini: 'google/gemini-pro',
    mistral: 'mistral/mistral-tiny',
    together: 'together/llama-3-8b-instruct'
  };
  
  // Test Chat Completions
  console.log("Testing Chat Completions...");
  
  for (const provider of providers) {
    const model = models[provider];
    if (!model) continue;
    
    // Map provider to the format used in configuration check
    const providerConfigName = provider === 'gemini' ? 'google' : provider;
    const isConfigured = configuredProviders[providerConfigName];
    
    console.log(`Testing ${provider} with model ${model}... (${isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'})`);
    
    // Skip providers that aren't configured for real requests
    // Continue for mock metrics tracking
    if (!isConfigured) {
      console.log(`  Skipping ${provider} - not configured`);
      // Log a mock request for metrics tracking
      try {
        console.log(`  Logging mock request for ${provider}`);
        // If OneAPI has a trackMetric method, use it
        if (oneAPI.trackMetric && typeof oneAPI.trackMetric === 'function') {
          oneAPI.trackMetric({
            provider: provider,
            model: model,
            type: 'chat',
            status: 'error',
            error: { message: `Provider ${provider} not configured` },
            tokenUsage: { input: 25, output: 0 },
            processingTime: 100
          });
        }
      } catch (err) {
        console.warn(`  Could not log mock metric for ${provider}:`, err.message);
      }
      continue;
    }
    
    // Choose a subset of prompts for each provider
    const providerPrompts = chatPrompts.slice(0, 3 + Math.floor(Math.random() * 4)); 
    
    for (const prompt of providerPrompts) {
      try {
        console.log(`  Sending prompt to ${provider}: "${prompt.substring(0, 30)}..."`);
        
        const response = await oneAPI.createChatCompletion({
          model: model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150
        });
        
        console.log(`  Received response from ${provider} (${response.usage?.total_tokens || 'unknown'} tokens)`);
      } catch (error) {
        console.error(`  Error with ${provider}: ${error.message}`);
      }
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Test Embeddings
  console.log("\nTesting Embeddings...");
  
  for (const provider of ['openai', 'mistral']) { // Only some providers support embeddings
    console.log(`Testing embeddings with ${provider}...`);
    
    try {
      const response = await oneAPI.createEmbedding({
        model: provider === 'openai' ? 'text-embedding-ada-002' : 'mistral-embed',
        input: embeddingTexts
      });
      
      console.log(`  Received embeddings from ${provider} for ${embeddingTexts.length} texts`);
    } catch (error) {
      console.error(`  Error with ${provider} embeddings: ${error.message}`);
    }
  }
  
  console.log("\nTests completed. Check the metrics dashboard to see the results.");
}

// Run the tests
runMetricsTests().catch(console.error);
