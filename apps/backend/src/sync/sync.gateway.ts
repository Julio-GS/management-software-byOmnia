import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

/**
 * WebSocket Gateway for real-time sync notifications
 * 
 * Events emitted:
 * - product:created - When a product is created
 * - product:updated - When a product is updated
 * - product:deleted - When a product is deleted (soft delete)
 * - category:updated - When a category is updated
 * - inventory:movement - When inventory movement is created
 * - pricing:recalculated - When prices are recalculated
 * - sync:status - Sync status updates
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/sync',
})
export class SyncGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SyncGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1] ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      
      // Store user info in socket data
      client.data.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };

      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.username}, role: ${payload.role})`,
      );

      // Send welcome message
      client.emit('sync:status', {
        status: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Connected to sync server',
      });
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.emit('sync:status', {
        status: 'error',
        message: 'Authentication failed',
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const username = client.data.user?.username || 'unknown';
    this.logger.log(`Client disconnected: ${client.id} (user: ${username})`);
  }

  // Emit product created event to all connected clients
  emitProductCreated(product: any) {
    this.server.emit('product:created', {
      timestamp: new Date().toISOString(),
      data: product,
    });
    this.logger.debug(`Emitted product:created for product ${product.id}`);
  }

  // Emit product updated event to all connected clients
  emitProductUpdated(product: any) {
    this.server.emit('product:updated', {
      timestamp: new Date().toISOString(),
      data: product,
    });
    this.logger.debug(`Emitted product:updated for product ${product.id}`);
  }

  // Emit product deleted event to all connected clients
  emitProductDeleted(productId: string) {
    this.server.emit('product:deleted', {
      timestamp: new Date().toISOString(),
      data: { id: productId },
    });
    this.logger.debug(`Emitted product:deleted for product ${productId}`);
  }

  // Emit category updated event to all connected clients
  emitCategoryUpdated(category: any) {
    this.server.emit('category:updated', {
      timestamp: new Date().toISOString(),
      data: category,
    });
    this.logger.debug(`Emitted category:updated for category ${category.id}`);
  }

  // Emit inventory movement event to all connected clients
  emitInventoryMovement(movement: any) {
    this.server.emit('inventory:movement', {
      timestamp: new Date().toISOString(),
      data: movement,
    });
    this.logger.debug(
      `Emitted inventory:movement for product ${movement.productId}`,
    );
  }

  // Emit pricing recalculated event to all connected clients
  emitPricingRecalculated(data: {
    type: 'product' | 'category' | 'global';
    count: number;
    id?: string;
  }) {
    this.server.emit('pricing:recalculated', {
      timestamp: new Date().toISOString(),
      data,
    });
    this.logger.debug(
      `Emitted pricing:recalculated (type: ${data.type}, count: ${data.count})`,
    );
  }

  // Emit sync status event to all connected clients
  emitSyncStatus(status: {
    status: 'syncing' | 'completed' | 'error';
    message?: string;
    details?: any;
  }) {
    this.server.emit('sync:status', {
      timestamp: new Date().toISOString(),
      ...status,
    });
    this.logger.debug(`Emitted sync:status (${status.status})`);
  }

  // Handle ping from clients (for connection health check)
  @SubscribeMessage('ping')
  handlePing(client: Socket): { event: string; data: any } {
    return {
      event: 'pong',
      data: {
        timestamp: new Date().toISOString(),
        clientId: client.id,
      },
    };
  }
}
