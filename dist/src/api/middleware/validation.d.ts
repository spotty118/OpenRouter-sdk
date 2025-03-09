/**
 * Request Validation Middleware
 *
 * This middleware provides request validation using Joi schemas.
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
/**
 * Locations to validate in a request
 */
export declare enum ValidateLocation {
    BODY = "body",
    QUERY = "query",
    PARAMS = "params",
    HEADERS = "headers"
}
/**
 * Validation options
 */
interface ValidationOptions {
    abortEarly?: boolean;
    allowUnknown?: boolean;
    stripUnknown?: boolean;
}
/**
 * Validation schema definition
 */
interface ValidationSchema {
    location: ValidateLocation;
    schema: Joi.Schema;
}
/**
 * Request validation middleware factory
 *
 * @param schemas - Schemas to validate against the request
 * @param options - Validation options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Define validation schema for chat completion requests
 * const chatCompletionSchema = {
 *   location: ValidateLocation.BODY,
 *   schema: Joi.object({
 *     messages: Joi.array().items(
 *       Joi.object({
 *         role: Joi.string().valid('system', 'user', 'assistant').required(),
 *         content: Joi.string().required()
 *       })
 *     ).min(1).required(),
 *     model: Joi.string(),
 *     temperature: Joi.number().min(0).max(2),
 *     max_tokens: Joi.number().integer().positive()
 *   })
 * };
 *
 * // Use in route definition
 * router.post('/completions',
 *   validate([chatCompletionSchema]),
 *   chatCompletionHandler
 * );
 * ```
 */
export declare const validate: (schemas: ValidationSchema[], options?: ValidationOptions) => (req: Request, res: Response, next: NextFunction) => any;
/**
 * Common schema definitions
 */
export declare const CommonSchemas: {
    /**
     * Schema for pagination parameters
     */
    pagination: Joi.ObjectSchema<any>;
    /**
     * Schema for API key authentication header
     */
    authHeader: Joi.ObjectSchema<any>;
    /**
     * Schema for model parameter
     */
    model: Joi.StringSchema<string>;
    /**
     * Schema for chat messages
     */
    messages: Joi.ArraySchema<any[]>;
    /**
     * Schema for common completion parameters
     */
    completionParams: Joi.ObjectSchema<any>;
};
export {};
//# sourceMappingURL=validation.d.ts.map