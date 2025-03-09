/**
 * OpenRouter API Server Entry Point
 *
 * This file exports the Express app and provides a function to start the server.
 */
import app from './server';
import { Logger } from '../utils/logger';
const logger = new Logger('info');
const PORT = process.env.PORT || 3000;
/**
 * Start the API server
 *
 * @param port - Port to listen on (default: 3000 or PORT environment variable)
 * @returns The Express server instance
 */
export function startServer(port = Number(PORT)) {
    return app.listen(port, () => {
        logger.info(`OpenRouter API server running on port ${port}`);
    });
}
// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}
export default app;
//# sourceMappingURL=index.js.map