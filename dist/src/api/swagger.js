"use strict";
/**
 * OpenAPI/Swagger Documentation
 *
 * This file sets up OpenAPI/Swagger documentation for the API.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerRouter = void 0;
const express_1 = __importDefault(require("express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const package_json_1 = require("../../package.json");
// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'OpenRouter SDK API',
            version: package_json_1.version,
            description: 'API documentation for the OpenRouter SDK',
            license: {
                name: 'MIT',
                url: 'https://github.com/openrouter-ai/openrouter-sdk/blob/main/LICENSE',
            },
            contact: {
                name: 'OpenRouter',
                url: 'https://openrouter.ai',
                email: 'support@openrouter.ai',
            },
        },
        servers: [
            {
                url: '/api/v1',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/api/routes/*.ts'], // Path to the API routes
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
// Create a router for Swagger endpoints
const swaggerRouter = express_1.default.Router();
exports.swaggerRouter = swaggerRouter;
// Serve Swagger UI
swaggerRouter.use('/', swagger_ui_express_1.default.serve);
swaggerRouter.get('/', swagger_ui_express_1.default.setup(swaggerSpec));
// Serve Swagger spec as JSON
swaggerRouter.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
//# sourceMappingURL=swagger.js.map