/**
 * WebSocket server for real-time updates
 */
import { WebSocket, WebSocketServer } from 'ws';
import { Logger } from './logger.js';
import { OpenRouterError } from '../errors/openrouter-error.js';

interface SocketMessage {
  type: 'status' | 'metrics' | 'error';
  data: any;
}

export class SocketServer {
  private wss: WebSocketServer;
  private logger: Logger;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number = 3001) {
    this.logger = new Logger('info');
    
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      this.logger.info('New client connected');

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.info('Client disconnected');
      });

      ws.on('error', (error: Error) => {
        this.logger.error('WebSocket error:', error);
      });
    });

    this.logger.info(`WebSocket server running on port ${port}`);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: SocketMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Broadcast model status update
   */
  broadcastModelStatus(model: string, status: {
    available: boolean;
    requestCount: number;
    tokenCount: number;
    errorRate: number;
  }): void {
    this.broadcast({
      type: 'status',
      data: {
        model,
        ...status,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Broadcast metrics update
   */
  broadcastMetrics(metrics: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    averageLatency: number;
    errorRate: number;
  }): void {
    this.broadcast({
      type: 'metrics',
      data: {
        ...metrics,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Broadcast error notification
   */
  broadcastError(error: Error | OpenRouterError): void {
    this.broadcast({
      type: 'error',
      data: {
        message: error.message,
        timestamp: new Date().toISOString(),
        ...(error instanceof OpenRouterError && {
          status: error.status,
          data: error.data
        })
      }
    });
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    this.wss.close();
    this.logger.info('WebSocket server closed');
  }
}

// Export singleton instance
export const socketServer = new SocketServer();
