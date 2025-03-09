/**
 * Structured output utility
 *
 * This module provides utility functions for working with OpenRouter's structured output capabilities,
 * which allow you to enforce specific JSON Schema validation on model responses.
 */
import { ResponseFormat, JsonSchema, JsonSchemaProperty } from '../interfaces/structured-outputs';
/**
 * Utility class for working with structured outputs
 */
export declare class StructuredOutput {
    /**
     * Create a JSON object response format
     *
     * @returns A response format configuration for JSON object output
     *
     * @example
     * ```typescript
     * // Request output as a JSON object
     * const responseFormat = StructuredOutput.asJson();
     * ```
     */
    static asJson(): ResponseFormat;
    /**
     * Create a text response format
     *
     * @returns A response format configuration for text output
     *
     * @example
     * ```typescript
     * // Request output as plain text
     * const responseFormat = StructuredOutput.asText();
     * ```
     */
    static asText(): ResponseFormat;
    /**
     * Create a JSON Schema response format
     *
     * @param schema The JSON Schema definition
     * @param name The name of the schema
     * @param strict Whether to enforce strict validation
     * @returns A response format configuration with JSON Schema validation
     *
     * @example
     * ```typescript
     * // Create a structured output with JSON Schema validation
     * const responseFormat = StructuredOutput.withSchema({
     *   type: 'object',
     *   properties: {
     *     name: { type: 'string', description: 'Person name' },
     *     age: { type: 'number', description: 'Person age' }
     *   },
     *   required: ['name', 'age']
     * }, 'person', true);
     * ```
     */
    static withSchema(schema: JsonSchema, name?: string, strict?: boolean): ResponseFormat;
    /**
     * Create an object schema property
     *
     * @param properties Object properties
     * @param required Array of required property names
     * @param allowAdditionalProperties Whether to allow additional properties
     * @param description Property description
     * @returns A JSON Schema for an object
     *
     * @example
     * ```typescript
     * // Create an object schema for a person
     * const personSchema = StructuredOutput.objectSchema({
     *   name: StructuredOutput.stringProperty('Person name'),
     *   age: StructuredOutput.numberProperty('Person age')
     * }, ['name'], false, 'A person object');
     * ```
     */
    static objectSchema(properties: Record<string, JsonSchemaProperty>, required?: string[], allowAdditionalProperties?: boolean, description?: string): JsonSchema;
    /**
     * Create an array schema
     *
     * @param items Schema for array items
     * @param description Property description
     * @returns A JSON Schema for an array
     *
     * @example
     * ```typescript
     * // Create an array schema for a list of people
     * const peopleSchema = StructuredOutput.arraySchema(
     *   personSchema,
     *   'List of people'
     * );
     * ```
     */
    static arraySchema(items: JsonSchema, description?: string): JsonSchema;
    /**
     * Create a string property
     *
     * @param description Property description
     * @param options Additional string validations
     * @returns A string property definition
     *
     * @example
     * ```typescript
     * // Create a string property with validation
     * const emailProperty = StructuredOutput.stringProperty(
     *   'Email address',
     *   { format: 'email', minLength: 5 }
     * );
     * ```
     */
    static stringProperty(description?: string, options?: any): JsonSchemaProperty;
    /**
     * Create a number property
     *
     * @param description Property description
     * @param options Additional number validations
     * @returns A number property definition
     *
     * @example
     * ```typescript
     * // Create a number property with validation
     * const ageProperty = StructuredOutput.numberProperty(
     *   'Person age',
     *   { minimum: 0, maximum: 120 }
     * );
     * ```
     */
    static numberProperty(description?: string, options?: any): JsonSchemaProperty;
    /**
     * Create a boolean property
     *
     * @param description Property description
     * @returns A boolean property definition
     *
     * @example
     * ```typescript
     * // Create a boolean property
     * const activeProperty = StructuredOutput.booleanProperty('Is account active');
     * ```
     */
    static booleanProperty(description?: string): JsonSchemaProperty;
    /**
     * Create an enum property
     *
     * @param values Array of allowed values
     * @param description Property description
     * @returns An enum property definition
     *
     * @example
     * ```typescript
     * // Create an enum property
     * const statusProperty = StructuredOutput.enumProperty(
     *   ['active', 'inactive', 'pending'],
     *   'Account status'
     * );
     * ```
     */
    static enumProperty(values: any[], description?: string): JsonSchemaProperty;
}
