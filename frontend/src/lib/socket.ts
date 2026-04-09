import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(`${WS_URL}/ws`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();

    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    return () => {
      // Don't disconnect on unmount — keep the global connection alive
    };
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    const socket = socketRef.current || getSocket();
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    const socket = socketRef.current || getSocket();
    socket.emit(event, data);
  }, []);

  return { socket: socketRef.current, on, emit };
}

// ─── Typed event hooks ──────────────────────────────────

export interface InventoryUpdateEvent {
  productId: string;
  warehouseId: string;
  quantity: number;
  previousQuantity: number;
  movementType: string;
  timestamp: string;
}

export interface MovementEvent {
  id: string;
  referenceNumber: string;
  type: string;
  status: string;
  timestamp: string;
}

export interface NotificationEvent {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  timestamp: string;
}

export interface LowStockAlertEvent {
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minStockLevel: number;
  timestamp: string;
}

export interface AnomalyAlertEvent {
  movementId: string;
  riskLevel: string;
  reasons: string[];
  timestamp: string;
}

export function useInventoryUpdates(callback: (data: InventoryUpdateEvent) => void) {
  const { on } = useSocket();
  useEffect(() => {
    return on('inventory:update', callback);
  }, [on, callback]);
}

export function useMovementEvents(callback: (data: MovementEvent) => void) {
  const { on } = useSocket();
  useEffect(() => {
    const unsub1 = on('movement:created', callback);
    const unsub2 = on('movement:status-changed', callback);
    return () => { unsub1(); unsub2(); };
  }, [on, callback]);
}

export function useDashboardRefresh(callback: () => void) {
  const { on } = useSocket();
  useEffect(() => {
    return on('dashboard:refresh', callback);
  }, [on, callback]);
}

export function useAnomalyAlerts(callback: (data: AnomalyAlertEvent) => void) {
  const { on } = useSocket();
  useEffect(() => {
    return on('alert:anomaly', callback);
  }, [on, callback]);
}
