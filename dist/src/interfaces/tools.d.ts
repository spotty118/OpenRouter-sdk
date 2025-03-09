/**
 * Tool and function calling interfaces
 */
/**
 * Function definition for tool calling
 */
export interface FunctionDefinition {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
    required?: string[];
}
/**
 * Tool definition
 */
export interface ToolDefinition {
    type: 'function';
    function: FunctionDefinition;
}
/**
 * Tool choice for directing model behavior
 */
export interface ToolChoice {
    type: 'function' | 'none' | 'auto';
}
/**
 * Tool call returned from the model
 */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
//# sourceMappingURL=tools.d.ts.map