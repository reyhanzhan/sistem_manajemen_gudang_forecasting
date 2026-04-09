import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, Socket>();

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  // ─── Inventory Events ─────────────────────────────────

  emitInventoryUpdate(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    previousQuantity: number;
    movementType: string;
  }) {
    this.server.emit('inventory:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Movement Events ─────────────────────────────────

  emitMovementCreated(movement: any) {
    this.server.emit('movement:created', {
      id: movement.id,
      referenceNumber: movement.referenceNumber,
      type: movement.type,
      status: movement.status,
      createdBy: movement.createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  emitMovementStatusChanged(movement: any) {
    this.server.emit('movement:status-changed', {
      id: movement.id,
      referenceNumber: movement.referenceNumber,
      type: movement.type,
      status: movement.status,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Notification Events ──────────────────────────────

  emitNotification(userId: string, notification: any) {
    // Emit to all clients (frontend filters by userId)
    this.server.emit('notification:new', {
      userId,
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Low Stock Alert Events ───────────────────────────

  emitLowStockAlert(data: {
    productId: string;
    productName: string;
    warehouseId: string;
    warehouseName: string;
    currentStock: number;
    minStockLevel: number;
  }) {
    this.server.emit('alert:low-stock', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Anomaly Alert Events ────────────────────────────

  emitAnomalyDetected(data: {
    movementId: string;
    riskLevel: string;
    reasons: string[];
  }) {
    this.server.emit('alert:anomaly', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Dashboard Refresh Event ─────────────────────────

  emitDashboardRefresh() {
    this.server.emit('dashboard:refresh', {
      timestamp: new Date().toISOString(),
    });
  }

  getConnectedCount(): number {
    return this.connectedClients.size;
  }
}
