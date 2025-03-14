/**
 * Main server entry point for OpenRouter SDK
 *
 * This script starts the Express server for the OpenRouter SDK demo UI
 */

import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

try {
  // Import the server using ES module syntax
  import('./src/server.js')
    .then(() => {
      console.log('Server started successfully!');
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      console.error('Please make sure all required modules are installed:');
      console.error('npm install express path');
    });
} catch (error) {
  console.error('Failed to start server:', error);
  console.error('Please make sure all required modules are installed:');
  console.error('npm install express path');
}
