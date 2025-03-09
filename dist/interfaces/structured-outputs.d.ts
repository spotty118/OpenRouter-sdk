/**
 * Structured outputs interfaces
 */
/**
 * JSON Schema for validation
 * This is a simplified representation of the JSON Schema standard
 */
export interface JsonSchema {
    /**
     * Type of the schema
     */
    type: string;
    /**
     * Object properties if type is 'object'
     */
    properties?: Record<string, JsonSchemaProperty>;
    /**
     * Array items if type is 'array'
     */
    items?: JsonSchema | JsonSchema[];
    /**
     * Required properties if type is 'object'
     */
    required?: string[];
    /**
     * Whether to allow additional properties for objects
     */
    additionalProperties?: boolean;
    /**
     * Enum values if applicable
     */
    enum?: any[];
    /**
     * Description of the schema
     */
    description?: string;
    /**
     * Additional constraints and validations
     */
    [key: string]: any;
}
/**
 * JSON Schema property definition
 */
export interface JsonSchemaProperty {
    /**
     * Type of the property
     */
    type: string;
    /**
     * Description of the property
     */
    description?: string;
    /**
     * Additional validations and constraints
     */
    [key: string]: any;
}
/**
 * Response format configuration for structured outputs
 */
export interface ResponseFormat {
    /**
     * Type of response format
     */
    type: 'json_object' | 'json_schema' | 'text';
    /**
     * JSON Schema definition for structured outputs
     * Only applicable when type is 'json_schema'
     */
    json_schema?: {
        /**
         * Name of the schema
         */
        name: string;
        /**
         * Whether to enforce strict validation
         * When true, the model will follow the schema exactly
         */
        strict: boolean;
        /**
         * The JSON Schema definition
         */
        schema: JsonSchema;
    };
}
//# sourceMappingURL=structured-outputs.d.ts.map