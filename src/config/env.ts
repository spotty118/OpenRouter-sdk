/**
 * Environment configuration
 */

interface EnvConfig {
  apiKey: string;
  adminToken: string;
  port: number;
  host: string;
  env: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Default configuration
const defaultConfig: EnvConfig = {
  apiKey: '',
  adminToken: 'admin-secret',
  port: 3000,
  host: 'localhost',
  env: 'development',
  logLevel: 'info'
};

// Load configuration from environment variables
export function loadConfig(): EnvConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || defaultConfig.apiKey,
    adminToken: process.env.ADMIN_TOKEN || defaultConfig.adminToken,
    port: parseInt(process.env.PORT || String(defaultConfig.port), 10),
    host: process.env.HOST || defaultConfig.host,
    env: (process.env.NODE_ENV || defaultConfig.env) as EnvConfig['env'],
    logLevel: (process.env.LOG_LEVEL || defaultConfig.logLevel) as EnvConfig['logLevel']
  };
}

// Validate required configuration
export function validateConfig(config: EnvConfig): void {
  const missing: string[] = [];

  if (!config.apiKey) {
    missing.push('OPENROUTER_API_KEY');
  }

  if (missing.length > 0) {
    console.warn(`[OpenRouter WARN] Missing required environment variables: ${missing.join(', ')}`);
    console.info('[OpenRouter INFO] Set your API key by running: export OPENROUTER_API_KEY=your_key_here');
  }

  if (config.adminToken === defaultConfig.adminToken) {
    console.info('[OpenRouter INFO] Using default admin token: admin-secret');
    console.info('[OpenRouter INFO] Set a custom admin token with: export ADMIN_TOKEN=your-secret-token');
  }
}

export const config = loadConfig();
validateConfig(config);
