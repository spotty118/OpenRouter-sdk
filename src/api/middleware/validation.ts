/**
 * Request Validation Middleware
 * 
 * This middleware provides request validation using Joi schemas.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '../../utils/logger.js';
import { Errors } from '../../utils/enhanced-error.js';

const logger = new Logger('info');

/**
 * Locations to validate in a request
 */
export enum ValidateLocation {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params',
  HEADERS = 'headers'
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
export const validate = (
  schemas: ValidationSchema[],
  options: ValidationOptions = { abortEarly: false, allowUnknown: true }
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.app.locals.requestId || 
                      Math.random().toString(36).substring(2, 15);
    
    try {
      // Validate each schema against its corresponding request location
      for (const schema of schemas) {
        const { location, schema: joiSchema } = schema;
        const dataToValidate = req[location as keyof Request];
        
        const { error, value } = joiSchema.validate(dataToValidate, options);
        
        if (error) {
          // Format validation error
          const details = error.details.map(detail => ({
            message: detail.message,
            path: detail.path,
            type: detail.type
          }));
          
          logger.info(`Validation failed for ${req.method} ${req.path} in ${location}`, {
            errors: details,
            requestId
          });
          
          // Create enhanced error with validation details
          const validationError = Errors.validation(
            `Invalid request: ${error.details.map(d => d.message).join(', ')}`,
            { 
              details, 
              location 
            },
            requestId
          );
          
          return res.status(validationError.status).json(validationError.toResponse());
        }
        
        // Update request with validated and sanitized data
        req[location as keyof Request] = value;
      }
      
      // Continue to next middleware or route handler
      next();
    } catch (err) {
      // Handle unexpected validation errors
      logger.error(`Unexpected validation error for ${req.method} ${req.path}`, err);
      const serverError = Errors.server(
        'An error occurred during request validation',
        { error: err instanceof Error ? err.message : String(err) },
        requestId
      );
      return res.status(serverError.status).json(serverError.toResponse());
    }
  };
};

/**
 * Common schema definitions
 */
export const CommonSchemas = {
  /**
   * Schema for pagination parameters
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),
  
  /**
   * Schema for API key authentication header
   */
  authHeader: Joi.object({
    authorization: Joi.string().pattern(/^Bearer [A-Za-z0-9\-_]+$/).required()
  }).unknown(true),
  
  /**
   * Schema for model parameter
   */
  model: Joi.string().min(1).required(),
  
  /**
   * Schema for chat messages
   */
  messages: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('system', 'user', 'assistant').required(),
      content: Joi.string().required()
    })
  ).min(1).required(),
  
  /**
   * Schema for common completion parameters
   */
  completionParams: Joi.object({
    model: Joi.string().min(1),
    temperature: Joi.number().min(0).max(2),
    max_tokens: Joi.number().integer().positive(),
    top_p: Joi.number().min(0).max(1),
    frequency_penalty: Joi.number().min(-2).max(2),
    presence_penalty: Joi.number().min(-2).max(2)
  })
};
