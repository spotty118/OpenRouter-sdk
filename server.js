// Example server.js using OpenRouter SDK with proper ES Module imports
import { OpenRouter } from './dist/index.js';

async function main() {
  try {
    const openRouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key',
      defaultModel: 'openai/gpt-3.5-turbo'
    });
    
    console.log('OpenRouter SDK initialized successfully');
    
    // Example of using the SDK
    const models = await openRouter.listModels();
    console.log(`Available models: ${models.data.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
