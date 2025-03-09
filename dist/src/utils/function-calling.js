/**
 * Handles function/tool calling capabilities
 */
export class FunctionCalling {
    /**
     * Create a function definition object for use with AI models
     *
     * @param name - Function name
     * @param description - Function description
     * @param parameters - Object mapping parameter names to their JSON Schema definitions
     * @param required - Array of required parameter names
     * @returns Function definition object
     *
     * @example
     * ```typescript
     * const getWeatherFunction = FunctionCalling.createFunctionDefinition(
     *   'get_weather',
     *   'Get the current weather in a location',
     *   {
     *     location: {
     *       type: 'string',
     *       description: 'The city and state, e.g. San Francisco, CA'
     *     },
     *     unit: {
     *       type: 'string',
     *       enum: ['celsius', 'fahrenheit']
     *     }
     *   },
     *   ['location']
     * );
     * ```
     */
    static createFunctionDefinition(name, description, parameters, required) {
        return {
            name,
            description,
            parameters: {
                type: 'object',
                // Parameter definitions with types and descriptions
                properties: parameters,
                required
            },
            required
        };
    }
    /**
     * Parse and execute function calls from model response
     *
     * @param toolCalls - Tool calls from model response
     * @param functions - Map of function names to implementations
     * @returns Results of executed functions
     *
     * @example
     * ```typescript
     * // After getting a response with tool calls
     * const toolCalls = response.choices[0].message.tool_calls;
     *
     * // Define your function implementations
     * const functions = {
     *   get_weather: (args) => ({
     *     temperature: 72,
     *     conditions: 'sunny',
     *     location: args.location
     *   }),
     *   search_database: (args) => ({
     *     results: ['result1', 'result2'],
     *     query: args.query
     *   })
     * };
     *
     * // Execute all tool calls
     * const results = await FunctionCalling.executeToolCalls(toolCalls, functions);
     * ```
     */
    static async executeToolCalls(toolCalls, functions) {
        const results = {};
        for (const toolCall of toolCalls) {
            if (toolCall.type !== 'function')
                continue;
            const { name, arguments: argsString } = toolCall.function;
            if (!functions[name]) {
                results[toolCall.id] = { error: `Function ${name} not found` };
                continue;
            }
            try {
                const args = JSON.parse(argsString);
                results[toolCall.id] = await functions[name](args);
            }
            catch (error) {
                results[toolCall.id] = {
                    error: `Error executing function: ${error.message}`
                };
            }
        }
        return results;
    }
}
//# sourceMappingURL=function-calling.js.map