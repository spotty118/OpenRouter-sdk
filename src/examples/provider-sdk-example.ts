/**
 * Provider SDK Integration Example
 * 
 * This example demonstrates how to use the Provider SDK Manager
 * to directly interact with OpenAI, Anthropic (Claude), and Google Gemini SDKs.
 */

import { ProviderSDKManager, GeminiClient } from '../utils/provider-sdk-manager.js';

// Initialize the Provider SDK Manager
const providerManager = new ProviderSDKManager();

/**
 * Example demonstrating direct OpenAI SDK usage
 */
async function openAIDirectExample() {
  console.log('=== OpenAI Direct SDK Integration Example ===');
  
  try {
    // Get OpenAI client
    const openai = providerManager.getOpenAIClient();
    
    // Use the SDK directly to list models
    console.log('Listing available OpenAI models...');
    const modelResponse = await openai.models.list();
    console.log(`Found ${modelResponse.data.length} models`);
    
    // Generate completion with OpenAI
    console.log('\nGenerating completion with OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Tell me a short joke about programming.' }
      ],
      temperature: 0.7,
      max_tokens: 150
    });
    
    console.log('OpenAI Response:');
    console.log(response.choices[0].message.content);
    
    // Use the embedding API with OpenAI
    console.log('\nGenerating embeddings with OpenAI...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'This is a test sentence for embedding.',
    });
    
    console.log(`Generated embedding with ${embeddingResponse.data[0].embedding.length} dimensions`);
    
    return true;
  } catch (error) {
    console.error('Error in OpenAI example:', error);
    return false;
  }
}

/**
 * Example demonstrating direct Claude (Anthropic) SDK usage
 */
async function claudeDirectExample() {
  console.log('\n=== Claude (Anthropic) Direct SDK Integration Example ===');
  
  try {
    // Get Anthropic client
    const anthropic = providerManager.getAnthropicClient();
    
    // Generate completion with Claude
    console.log('Generating completion with Claude...');
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      system: 'You are Claude, a helpful AI assistant.',
      messages: [
        { role: 'user', content: 'Explain quantum computing in simple terms.' }
      ],
      temperature: 0.5,
      max_tokens: 300
    });
    
    console.log('Claude Response:');
    if (response.content && response.content[0] && 'text' in response.content[0]) {
      console.log(response.content[0].text);
    } else {
      console.log(JSON.stringify(response.content, null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('Error in Claude example:', error);
    return false;
  }
}

/**
 * Example demonstrating direct Google Gemini SDK usage
 */
async function geminiDirectExample() {
  console.log('\n=== Google Gemini Direct SDK Integration Example ===');
  
  try {
    // Get Gemini client
    const gemini = providerManager.getGeminiClient();
    
    // Generate completion with Gemini
    console.log('Generating completion with Gemini...');
    const response = await gemini.generateText(
      'gemini-1.5-pro',
      'What are the key features of Google Gemini compared to other AI models?',
      {
        temperature: 0.3,
        maxOutputTokens: 500
      }
    );
    
    console.log('Gemini Response:');
    console.log(response.text);
    
    return true;
  } catch (error) {
    console.error('Error in Gemini example:', error);
    return false;
  }
}

/**
 * Combined example showing the use of multiple provider SDKs
 */
async function combinedSdkExample() {
  console.log('\n=== Combined Provider SDK Integration Example ===');
  
  try {
    // The prompt to use for all models
    const prompt = 'Create a haiku about artificial intelligence.';
    
    // Get responses from all models
    console.log(`Sending the same prompt to multiple models: "${prompt}"`);
    
    console.log('\nRequesting response from OpenAI...');
    const openai = providerManager.getOpenAIClient();
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    });
    
    console.log('\nRequesting response from Claude...');
    const anthropic = providerManager.getAnthropicClient();
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300
    });
    
    console.log('\nRequesting response from Gemini...');
    const gemini = providerManager.getGeminiClient();
    const geminiResponse = await gemini.generateText(
      'gemini-pro', 
      prompt,
      {
        temperature: 0.7,
        maxOutputTokens: 300
      }
    );
    
    // Display results side by side
    console.log('\n=== Model Responses ===');
    console.log('OpenAI GPT-4o:');
    console.log(openaiResponse.choices[0].message.content);
    
    console.log('\nClaude 3 Haiku:');
    if (claudeResponse.content && claudeResponse.content[0] && 'text' in claudeResponse.content[0]) {
      console.log(claudeResponse.content[0].text);
    } else {
      console.log(JSON.stringify(claudeResponse.content, null, 2));
    }
    
    console.log('\nGoogle Gemini Pro:');
    console.log(geminiResponse.text);
    
    return true;
  } catch (error) {
    console.error('Error in combined example:', error);
    return false;
  }
}

/**
 * Example showing use of multimodal capabilities
 */
async function multimodalExample() {
  console.log('\n=== Multimodal API Example ===');
  
  try {
    // The image URL to use
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Example_image.svg/600px-Example_image.svg.png';
    const prompt = 'What do you see in this image? Please describe it in detail.';
    
    console.log(`Using image: ${imageUrl}`);
    console.log(`Prompt: ${prompt}`);
    
    // Get Gemini client for multimodal capabilities
    const gemini = providerManager.getGeminiClient();
    const response = await gemini.multiModal(
      'gemini-1.5-pro', 
      prompt, 
      imageUrl,
      {
        temperature: 0.4,
        maxOutputTokens: 500
      }
    );
    
    console.log('\nGemini Multimodal Response:');
    console.log(response.text);
    
    return true;
  } catch (error) {
    console.error('Error in multimodal example:', error);
    return false;
  }
}

// Main function to run all examples
async function runProviderSdkExamples() {
  try {
    console.log('Running Provider SDK Examples...\n');
    
    // Check if API keys are set
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    
    // Ensure at least one API key is set for the examples to work
    if (!openaiApiKey && !anthropicApiKey && !googleApiKey && !openrouterApiKey) {
      console.log('WARNING: No API keys are set. Set at least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENROUTER_API_KEY environment variables.');
      console.log('Examples will still run but may fail if they make actual API calls.\n');
    }
    
    // Run each example
    await openAIDirectExample();
    await claudeDirectExample();
    await geminiDirectExample();
    await combinedSdkExample();
    await multimodalExample();
    
    console.log('\nProvider SDK Examples completed!');
  } catch (error) {
    console.error('Error running Provider SDK examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runProviderSdkExamples().catch(console.error);
}

export { 
  runProviderSdkExamples, 
  openAIDirectExample, 
  claudeDirectExample, 
  geminiDirectExample, 
  combinedSdkExample,
  multimodalExample
};
