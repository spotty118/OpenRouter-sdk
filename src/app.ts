import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/error-handler.js';
import { ErrorResponse } from './interfaces/responses.js';

// Create Express app
const app = express();

// Basic security middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: { message: 'Too many requests from this IP, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Health check endpoint (no auth required)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: process.env.npm_package_version });
});

// Import and use routes here
// app.use('/api/v1', apiRoutes);
// app.use('/admin', adminRoutes);

// Handle 404s
app.use('*', (req: Request, res: Response) => notFoundHandler(req, res));

// Global error handler - must be last
const globalErrorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response<ErrorResponse>, next: NextFunction) => {
  return errorHandler(err, req, res, next);
};
app.use(globalErrorHandler);

// Start server
const port = config.port || 3000;
const host = config.host || 'localhost';

// Only start server if this file is run directly
if (require.main === module) {
  const server = app.listen(port, () => {
    console.info(`Server running at http://${host}:${port}`);
    console.info('Access the server at http://localhost:3000');

    if (config.adminToken === 'admin-secret') {
      console.info('Monitoring dashboard available at http://localhost:3000/admin/dashboard');
    }

    if (!config.apiKey) {
      console.warn('API Key Warning: OPENROUTER_API_KEY environment variable is not set');
      console.info('Note: API endpoints requiring authentication will not work until an API key is set');
      console.info('Set your API key by running: export OPENROUTER_API_KEY=your_key_here');
    }

    if (config.adminToken === 'admin-secret') {
      console.info('Using default admin token: admin-secret');
      console.info('Set a custom admin token with: export ADMIN_TOKEN=your-secret-token');
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
      console.info('HTTP server closed');
      process.exit(0);
    });
  });
}

export default app;
