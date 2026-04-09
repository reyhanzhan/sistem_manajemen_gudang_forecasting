import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive dashboard statistics
   */
  async getOverview() {
    const [
      totalProducts,
      activeProducts,
      totalWarehouses,
      totalSuppliers,
      totalMovements,
      pendingMovements,
      recentMovements,
      inventoryStats,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.warehouse.count({ where: { status: 'ACTIVE' } }),
      this.prisma.supplier.count({ where: { isActive: true } }),
      this.prisma.inventoryMovement.count(),
      this.prisma.inventoryMovement.count({ where: { status: 'PENDING' } }),
      this.prisma.inventoryMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceWarehouse: { select: { code: true, name: true } },
          destinationWarehouse: { select: { code: true, name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.getInventoryStats(),
    ]);

    return {
      counts: {
        totalProducts,
        activeProducts,
        totalWarehouses,
        totalSuppliers,
        totalMovements,
        pendingMovements,
      },
      inventoryStats,
      recentMovements,
    };
  }

  /**
   * Get inventory statistics
   */
  private async getInventoryStats() {
    const inventory = await this.prisma.inventory.findMany({
      include: {
        product: {
          select: { minStockLevel: true, reorderPoint: true, unitPrice: true },
        },
      },
    });

    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = inventory.reduce(
      (sum, i) => sum + i.quantity * Number(i.product.unitPrice),
      0,
    );
    const lowStockCount = inventory.filter(
      (i) => i.quantity <= i.product.minStockLevel,
    ).length;
    const outOfStockCount = inventory.filter((i) => i.quantity === 0).length;

    return { totalItems, totalQuantity, totalValue, lowStockCount, outOfStockCount };
  }

  /**
   * Get movement trends (last 30 days)
   */
  async getMovementTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'COMPLETED',
      },
      select: { type: true, createdAt: true, lines: { select: { quantity: true } } },
    });

    // Group by date and type
    const trends: Record<string, { STOCK_IN: number; STOCK_OUT: number; TRANSFER: number }> = {};

    movements.forEach((m) => {
      const dateKey = m.createdAt.toISOString().slice(0, 10);
      if (!trends[dateKey]) {
        trends[dateKey] = { STOCK_IN: 0, STOCK_OUT: 0, TRANSFER: 0 };
      }
      const totalQty = m.lines.reduce((sum, l) => sum + l.quantity, 0);
      trends[dateKey][m.type] += totalQty;
    });

    return Object.entries(trends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get top products by movement volume
   */
  async getTopProducts(limit = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movements = await this.prisma.movementLine.findMany({
      where: {
        movement: { createdAt: { gte: thirtyDaysAgo }, status: 'COMPLETED' },
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
      },
    });

    const productVolumes: Record<string, { product: any; totalQuantity: number; movementCount: number }> = {};

    movements.forEach((line) => {
      const key = line.productId;
      if (!productVolumes[key]) {
        productVolumes[key] = { product: line.product, totalQuantity: 0, movementCount: 0 };
      }
      productVolumes[key].totalQuantity += line.quantity;
      productVolumes[key].movementCount += 1;
    });

    return Object.values(productVolumes)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  }

  /**
   * Get warehouse utilization
   */
  async getWarehouseUtilization() {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: { select: { inventoryItems: true } },
        inventoryItems: { select: { quantity: true } },
      },
    });

    return warehouses.map((wh) => ({
      id: wh.id,
      code: wh.code,
      name: wh.name,
      city: wh.city,
      capacity: wh.capacity,
      itemCount: wh._count.inventoryItems,
      totalStock: wh.inventoryItems.reduce((sum, i) => sum + i.quantity, 0),
      utilizationPercent: wh.capacity > 0
        ? Math.round((wh.inventoryItems.reduce((sum, i) => sum + i.quantity, 0) / wh.capacity) * 100)
        : 0,
    }));
  }
}
