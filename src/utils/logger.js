/**
 * Logger utility for OneAPI
 * Provides consistent logging across different providers with various log levels
 * and structured format for easier analysis and monitoring.
 */

// Log levels in order of severity
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4  // Used to disable logging
};

// Current log level - can be modified at runtime
let currentLogLevel = LOG_LEVELS.INFO;

// Enable/disable specific features
const config = {
  enableTimestamps: true,
  enableProviderColors: true,
  enableConsoleColors: true
};

// Provider-specific colors for visual distinction in console
const PROVIDER_COLORS = {
  openai: '\x1b[32m',      // Green
  anthropic: '\x1b[35m',   // Magenta
  mistral: '\x1b[36m',     // Cyan
  google: '\x1b[34m',      // Blue
  together: '\x1b[33m',    // Yellow
  oneapi: '\x1b[37m',      // White
  default: '\x1b[37m'      // White
};

// ANSI color codes for different log levels
const LEVEL_COLORS = {
  DEBUG: '\x1b[90m',  // Grey
  INFO: '\x1b[37m',   // White
  WARN: '\x1b[33m',   // Yellow
  ERROR: '\x1b[31m',  // Red
};

const RESET_COLOR = '\x1b[0m';

/**
 * Sets the current log level
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR, NONE)
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
  } else {
    console.error(`Invalid log level: ${level}. Valid levels are: ${Object.keys(LOG_LEVELS).join(', ')}`);
  }
}

/**
 * Configures logger options
 * @param {Object} options - Configuration options
 */
function configure(options = {}) {
  if (options.enableTimestamps !== undefined) {
    config.enableTimestamps = !!options.enableTimestamps;
  }
  
  if (options.enableProviderColors !== undefined) {
    config.enableProviderColors = !!options.enableProviderColors;
  }
  
  if (options.enableConsoleColors !== undefined) {
    config.enableConsoleColors = !!options.enableConsoleColors;
  }
  
  if (options.logLevel) {
    setLogLevel(options.logLevel);
  }
}

/**
 * Formats a log message with timestamp, provider, and level information
 * @param {string} level - Log level
 * @param {string} provider - Provider name
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @returns {string} - Formatted log message
 */
function formatLogMessage(level, provider, message, data) {
  const hasConsoleColors = config.enableConsoleColors;
  const hasProviderColors = config.enableProviderColors;
  
  let formattedMessage = '';
  
  // Add timestamp if enabled
  if (config.enableTimestamps) {
    const timestamp = new Date().toISOString();
    formattedMessage += `[${timestamp}] `;
  }
  
  // Add log level with appropriate color
  const levelColor = hasConsoleColors ? LEVEL_COLORS[level] || LEVEL_COLORS.INFO : '';
  const resetColor = hasConsoleColors ? RESET_COLOR : '';
  formattedMessage += `${levelColor}[${level}]${resetColor} `;
  
  // Add provider with appropriate color
  const providerColor = (hasConsoleColors && hasProviderColors) 
    ? (PROVIDER_COLORS[provider.toLowerCase()] || PROVIDER_COLORS.default)
    : '';
  
  formattedMessage += `${providerColor}[${provider}]${resetColor} ${message}`;
  
  // Add additional data if available
  if (data && Object.keys(data).length > 0) {
    try {
      // Format as compact JSON
      const dataString = JSON.stringify(data);
      formattedMessage += ` ${dataString}`;
    } catch (error) {
      formattedMessage += ` [Error stringifying data: ${error.message}]`;
    }
  }
  
  return formattedMessage;
}

/**
 * Logs a message at the specified level
 * @param {string} level - Log level
 * @param {string} provider - Provider name
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function log(level, provider = 'OneAPI', message, data) {
  // Skip if below current log level
  if (LOG_LEVELS[level] < currentLogLevel) {
    return;
  }
  
  const formattedMessage = formatLogMessage(level, provider, message, data);
  
  switch (level) {
    case 'DEBUG':
      console.debug(formattedMessage);
      break;
    case 'INFO':
      console.info(formattedMessage);
      break;
    case 'WARN':
      console.warn(formattedMessage);
      break;
    case 'ERROR':
      console.error(formattedMessage);
      break;
  }
}

/**
 * Logs a debug message
 * @param {string} provider - Provider name
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function debug(provider, message, data) {
  log('DEBUG', provider, message, data);
}

/**
 * Logs an info message
 * @param {string} provider - Provider name
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function info(provider, message, data) {
  log('INFO', provider, message, data);
}

/**
 * Logs a warning message
 * @param {string} provider - Provider name
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function warn(provider, message, data) {
  log('WARN', provider, message, data);
}

/**
 * Logs an error message
 * @param {string} provider - Provider name
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function error(provider, message, data) {
  log('ERROR', provider, message, data);
}

/**
 * Utility function to log API request information
 * @param {string} provider - Provider name
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 */
function logApiRequest(provider, endpoint, params) {
  const sanitizedParams = { ...params };
  
  // Sanitize sensitive data
  if (sanitizedParams.apiKey) {
    sanitizedParams.apiKey = '***';
  }
  if (sanitizedParams.key) {
    sanitizedParams.key = '***';
  }
  
  debug(provider, `API Request to ${endpoint}`, sanitizedParams);
}

/**
 * Utility function to log API response information
 * @param {string} provider - Provider name
 * @param {string} endpoint - API endpoint
 * @param {Object} response - Response data
 * @param {number} latency - Request latency in ms
 */
function logApiResponse(provider, endpoint, response, latency) {
  const responseData = {
    status: response.status || 'unknown',
    latency: `${latency}ms`,
    data: response.data ? '(Response data available)' : '(No data)'
  };
  
  debug(provider, `API Response from ${endpoint}`, responseData);
}

/**
 * Utility function to log error information
 * @param {string} provider - Provider name
 * @param {string} context - Error context
 * @param {Error} err - Error object
 */
function logError(provider, context, err) {
  const errorData = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    type: err.type
  };
  
  error(provider, `Error in ${context}`, errorData);
}

/**
 * Creates a logger instance specific to a provider
 * @param {string} provider - Provider name
 * @returns {Object} - Provider-specific logger methods
 */
function createProviderLogger(provider) {
  return {
    debug: (message, data) => debug(provider, message, data),
    info: (message, data) => info(provider, message, data),
    warn: (message, data) => warn(provider, message, data),
    error: (message, data) => error(provider, message, data),
    logRequest: (endpoint, params) => logApiRequest(provider, endpoint, params),
    logResponse: (endpoint, response, latency) => logApiResponse(provider, endpoint, response, latency),
    logError: (context, err) => logError(provider, context, err)
  };
}

export {
  setLogLevel,
  configure,
  debug,
  info,
  warn,
  error,
  logApiRequest,
  logApiResponse,
  logError,
  createProviderLogger,
  LOG_LEVELS
};
