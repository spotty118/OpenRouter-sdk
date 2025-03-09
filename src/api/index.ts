/**
 * OpenRouter API Server Entry Point
 * 
 * This file exports the Express app and provides a function to start the server.
 */

import { Logger } from '../utils/logger.js';
import  version  from '../../package.json' with { type: 'json' };
import { Application } from 'express';

// Handle the CommonJS module export correctly
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('./server') as Application;

const logger = new Logger('info');
const PORT = process.env.PORT || 3000;

/**
 * Start the API server
 * 
 * @param port - Port to listen on (default: 3000 or PORT environment variable)
 * @returns The Express server instance
 */
export function startServer(port: number = Number(PORT)): any {
  const server = app.listen(port, () => {
    logger.info(`
      ╔═══════════════════════════════════════════════════╗
      ║                                                   ║
      ║   OpenRouter SDK API Server                       ║
      ║                                                   ║
      ║   Server is now running on port ${port}             ║
      ║   Version: ${version}                                ║
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

// Export the app 
export { app as default };
