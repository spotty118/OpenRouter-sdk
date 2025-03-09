/**
 * Logger utility for OpenRouter SDK
 */

/**
 * Log levels
 */
export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger implementation
 */
export class Logger {
  private level: LogLevel;
  private readonly levels = {
    none: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4
  };

  /**
   * Create a new logger
   * @param level - The log level (default: 'info')
   */
  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  /**
   * Log an error message
   * @param message - The message to log
   * @param args - Additional arguments
   */
  error(message: string, ...args: any[]): void {
    if (this.levels[this.level] >= this.levels.error) {
      console.error(`[OpenRouter ERROR] ${message}`, ...args);
    }
  }

  /**
   * Log a warning message
   * @param message - The message to log
   * @param args - Additional arguments
   */
  warn(message: string, ...args: any[]): void {
    if (this.levels[this.level] >= this.levels.warn) {
      console.warn(`[OpenRouter WARN] ${message}`, ...args);
    }
  }

  /**
   * Log an info message
   * @param message - The message to log
   * @param args - Additional arguments
   */
  info(message: string, ...args: any[]): void {
    if (this.levels[this.level] >= this.levels.info) {
      console.info(`[OpenRouter INFO] ${message}`, ...args);
    }
  }

  /**
   * Log a debug message
   * @param message - The message to log
   * @param args - Additional arguments
   */
  debug(message: string, ...args: any[]): void {
    if (this.levels[this.level] >= this.levels.debug) {
      console.debug(`[OpenRouter DEBUG] ${message}`, ...args);
    }
  }
}