import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

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
    console.log('- TypeScript Config:', fs.existsSync('tsconfig.json') ? 'Found' : 'Missing');
    console.log('- Dist Directory:', fs.existsSync('dist') ? 'Found' : 'Missing');
    
    if (!fs.existsSync('dist')) {
        console.warn('\nWARNING: dist directory not found. Please run "npm run build" first.');
    }
});
