"use strict";
/**
 * Request Validation Middleware
 *
 * This middleware provides request validation using Joi schemas.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonSchemas = exports.validate = exports.ValidateLocation = void 0;
const joi_1 = __importDefault(require("joi"));
const logger_1 = require("../../utils/logger");
const enhanced_error_1 = require("../../utils/enhanced-error");
const logger = new logger_1.Logger('info');
/**
 * Locations to validate in a request
 */
var ValidateLocation;
(function (ValidateLocation) {
    ValidateLocation["BODY"] = "body";
    ValidateLocation["QUERY"] = "query";
    ValidateLocation["PARAMS"] = "params";
    ValidateLocation["HEADERS"] = "headers";
})(ValidateLocation || (exports.ValidateLocation = ValidateLocation = {}));
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
const validate = (schemas, options = { abortEarly: false, allowUnknown: true }) => {
    return (req, res, next) => {
        const requestId = req.app.locals.requestId ||
            Math.random().toString(36).substring(2, 15);
        try {
            // Validate each schema against its corresponding request location
            for (const schema of schemas) {
                const { location, schema: joiSchema } = schema;
                const dataToValidate = req[location];
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
                    const validationError = enhanced_error_1.Errors.validation(`Invalid request: ${error.details.map(d => d.message).join(', ')}`, {
                        details,
                        location
                    }, requestId);
                    return res.status(validationError.status).json(validationError.toResponse());
                }
                // Update request with validated and sanitized data
                req[location] = value;
            }
            // Continue to next middleware or route handler
            next();
        }
        catch (err) {
            // Handle unexpected validation errors
            logger.error(`Unexpected validation error for ${req.method} ${req.path}`, err);
            const serverError = enhanced_error_1.Errors.server('An error occurred during request validation', { error: err instanceof Error ? err.message : String(err) }, requestId);
            return res.status(serverError.status).json(serverError.toResponse());
        }
    };
};
exports.validate = validate;
/**
 * Common schema definitions
 */
exports.CommonSchemas = {
    /**
     * Schema for pagination parameters
     */
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20)
    }),
    /**
     * Schema for API key authentication header
     */
    authHeader: joi_1.default.object({
        authorization: joi_1.default.string().pattern(/^Bearer [A-Za-z0-9\-_]+$/).required()
    }).unknown(true),
    /**
     * Schema for model parameter
     */
    model: joi_1.default.string().min(1).required(),
    /**
     * Schema for chat messages
     */
    messages: joi_1.default.array().items(joi_1.default.object({
        role: joi_1.default.string().valid('system', 'user', 'assistant').required(),
        content: joi_1.default.string().required()
    })).min(1).required(),
    /**
     * Schema for common completion parameters
     */
    completionParams: joi_1.default.object({
        model: joi_1.default.string().min(1),
        temperature: joi_1.default.number().min(0).max(2),
        max_tokens: joi_1.default.number().integer().positive(),
        top_p: joi_1.default.number().min(0).max(1),
        frequency_penalty: joi_1.default.number().min(-2).max(2),
        presence_penalty: joi_1.default.number().min(-2).max(2)
    })
};
//# sourceMappingURL=validation.js.map