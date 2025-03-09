/**
 * OpenAPI/Swagger Documentation
 *
 * This file sets up OpenAPI/Swagger documentation for the API.
 */
import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { version } from '../../package.json';
// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'OpenRouter SDK API',
            version,
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
const swaggerSpec = swaggerJsdoc(swaggerOptions);
// Create a router for Swagger endpoints
const swaggerRouter = express.Router();
// Serve Swagger UI
swaggerRouter.use('/', swaggerUi.serve);
swaggerRouter.get('/', swaggerUi.setup(swaggerSpec));
// Serve Swagger spec as JSON
swaggerRouter.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
export { swaggerRouter };
//# sourceMappingURL=swagger.js.map