import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: { isRead?: boolean; type?: string; page?: number; limit?: number }) {
    const { isRead, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;
    if (type) where.type = type;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) }, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Create notification for specific users or all managers/admins
   */
  async createAlert(params: {
    userIds?: string[];
    type: string;
    priority: string;
    title: string;
    message: string;
    metadata?: string;
  }) {
    let targetUserIds = params.userIds;

    // If no specific users, notify all ADMIN and MANAGER
    if (!targetUserIds || targetUserIds.length === 0) {
      const managers = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
        select: { id: true },
      });
      targetUserIds = managers.map((u) => u.id);
    }

    const notifications = targetUserIds.map((userId) => ({
      userId,
      type: params.type,
      priority: params.priority,
      title: params.title,
      message: params.message,
      metadata: params.metadata,
    }));

    return this.prisma.notification.createMany({ data: notifications });
  }

  /**
   * CRON: Check for low stock every hour and generate alerts
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStock() {
    this.logger.log('Running low stock check...');

    const lowStockItems = await this.prisma.inventory.findMany({
      where: {
        quantity: { lte: 0 }, // Will use raw comparison in real impl
      },
      include: {
        product: { select: { id: true, sku: true, name: true, minStockLevel: true, reorderPoint: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    // Get all inventory and filter for low stock
    const allInventory = await this.prisma.inventory.findMany({
      include: {
        product: { select: { id: true, sku: true, name: true, minStockLevel: true, reorderPoint: true, reorderQuantity: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    const criticalItems = allInventory.filter(
      (item) => item.quantity <= item.product.minStockLevel,
    );

    for (const item of criticalItems) {
      const priority = item.quantity === 0 ? 'CRITICAL' : 'HIGH';

      await this.createAlert({
        type: 'LOW_STOCK',
        priority,
        title: `Low Stock: ${item.product.name}`,
        message: `${item.product.sku} at ${item.warehouse.name} has ${item.quantity} units (min: ${item.product.minStockLevel}). Suggested reorder: ${item.product.reorderQuantity} units.`,
        metadata: JSON.stringify({
          productId: item.product.id,
          warehouseId: item.warehouse.id,
          currentStock: item.quantity,
          minStockLevel: item.product.minStockLevel,
        }),
      });
    }

    this.logger.log(`Low stock check complete: ${criticalItems.length} alerts generated`);
  }
}
