/**
 * Simple Logger class for consistent logging
 */
export class Logger {
  private level: LogLevel;
  private context: string;

  /**
   * Create a new logger instance
   * 
   * @param contextOrLevel - Either the log context name or the log level
   * @param level - Optional log level if context is provided
   */
  constructor(contextOrLevel: string = 'info', level?: LogLevel) {
    if (this.isValidLogLevel(contextOrLevel)) {
      this.level = contextOrLevel as LogLevel;
      this.context = '';
    } else {
      this.context = contextOrLevel;
      this.level = level || this.getLogLevelFromEnv();
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const prefix = this.context ? `[OpenRouter ${level.toUpperCase()}]` : `[${level.toUpperCase()}]`;
    
    const formattedMessage = `${prefix} ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, ...args);
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * Determine if a message at the given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      none: 4
    };
    
    return levels[level] >= levels[this.level];
  }

  /**
   * Check if a string is a valid log level
   */
  private isValidLogLevel(level: string): boolean {
    return ['debug', 'info', 'warn', 'error', 'none'].includes(level);
  }

  /**
   * Get log level from environment variable
   */
  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (this.isValidLogLevel(envLevel)) {
      return envLevel;
    }
    return 'info';
  }
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';
