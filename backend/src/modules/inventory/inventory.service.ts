import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get inventory with filters, pagination, and low stock flagging
   */
  async findAll(query: {
    warehouseId?: string;
    productId?: string;
    lowStockOnly?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { warehouseId, productId, lowStockOnly, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
        ],
      };
    }

    // For low stock filter, we need raw query or post-filter
    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true, sku: true, name: true, unit: true,
              minStockLevel: true, reorderPoint: true, reorderQuantity: true, unitPrice: true,
            },
          },
          warehouse: { select: { id: true, code: true, name: true, city: true } },
          location: { select: { id: true, code: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Enrich with low stock flag
    const enrichedData = data.map((item) => ({
      ...item,
      isLowStock: item.quantity <= item.product.minStockLevel,
      isBelowReorder: item.quantity <= item.product.reorderPoint,
      stockValue: Number(item.product.unitPrice) * item.quantity,
    }));

    const filteredData = lowStockOnly
      ? enrichedData.filter((item) => item.isLowStock)
      : enrichedData;

    return {
      data: filteredData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: {
        totalItems: data.length,
        lowStockCount: enrichedData.filter((i) => i.isLowStock).length,
        totalValue: enrichedData.reduce((sum, i) => sum + i.stockValue, 0),
      },
    };
  }

  /**
   * Adjust stock level directly (for physical count corrections)
   */
  async adjustStock(params: {
    productId: string;
    warehouseId: string;
    newQuantity: number;
    reason: string;
    userId: string;
  }) {
    const { productId, warehouseId, newQuantity, reason, userId } = params;

    if (newQuantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    const inventory = await this.prisma.inventory.findFirst({
      where: { productId, warehouseId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const oldQuantity = inventory.quantity;

    const updated = await this.prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: newQuantity,
        availableQty: newQuantity - inventory.reservedQty,
        lastCountedAt: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'STOCK_ADJUSTMENT',
        entity: 'inventory',
        entityId: inventory.id,
        oldValues: { quantity: oldQuantity },
        newValues: { quantity: newQuantity, reason },
      },
    });

    this.logger.log(
      `Stock adjusted: Product ${productId} in WH ${warehouseId}: ${oldQuantity} → ${newQuantity}`,
    );

    return updated;
  }

  /**
   * Get low stock alerts across all warehouses
   */
  async getLowStockAlerts() {
    const inventory = await this.prisma.inventory.findMany({
      include: {
        product: {
          select: { id: true, sku: true, name: true, minStockLevel: true, reorderPoint: true, reorderQuantity: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    return inventory
      .filter((item) => item.quantity <= item.product.reorderPoint)
      .map((item) => ({
        ...item,
        severity: item.quantity <= item.product.minStockLevel ? 'CRITICAL' : 'WARNING',
        suggestedReorder: item.product.reorderQuantity,
        deficit: item.product.reorderPoint - item.quantity,
      }))
      .sort((a, b) => (a.severity === 'CRITICAL' ? -1 : 1));
  }
}
