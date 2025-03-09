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
export declare class Logger {
    private level;
    private readonly levels;
    /**
     * Create a new logger
     * @param level - The log level (default: 'info')
     */
    constructor(level?: LogLevel);
    /**
     * Log an error message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    error(message: string, ...args: any[]): void;
    /**
     * Log a warning message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    warn(message: string, ...args: any[]): void;
    /**
     * Log an info message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    info(message: string, ...args: any[]): void;
    /**
     * Log a debug message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    debug(message: string, ...args: any[]): void;
}
