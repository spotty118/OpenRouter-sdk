/**
 * Start script that compiles TypeScript and runs the server
 */
const { execSync } = require('child_process');
const path = require('path');

try {
  // Compile TypeScript files
  console.log('Compiling TypeScript files...');
  execSync('npx tsc', { stdio: 'inherit' });

  // Start the server
  console.log('Starting server...');
  execSync('node server.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
