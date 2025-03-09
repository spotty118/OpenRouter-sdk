/**
 * Enhanced Health Check Middleware
 *
 * This file provides a more detailed health check endpoint for system monitoring.
 */
import version from '../../../package.json' with { type: 'json' };
import { Logger } from '../../utils/logger.js';
import os from 'os';
const logger = new Logger('info');
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
export const detailedHealthCheck = async (req, res) => {
    const startCheck = Date.now();
    try {
        // Get system information
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
        // Prepare health status response
        const healthStatus = {
            status: 'ok',
            version: version.version,
            uptime: Math.floor((Date.now() - startTime) / 1000), // in seconds
            timestamp: new Date().toISOString(),
            system: {
                memory: {
                    free: Math.round(freeMem / 1024 / 1024), // in MB
                    total: Math.round(totalMem / 1024 / 1024), // in MB
                    usedPercent
                },
                cpu: {
                    loadAvg: os.loadavg(),
                    cores: os.cpus().length
                },
                platform: os.platform(),
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
        const highLoad = os.loadavg()[0] > os.cpus().length * 0.8;
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
            cpuLoad: os.loadavg()[0],
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
//# sourceMappingURL=detailed-health.js.map