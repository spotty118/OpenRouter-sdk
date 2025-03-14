/**
 * Example demonstrating advanced Anthropic API features using OneAPI
 * 
 * This example shows how to use tools, thinking capabilities, and other Claude 3.7 features
 * through the unified OneAPI interface.
 */

import { getOneAPI } from '../src/oneapi.js';

async function main() {
  // Get OneAPI instance - it will use ANTHROPIC_API_KEY from environment or local storage
  const oneAPI = getOneAPI();
  
  console.log('Testing advanced Anthropic API features through OneAPI...');
  
  // Example tool definition (get_time tool as in the example)
  const tools = [
    {
      name: "get_time",
      description: "Get the current time in a given location",
      input_schema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA."
          }
        },
        required: ["location"]
      }
    }
  ];
  
  // Example thinking configuration
  const thinking = {
    type: "enabled",
    budget_tokens: 1024
  };
  
  try {
    // Create a chat completion request with tools and thinking
    const response = await oneAPI.createChatCompletion({
      model: "anthropic/claude-3-7-sonnet-20250219", // Using provider/model_id format
      messages: [
        { role: "system", content: "You are a helpful assistant that specializes in time zone information." },
        { role: "user", content: "What time is it in Tokyo, Japan right now?" }
      ],
      max_tokens: 1000,
      temperature: 1,
      tools: tools,
      thinking: thinking,
      // Optionally include_thinking: true to get thinking content in streaming response
      include_thinking: true
    });
    
    console.log("RESPONSE:", JSON.stringify(response, null, 2));
    
    // Streaming example
    console.log("\n\nStreaming example with tools and thinking:");
    const streamingResponse = oneAPI.createChatCompletionStream({
      model: "anthropic/claude-3-7-sonnet-20250219",
      messages: [
        { role: "system", content: "You are a helpful assistant that specializes in time zone information." },
        { role: "user", content: "What time is it in Los Angeles right now?" }
      ],
      max_tokens: 1000,
      temperature: 1,
      tools: tools,
      thinking: thinking,
      include_thinking: true
    });
    
    // Process the streaming response
    for await (const chunk of streamingResponse) {
      // Check if chunk contains thinking
      if (chunk.choices?.[0]?.delta?.thinking) {
        console.log(`THINKING: ${chunk.choices[0].delta.thinking}`);
      } 
      // Check if chunk contains tool calls
      else if (chunk.choices?.[0]?.delta?.tool_calls) {
        console.log(`TOOL CALL: ${JSON.stringify(chunk.choices[0].delta.tool_calls)}`);
      }
      // Regular content
      else if (chunk.choices?.[0]?.delta?.content) {
        process.stdout.write(chunk.choices[0].delta.content);
      }
    }
    console.log("\n");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main().catch(console.error);
