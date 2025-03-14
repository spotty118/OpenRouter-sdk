/**
 * Structured output utilities
 */

/**
 * StructuredOutput provides utilities for creating structured output formats
 */
export class StructuredOutput {
  /**
   * Create a JSON object response format
   * 
   * @returns {Object} A response format configuration for JSON object output
   */
  static asJson() {
    return {
      type: 'json_object'
    };
  }

  /**
   * Create a response format with JSON Schema validation
   * 
   * @param {Object} schema - The JSON Schema definition
   * @param {string} name - The name of the schema
   * @param {boolean} strict - Whether to enforce strict validation
   * @returns {Object} A response format configuration with JSON Schema validation
   */
  static withSchema(schema, name = 'output', strict = true) {
    if (!schema || typeof schema !== 'object') {
      throw new Error('Schema must be a valid JSON Schema object');
    }
    
    return {
      type: 'json_object',
      schema: {
        type: 'object',
        properties: {
          [name]: schema
        },
        required: [name]
      },
      strict
    };
  }

  /**
   * Create a response format for a specific output type
   * 
   * @param {string} type - The output type (e.g., 'json_object', 'text')
   * @param {Object} options - Additional options for the output format
   * @returns {Object} A response format configuration
   */
  static ofType(type, options = {}) {
    const validTypes = ['json_object', 'text'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid output type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }
    
    return {
      type,
      ...options
    };
  }

  /**
   * Create a response format for a function call
   * 
   * @param {Object} functionDef - The function definition
   * @returns {Object} A response format configuration for function calling
   */
  static asFunctionCall(functionDef) {
    if (!functionDef || typeof functionDef !== 'object' || !functionDef.name) {
      throw new Error('Function definition must include at least a name property');
    }
    
    return {
      type: 'function',
      function: functionDef
    };
  }

  /**
   * Create a response format for multiple function calls
   * 
   * @param {Array<Object>} functionDefs - Array of function definitions
   * @returns {Object} A response format configuration for multiple function calling
   */
  static asMultipleFunctionCalls(functionDefs) {
    if (!Array.isArray(functionDefs) || functionDefs.length === 0) {
      throw new Error('Function definitions must be a non-empty array');
    }
    
    return {
      type: 'function',
      functions: functionDefs
    };
  }

  /**
   * Create a response format for a specific tool
   * 
   * @param {string} toolName - The name of the tool
   * @returns {Object} A response format configuration for tool use
   */
  static asTool(toolName) {
    if (!toolName || typeof toolName !== 'string') {
      throw new Error('Tool name is required');
    }
    
    return {
      type: 'tool',
      tool: toolName
    };
  }
}

export default StructuredOutput;
