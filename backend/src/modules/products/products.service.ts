import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException('SKU already exists');
    return this.prisma.product.create({ data: dto });
  }

  async findAll(query: ProductQueryDto) {
    const { search, categoryId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          suppliers: {
            include: { supplier: { select: { id: true, name: true, code: true } } },
          },
          _count: { select: { inventoryItems: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        suppliers: { include: { supplier: true } },
        inventoryItems: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async getStockAcrossWarehouses(productId: string) {
    await this.findOne(productId);
    return this.prisma.inventory.findMany({
      where: { productId },
      include: {
        warehouse: { select: { id: true, name: true, code: true, city: true } },
      },
    });
  }
}
