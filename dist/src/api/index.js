"use strict";
/**
 * OpenRouter API Server Entry Point
 *
 * This file exports the Express app and provides a function to start the server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
exports.startServer = startServer;
const logger_1 = require("../utils/logger");
const package_json_1 = require("../../package.json");
// Handle the CommonJS module export correctly
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('./server');
exports.default = app;
const logger = new logger_1.Logger('info');
const PORT = process.env.PORT || 3000;
/**
 * Start the API server
 *
 * @param port - Port to listen on (default: 3000 or PORT environment variable)
 * @returns The Express server instance
 */
function startServer(port = Number(PORT)) {
    const server = app.listen(port, () => {
        logger.info(`
      ╔═══════════════════════════════════════════════════╗
      ║                                                   ║
      ║   OpenRouter SDK API Server                       ║
      ║                                                   ║
      ║   Server is now running on port ${port}             ║
      ║   Version: ${package_json_1.version}                                ║
      ║                                                   ║
      ║   API Documentation: http://localhost:${port}/api-docs  ║
      ║   Health Check: http://localhost:${port}/health        ║
      ║                                                   ║
      ╚═══════════════════════════════════════════════════╝
    `);
    });
    return server;
}
// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map