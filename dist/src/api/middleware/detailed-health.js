"use strict";
/**
 * Enhanced Health Check Middleware
 *
 * This file provides a more detailed health check endpoint for system monitoring.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detailedHealthCheck = void 0;
const package_json_1 = require("../../../package.json");
const logger_1 = require("../../utils/logger");
const os_1 = __importDefault(require("os"));
const logger = new logger_1.Logger('info');
const startTime = Date.now();
/**
 * Detailed health check handler
 *
 * This provides a comprehensive health check endpoint
 * with detailed information about the system and running services.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
const detailedHealthCheck = async (req, res) => {
    const startCheck = Date.now();
    try {
        // Get system information
        const freeMem = os_1.default.freemem();
        const totalMem = os_1.default.totalmem();
        const usedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
        // Prepare health status response
        const healthStatus = {
            status: 'ok',
            version: package_json_1.version,
            uptime: Math.floor((Date.now() - startTime) / 1000), // in seconds
            timestamp: new Date().toISOString(),
            system: {
                memory: {
                    free: Math.round(freeMem / 1024 / 1024), // in MB
                    total: Math.round(totalMem / 1024 / 1024), // in MB
                    usedPercent
                },
                cpu: {
                    loadAvg: os_1.default.loadavg(),
                    cores: os_1.default.cpus().length
                },
                platform: os_1.default.platform(),
                nodeVersion: process.version
            },
            services: {
                api: {
                    status: 'ok',
                    responseTime: Date.now() - startCheck
                }
            },
            checks: {
                rateLimiter: true,
                auth: true,
                swagger: true,
                compression: true
            }
        };
        // If memory usage is very high, mark as degraded
        if (usedPercent > 90) {
            healthStatus.status = 'degraded';
            healthStatus.services.api.status = 'degraded';
            healthStatus.services.api.message = 'High memory usage';
        }
        // Check CPU load
        const highLoad = os_1.default.loadavg()[0] > os_1.default.cpus().length * 0.8;
        if (highLoad) {
            healthStatus.status = 'degraded';
            healthStatus.services.api.status = 'degraded';
            healthStatus.services.api.message = 'High CPU load';
        }
        // Set appropriate status code
        const statusCode = healthStatus.status === 'ok' ? 200 :
            healthStatus.status === 'degraded' ? 200 : 503;
        // Log health check
        logger.info(`Health check: ${healthStatus.status}`, {
            memoryUsed: usedPercent,
            cpuLoad: os_1.default.loadavg()[0],
            uptime: healthStatus.uptime
        });
        // Return health status
        res.status(statusCode).json(healthStatus);
    }
    catch (error) {
        logger.error('Health check failed', error);
        res.status(500).json({
            status: 'down',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.detailedHealthCheck = detailedHealthCheck;
//# sourceMappingURL=detailed-health.js.map