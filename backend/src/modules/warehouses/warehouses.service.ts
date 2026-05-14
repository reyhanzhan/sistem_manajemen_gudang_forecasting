import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseQueryDto } from './dto/warehouse.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Warehouse code already exists');

    return this.prisma.warehouse.create({ data: dto });
  }

  async findAll(query: WarehouseQueryDto) {
    const { search, status, city, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WarehouseWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (city) where.city = { contains: city };

    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { inventoryItems: true, userAssignments: true } },
        },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        stockLocations: true,
        _count: { select: { inventoryItems: true, userAssignments: true } },
      },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async getInventorySummary(warehouseId: string) {
    await this.findOne(warehouseId);

    const inventory = await this.prisma.inventory.findMany({
      where: { warehouseId },
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true, minStockLevel: true } },
        location: { select: { id: true, code: true, name: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = inventory.filter(
      (item) => item.quantity <= item.product.minStockLevel,
    );

    return { warehouseId, totalItems, totalQuantity, lowStockCount: lowStockItems.length, inventory, lowStockItems };
  }
}
