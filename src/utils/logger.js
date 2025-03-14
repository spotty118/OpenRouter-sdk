/**
 * Simple logger implementation
 */

/**
 * Logger provides a simple logging mechanism with different log levels
 */
export class Logger {
  /**
   * Log levels
   */
  static LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
  };

  /**
   * Create a new logger
   * 
   * @param {string} level - The minimum log level to output
   */
  constructor(level = 'info') {
    this.setLevel(level);
  }

  /**
   * Set the minimum log level
   * 
   * @param {string} level - The minimum log level to output
   */
  setLevel(level) {
    this.level = Logger.LEVELS[level.toLowerCase()] || Logger.LEVELS.info;
  }

  /**
   * Log a debug message
   * 
   * @param {string} message - The message to log
   * @param {Object} data - Optional data to include
   */
  debug(message, data) {
    if (this.level <= Logger.LEVELS.debug) {
      this.log('DEBUG', message, data);
    }
  }

  /**
   * Log an info message
   * 
   * @param {string} message - The message to log
   * @param {Object} data - Optional data to include
   */
  info(message, data) {
    if (this.level <= Logger.LEVELS.info) {
      this.log('INFO', message, data);
    }
  }

  /**
   * Log a warning message
   * 
   * @param {string} message - The message to log
   * @param {Object} data - Optional data to include
   */
  warn(message, data) {
    if (this.level <= Logger.LEVELS.warn) {
      this.log('WARN', message, data);
    }
  }

  /**
   * Log an error message
   * 
   * @param {string} message - The message to log
   * @param {Object} data - Optional data to include
   */
  error(message, data) {
    if (this.level <= Logger.LEVELS.error) {
      this.log('ERROR', message, data);
    }
  }

  /**
   * Internal log method
   * 
   * @param {string} level - The log level
   * @param {string} message - The message to log
   * @param {Object} data - Optional data to include
   */
  log(level, message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data !== undefined) {
      if (level === 'ERROR') {
        console.error(logMessage, data);
      } else if (level === 'WARN') {
        console.warn(logMessage, data);
      } else if (level === 'DEBUG') {
        console.debug(logMessage, data);
      } else {
        console.log(logMessage, data);
      }
    } else {
      if (level === 'ERROR') {
        console.error(logMessage);
      } else if (level === 'WARN') {
        console.warn(logMessage);
      } else if (level === 'DEBUG') {
        console.debug(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }
}

export default Logger;
