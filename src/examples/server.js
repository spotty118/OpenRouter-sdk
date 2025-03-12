import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Path to API keys storage
const API_KEYS_PATH = path.join(__dirname, '../../data/api-keys.js');

// Function to load API keys
async function loadApiKeys() {
  try {
    // Import API keys from file
    const apiKeysModule = await import(`../../data/api-keys.js?timestamp=${Date.now()}`);
    const apiKeys = apiKeysModule.default;
    
    // Set environment variables from loaded keys
    if (apiKeys.openaiKey) process.env.OPENAI_API_KEY = apiKeys.openaiKey;
    if (apiKeys.anthropicKey) process.env.ANTHROPIC_API_KEY = apiKeys.anthropicKey;
    if (apiKeys.googleKey) process.env.GOOGLE_API_KEY = apiKeys.googleKey;
    if (apiKeys.mistralKey) process.env.MISTRAL_API_KEY = apiKeys.mistralKey;
    if (apiKeys.togetherKey) process.env.TOGETHER_API_KEY = apiKeys.togetherKey;
    
    console.log('API keys loaded successfully:', Object.keys(apiKeys).filter(k => apiKeys[k]).join(', '));
    return apiKeys;
  } catch (error) {
    console.warn('Failed to load API keys:', error.message);
    return {};
  }
}

// Function to save API keys
async function saveApiKeys(keys) {
  try {
    const content = `/**
 * Persistent API Key Storage for OpenRouter SDK
 */

export default {
  openaiKey: "${keys.openaiKey || ''}",
  anthropicKey: "${keys.anthropicKey || ''}",
  googleKey: "${keys.googleKey || ''}",
  mistralKey: "${keys.mistralKey || ''}",
  togetherKey: "${keys.togetherKey || ''}"
};`;

    fs.writeFileSync(API_KEYS_PATH, content, 'utf8');
    console.log('API keys saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save API keys:', error);
    return false;
  }
}

// Load API keys at startup
await loadApiKeys();

// Serve compiled files from dist directory
app.use('/dist', express.static(path.join(__dirname, '../../dist')));

// Serve static files from src directory with proper MIME types
app.use(express.static(path.join(__dirname, '../'), {
    setHeaders: (res, filePath) => {
        // Set proper content type for JavaScript modules
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
    }
}));

// Serve static files from root directory
app.use(express.static(path.join(__dirname, '../../'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
    }
}));

// Default route redirects to wizard dashboard
app.get('/', (req, res) => {
    res.redirect('/examples/wizard-dashboard.html');
});

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Add body parser middleware
app.use(express.json());

// API endpoint for updating API keys
app.post('/api/update-keys', async (req, res) => {
  try {
    const { openaiKey, anthropicKey, googleKey, mistralKey, togetherKey } = req.body;
    
    // Update environment variables
    if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
    if (anthropicKey) process.env.ANTHROPIC_API_KEY = anthropicKey;
    if (googleKey) process.env.GOOGLE_API_KEY = googleKey;
    if (mistralKey) process.env.MISTRAL_API_KEY = mistralKey;
    if (togetherKey) process.env.TOGETHER_API_KEY = togetherKey;
    
    // Save keys to persistent storage
    const saveResult = await saveApiKeys({
      openaiKey, anthropicKey, googleKey, mistralKey, togetherKey
    });
    
    // Return success response
    res.json({
      success: true,
      message: 'API keys updated and saved successfully',
      persistentSave: saveResult
    });
  } catch (error) {
    console.error('Error updating API keys:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API endpoint for status check
app.get('/api/status', (req, res) => {
  // Return provider status based on environment variables
  const status = {
    providers: {
      openai: {
        connected: !!process.env.OPENAI_API_KEY,
        available: !!process.env.OPENAI_API_KEY
      },
      anthropic: {
        connected: !!process.env.ANTHROPIC_API_KEY,
        available: !!process.env.ANTHROPIC_API_KEY
      },
      google: {
        connected: !!process.env.GOOGLE_API_KEY,
        available: !!process.env.GOOGLE_API_KEY
      },
      mistral: {
        connected: !!process.env.MISTRAL_API_KEY,
        available: !!process.env.MISTRAL_API_KEY
      },
      together: {
        connected: !!process.env.TOGETHER_API_KEY,
        available: !!process.env.TOGETHER_API_KEY
      }
    }
  };
  
  res.json(status);
});

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Special handler for .ts files - serve the compiled .js version from dist
app.get('*.ts', (req, res, next) => {
    const tsPath = req.path;
    const jsPath = tsPath.replace('.ts', '.js');
    const distPath = path.join(__dirname, '../../dist', jsPath);

    // Check if compiled JS file exists
    if (fs.existsSync(distPath)) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        res.sendFile(distPath);
    } else {
        console.warn(`Compiled file not found: ${distPath}`);
        console.warn('Make sure to run "npm run build" first');
        next();
    }
});

// Handle module imports
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        // Try dist directory first
        const distPath = path.join(__dirname, '../../dist', req.path);
        if (fs.existsSync(distPath)) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            return res.sendFile(distPath);
        }
        
        // Then try src directory
        const srcPath = path.join(__dirname, '..', req.path);
        if (fs.existsSync(srcPath)) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            return res.sendFile(srcPath);
        }
    }
    next();
});

// Handle 404s
app.use((req, res, next) => {
    console.log('404 Not Found:', req.url);
    res.status(404).send(`
        <h1>File not found</h1>
        <p>The requested file ${req.url} was not found.</p>
        <p><a href="/examples/wizard-dashboard.html">Go to Agent Wizard Dashboard</a></p>
        <script>
            console.error('404 Error:', {
                url: '${req.url}',
                referrer: document.referrer,
                timestamp: new Date().toISOString()
            });
        </script>
    `);
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send(`
        <h1>Server Error</h1>
        <p>Something went wrong: ${err.message}</p>
        <pre>${err.stack}</pre>
        <p><a href="/examples/wizard-dashboard.html">Return to Agent Wizard Dashboard</a></p>
        <script>
            console.error('Server Error:', {
                message: '${err.message}',
                stack: '${err.stack}',
                timestamp: new Date().toISOString()
            });
        </script>
    `);
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Agent Wizard available at http://localhost:${port}/examples/wizard-dashboard.html`);
    
    // Log environment details
    console.log('\nEnvironment Details:');
    console.log('- Node Version:', process.version);
    console.log('- Working Directory:', process.cwd());
    console.log('- Server Directory:', __dirname);
    console.log('- TypeScript Config:', fs.existsSync(path.join(__dirname, '../../tsconfig.json')) ? 'Found' : 'Not Found');
    console.log('- Dist Directory:', fs.existsSync(path.join(__dirname, '../../dist')) ? 'Found' : 'Not Found');
    
    if (!fs.existsSync(path.join(__dirname, '../../dist'))) {
        console.warn('\nWARNING: dist directory not found. Please run "npm run build" first.');
    }
});
