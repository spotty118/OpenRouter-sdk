/**
 * Claude AI with Google Search API Example
 * 
 * This example demonstrates how to use the Claude AI provider with Google Search API integration.
 * It shows how to configure the provider, perform chat completions with search capabilities,
 * and stream responses.
 * 
 * To run this example:
 * 1. Set ANTHROPIC_API_KEY, GOOGLE_SEARCH_API_KEY, and GOOGLE_SEARCH_ENGINE_ID in your .env file
 * 2. Run using: npm run build && node dist/examples/claude-search-example.js
 */

import dotenv from 'dotenv';
import { ClaudeProvider, ClaudeConfig } from '../providers/claude.js';
import { GoogleSearch } from '../services/google-search.js';

// Load environment variables
dotenv.config();

// Check for required environment variables
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'GOOGLE_SEARCH_API_KEY',
  'GOOGLE_SEARCH_ENGINE_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is not set.`);
    console.error('Please add it to your .env file');
    process.exit(1);
  }
}

/**
 * Example query function that executes a chat completion with Claude and Google Search
 */
async function runSearchQuery(query: string) {
  console.log(`\n🔍 Running search query: "${query}"\n`);
  
  // Create Claude provider with Google Search configuration
  const claude = new ClaudeProvider({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!,
    enableSearch: true,
    maxSearchResults: 5
  });
  
  // Create chat completion with search capabilities
  const response = await claude.createChatCompletion({
    model: 'anthropic/claude-3-opus-20240229',
    messages: [
      { 
        role: 'system', 
        content: 'You are a helpful assistant with access to Google Search. When answering, use both your knowledge and the search results. Always cite your sources from search when you use them.' 
      },
      { role: 'user', content: query }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    tools: [
      {
        type: 'function',
        function: {
          name: 'search',
          description: 'Search the web for current information',
          parameters: {}
        }
      }
    ]
  });
  
  console.log('🤖 Claude Response:');
  console.log(response.choices[0].message.content);
  console.log(`\n(Model: ${response.model}, Tokens: ${response.usage.total_tokens})`);
}

/**
 * Example streaming function that demonstrates streaming responses from Claude
 */
async function runStreamingSearchQuery(query: string) {
  console.log(`\n🔍 Running streaming search query: "${query}"\n`);
  
  // Create Claude provider with Google Search configuration
  const claude = new ClaudeProvider({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!,
    enableSearch: true,
    maxSearchResults: 3
  });
  
  // Stream chat completion with search capabilities
  const stream = claude.streamChatCompletions({
    model: 'anthropic/claude-3-haiku-20240307',
    messages: [
      { 
        role: 'system', 
        content: 'You are a helpful assistant with access to Google Search. When answering, use both your knowledge and the search results. Always cite your sources from search when you use them.' 
      },
      { role: 'user', content: query }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    tools: [
      {
        type: 'function',
        function: {
          name: 'search',
          description: 'Search the web for current information',
          parameters: {}
        }
      }
    ]
  });
  
  console.log('🤖 Streaming Claude Response:');
  
  // Buffer to collect the entire response
  let fullResponse = '';
  
  // Process stream chunks
  for await (const chunk of stream) {
    // Extract content from the chunk, handling different response formats
    let content = '';
    
    if (chunk.choices && chunk.choices.length > 0) {
      const choice = chunk.choices[0];
      
      // Handle streaming delta format (used by OpenAI/some providers)
      if ('delta' in choice && choice.delta && typeof choice.delta === 'object') {
        content = (choice.delta as any).content || '';
      }
      // Handle standard message format (used by Claude)
      else if ('message' in choice && choice.message) {
        content = typeof choice.message.content === 'string' ? choice.message.content : '';
      }
    }
    
    fullResponse += content;
    
    // Print the chunk without adding a newline
    process.stdout.write(content);
  }
  
  console.log('\n\n(Streaming complete)');
}

/**
 * Example of using the Google Search service directly
 */
async function testDirectSearch(query: string) {
  console.log(`\n🔍 Testing direct search for: "${query}"\n`);
  
  const searchClient = new GoogleSearch({
    apiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!,
    maxResults: 5
  });
  
  try {
    const results = await searchClient.search(query);
    console.log('📊 Search Results:');
    
    if (results.length === 0) {
      console.log('No search results found.');
      return;
    }
    
    results.forEach((result, index) => {
      console.log(`\n[${index + 1}] ${result.title}`);
      console.log(`🔗 ${result.link}`);
      console.log(result.snippet);
    });
  } catch (error) {
    console.error('Error performing search:', error);
  }
}

/**
 * Main example function
 */
async function runExamples() {
  try {
    console.log('🌐 Claude AI with Google Search API Example');
    
    // Example 1: Simple search query with Claude
    await runSearchQuery('What are the latest developments in quantum computing?');
    
    // Example 2: Direct search using the GoogleSearch service
    await testDirectSearch('climate change solutions 2025');
    
    // Example 3: Streaming search query with Claude
    await runStreamingSearchQuery('What are the top upcoming technology trends?');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

export { runExamples as runClaudeSearchExample };
