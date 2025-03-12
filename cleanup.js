/**
 * OpenRouter SDK Cleanup Script
 * 
 * This script removes example files and duplicates, preserving only
 * the main dashboard and server implementation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to delete
const filesToDelete = [
  // Example demos
  'demo.js',
  'simple-demo.js',
  
  // Dashboard duplicates
  'start-dashboard.js',
  'start-dashboard.mjs',
  'unified-dashboard.html',
  
  // Server duplicates
  'simple-server.js',
  
  // Test and enhancement files
  'enhance-mock-metrics.js',
  'fix-all-issues.js',
  'fix-imports.js',
  'generate-metrics.js',
  'run-examples.js',
  'test-metrics.js'
];

// Delete all files in examples directory
function deleteExamplesDir() {
  const examplesDir = path.join(__dirname, 'src', 'examples');
  if (!fs.existsSync(examplesDir)) {
    console.log('Examples directory does not exist.');
    return;
  }
  
  try {
    const files = fs.readdirSync(examplesDir);
    for (const file of files) {
      const filePath = path.join(examplesDir, file);
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${filePath}`);
    }
    fs.rmdirSync(examplesDir);
    console.log(`Deleted examples directory: ${examplesDir}`);
  } catch (err) {
    console.error(`Error deleting examples directory: ${err.message}`);
  }
}

// Delete individual files
function deleteFiles() {
  for (const file of filesToDelete) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${filePath}`);
      } catch (err) {
        console.error(`Error deleting ${file}: ${err.message}`);
      }
    } else {
      console.log(`File not found: ${filePath}`);
    }
  }
}

// Run cleanup
console.log('Starting OpenRouter SDK cleanup...');
deleteExamplesDir();
deleteFiles();
console.log('Cleanup completed.');
