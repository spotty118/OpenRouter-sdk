/**
 * Dashboard Starter Script
 * Starts the dashboard server for OpenRouter SDK with Claude + Google Search integration
 */
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import open from 'open';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const DASHBOARD_PATH = path.join(__dirname, 'dashboard.html');

// Check if dashboard.html exists
if (!fs.existsSync(DASHBOARD_PATH)) {
  console.error('Error: dashboard.html not found!');
  process.exit(1);
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/dashboard.html' : req.url;
  const filePath = path.join(__dirname, url);
  
  // Check file extension
  const ext = path.extname(url);
  const contentType = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  }[ext] || 'text/plain';
  
  // Read file and serve content
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Start server
server.listen(PORT, () => {
  const dashboardUrl = `http://localhost:${PORT}/dashboard.html`;
  console.log(`\n🚀 Dashboard server running at: ${dashboardUrl}`);
  console.log('📊 OpenRouter SDK Dashboard with Claude + Google Search integration');
  console.log('\n✨ Features:');
  console.log('   - Test Claude AI with Google Search integration');
  console.log('   - Configure API keys and model settings');
  console.log('   - Test direct Google Search with different formatting options');
  console.log('   - Simulate both streaming and non-streaming responses');
  console.log('\n⚙️  Environment:');
  console.log('   - Make sure you have valid API keys for:');
  console.log('     • Anthropic Claude API');
  console.log('     • Google Search API');
  console.log('     • Google Custom Search Engine ID');
  
  // Open browser automatically
  console.log('\n🌐 Opening dashboard in your default browser...');
  open(dashboardUrl).catch(() => {
    console.log(`   - Browser couldn't be opened automatically. Please open ${dashboardUrl} manually.`);
  });
  
  console.log('\n📝 Press Ctrl+C to stop the server\n');
});
