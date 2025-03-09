"use strict";
/**
 * OpenRouter API Server
 *
 * This file sets up an Express server that exposes the OpenRouter SDK functionality
 * as REST API endpoints.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = require("body-parser");
const logger_1 = require("../utils/logger");
const openrouter_error_1 = require("../errors/openrouter-error");
const package_json_1 = require("../../package.json");
// Import routes
const chat_1 = __importDefault(require("./routes/chat"));
const embedding_1 = __importDefault(require("./routes/embedding"));
const image_1 = __importDefault(require("./routes/image"));
const audio_1 = __importDefault(require("./routes/audio"));
const model_1 = __importDefault(require("./routes/model"));
const agent_1 = __importDefault(require("./routes/agent"));
const vector_db_1 = __importDefault(require("./routes/vector-db"));
const swagger_1 = require("./swagger");
// Import middleware
const auth_1 = require("./middleware/auth");
const rate_limiter_1 = require("./middleware/rate-limiter");
const request_logger_1 = require("./middleware/request-logger");
const detailed_health_1 = require("./middleware/detailed-health");
// Create Express app
const app = (0, express_1.default)();
const logger = new logger_1.Logger('info');
const PORT = process.env.PORT || 3000;
// Apply middleware
app.use((0, helmet_1.default)()); // Security headers
app.use((0, cors_1.default)()); // Enable CORS
app.use((0, compression_1.default)()); // Compress responses
app.use((0, body_parser_1.json)({ limit: '50mb' })); // Parse JSON bodies (with size limit)
app.use((0, body_parser_1.urlencoded)({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies
// Apply global middleware
app.use(request_logger_1.requestLogger); // Request logging middleware
app.use(auth_1.authenticate); // Authentication middleware
app.use(rate_limiter_1.rateLimiter); // Rate limiting middleware
// Register routes
app.use('/api/v1/chat', chat_1.default);
app.use('/api/v1/embedding', embedding_1.default);
app.use('/api/v1/image', image_1.default);
app.use('/api/v1/audio', audio_1.default);
app.use('/api/v1/model', model_1.default);
app.use('/api/v1/agent', agent_1.default);
app.use('/api/v1/vector-db', vector_db_1.default);
app.use('/api-docs', swagger_1.swaggerRouter);
// Health check endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', version: package_json_1.version });
});
// Detailed health check endpoint
app.get('/health/detailed', detailed_health_1.detailedHealthCheck);
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, err);
    if (err instanceof openrouter_error_1.OpenRouterError) {
        return res.status(err.status || 500).json({
            error: {
                message: err.message,
                type: 'openrouter_error',
                code: err.status,
                data: err.data
            }
        });
    }
    return res.status(500).json({
        error: {
            message: 'Internal server error',
            type: 'server_error'
        }
    });
});
// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(Number(PORT), () => {
        logger.info(`OpenRouter API server running on port ${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map