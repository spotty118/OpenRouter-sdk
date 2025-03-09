"use strict";
/**
 * Structured output utility
 *
 * This module provides utility functions for working with OpenRouter's structured output capabilities,
 * which allow you to enforce specific JSON Schema validation on model responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredOutput = void 0;
/**
 * Utility class for working with structured outputs
 */
class StructuredOutput {
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
    static asJson() {
        return {
            type: 'json_object'
        };
    }
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
    static asText() {
        return {
            type: 'text'
        };
    }
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
    static withSchema(schema, name = 'output', strict = true) {
        return {
            type: 'json_schema',
            json_schema: {
                name,
                strict,
                schema
            }
        };
    }
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
    static objectSchema(properties, required = [], allowAdditionalProperties = false, description) {
        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
            additionalProperties: allowAdditionalProperties,
            ...(description && { description })
        };
    }
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
    static arraySchema(items, description) {
        return {
            type: 'array',
            items,
            ...(description && { description })
        };
    }
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
    static stringProperty(description, options = {}) {
        return {
            type: 'string',
            ...(description && { description }),
            ...options
        };
    }
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
    static numberProperty(description, options = {}) {
        return {
            type: 'number',
            ...(description && { description }),
            ...options
        };
    }
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
    static booleanProperty(description) {
        return {
            type: 'boolean',
            ...(description && { description })
        };
    }
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
    static enumProperty(values, description) {
        return {
            type: 'string',
            enum: values,
            ...(description && { description })
        };
    }
}
exports.StructuredOutput = StructuredOutput;
