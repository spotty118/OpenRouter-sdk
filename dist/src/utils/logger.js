"use strict";
/**
 * Logger utility for OpenRouter SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
/**
 * Logger implementation
 */
class Logger {
    /**
     * Create a new logger
     * @param level - The log level (default: 'info')
     */
    constructor(level = 'info') {
        this.levels = {
            none: 0,
            error: 1,
            warn: 2,
            info: 3,
            debug: 4
        };
        this.level = level;
    }
    /**
     * Log an error message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    error(message, ...args) {
        if (this.levels[this.level] >= this.levels.error) {
            console.error(`[OpenRouter ERROR] ${message}`, ...args);
        }
    }
    /**
     * Log a warning message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    warn(message, ...args) {
        if (this.levels[this.level] >= this.levels.warn) {
            console.warn(`[OpenRouter WARN] ${message}`, ...args);
        }
    }
    /**
     * Log an info message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    info(message, ...args) {
        if (this.levels[this.level] >= this.levels.info) {
            console.info(`[OpenRouter INFO] ${message}`, ...args);
        }
    }
    /**
     * Log a debug message
     * @param message - The message to log
     * @param args - Additional arguments
     */
    debug(message, ...args) {
        if (this.levels[this.level] >= this.levels.debug) {
            console.debug(`[OpenRouter DEBUG] ${message}`, ...args);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map