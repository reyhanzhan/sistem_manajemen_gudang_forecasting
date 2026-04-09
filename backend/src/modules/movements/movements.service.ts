import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { CreateMovementDto, MovementQueryDto } from './dto/movement.dto';
import { MovementType, MovementStatus, Prisma } from '@prisma/client';

@Injectable()
export class MovementsService {
  private readonly logger = new Logger(MovementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Generate unique reference number: MOV-YYYYMMDD-XXX
   */
  private async generateReferenceNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `MOV-${today}`;

    const lastMovement = await this.prisma.inventoryMovement.findFirst({
      where: { referenceNumber: { startsWith: prefix } },
      orderBy: { referenceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastMovement) {
      const lastSeq = parseInt(lastMovement.referenceNumber.split('-').pop() || '0', 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Validate movement business rules
   */
  private validateMovement(dto: CreateMovementDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Movement must have at least one line item');
    }

    switch (dto.type) {
      case MovementType.STOCK_IN:
        if (!dto.destinationWarehouseId) {
          throw new BadRequestException('Destination warehouse required for Stock In');
        }
        break;
      case MovementType.STOCK_OUT:
        if (!dto.sourceWarehouseId) {
          throw new BadRequestException('Source warehouse required for Stock Out');
        }
        break;
      case MovementType.TRANSFER:
        if (!dto.sourceWarehouseId || !dto.destinationWarehouseId) {
          throw new BadRequestException('Both source and destination warehouses required for Transfer');
        }
        if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
          throw new BadRequestException('Source and destination cannot be the same warehouse');
        }
        break;
    }
  }

  /**
   * Create a new inventory movement (Stock In / Stock Out / Transfer)
   */
  async create(dto: CreateMovementDto, userId: string) {
    this.validateMovement(dto);

    const referenceNumber = await this.generateReferenceNumber();

    // Use transaction for data integrity
    return this.prisma.$transaction(async (tx) => {
      // Create movement header
      const movement = await tx.inventoryMovement.create({
        data: {
          referenceNumber,
          type: dto.type,
          status: MovementStatus.PENDING,
          sourceWarehouseId: dto.sourceWarehouseId,
          destinationWarehouseId: dto.destinationWarehouseId,
          supplierId: dto.supplierId,
          notes: dto.notes,
          createdById: userId,
          lines: {
            create: dto.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              batchNumber: line.batchNumber,
              expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
              notes: line.notes,
            })),
          },
        },
        include: {
          lines: { include: { product: { select: { id: true, sku: true, name: true } } } },
          sourceWarehouse: { select: { id: true, code: true, name: true } },
          destinationWarehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      this.logger.log(`Movement created: ${referenceNumber} (${dto.type})`);

      // Emit real-time event
      this.eventsGateway.emitMovementCreated(movement);

      return movement;
    });
  }

  /**
   * Approve and execute a movement — updates inventory levels
   */
  async approve(movementId: string, approverId: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id: movementId },
      include: { lines: true },
    });

    if (!movement) throw new NotFoundException('Movement not found');
    if (movement.status !== MovementStatus.PENDING) {
      throw new BadRequestException(`Cannot approve movement with status: ${movement.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Process each line item
      for (const line of movement.lines) {
        // STOCK_OUT or TRANSFER — decrease source
        if (
          (movement.type === MovementType.STOCK_OUT || movement.type === MovementType.TRANSFER) &&
          movement.sourceWarehouseId
        ) {
          const sourceInventory = await tx.inventory.findFirst({
            where: { productId: line.productId, warehouseId: movement.sourceWarehouseId },
          });

          if (!sourceInventory || sourceInventory.quantity < line.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${line.productId} in source warehouse`,
            );
          }

          await tx.inventory.update({
            where: { id: sourceInventory.id },
            data: {
              quantity: { decrement: line.quantity },
              availableQty: { decrement: line.quantity },
            },
          });
        }

        // STOCK_IN or TRANSFER — increase destination
        if (
          (movement.type === MovementType.STOCK_IN || movement.type === MovementType.TRANSFER) &&
          movement.destinationWarehouseId
        ) {
          await tx.inventory.upsert({
            where: {
              productId_warehouseId_locationId: {
                productId: line.productId,
                warehouseId: movement.destinationWarehouseId,
                locationId: '', // default location
              },
            },
            create: {
              productId: line.productId,
              warehouseId: movement.destinationWarehouseId,
              quantity: line.quantity,
              availableQty: line.quantity,
            },
            update: {
              quantity: { increment: line.quantity },
              availableQty: { increment: line.quantity },
            },
          });
        }
      }

      // Update movement status
      const updated = await tx.inventoryMovement.update({
        where: { id: movementId },
        data: {
          status: MovementStatus.COMPLETED,
          approvedById: approverId,
          approvedAt: new Date(),
          completedAt: new Date(),
        },
        include: {
          lines: { include: { product: true } },
          sourceWarehouse: true,
          destinationWarehouse: true,
        },
      });

      this.logger.log(`Movement approved: ${movement.referenceNumber}`);

      // Emit real-time events
      this.eventsGateway.emitMovementStatusChanged(updated);
      this.eventsGateway.emitDashboardRefresh();

      // Emit inventory updates for each line
      for (const line of movement.lines) {
        if (movement.sourceWarehouseId) {
          this.eventsGateway.emitInventoryUpdate({
            productId: line.productId,
            warehouseId: movement.sourceWarehouseId,
            quantity: -line.quantity,
            previousQuantity: line.quantity,
            movementType: movement.type,
          });
        }
        if (movement.destinationWarehouseId) {
          this.eventsGateway.emitInventoryUpdate({
            productId: line.productId,
            warehouseId: movement.destinationWarehouseId,
            quantity: line.quantity,
            previousQuantity: 0,
            movementType: movement.type,
          });
        }
      }

      return updated;
    });
  }

  /**
   * Reject a movement
   */
  async reject(movementId: string, approverId: string, reason?: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({ where: { id: movementId } });
    if (!movement) throw new NotFoundException('Movement not found');
    if (movement.status !== MovementStatus.PENDING) {
      throw new BadRequestException(`Cannot reject movement with status: ${movement.status}`);
    }

    return this.prisma.inventoryMovement.update({
      where: { id: movementId },
      data: {
        status: MovementStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
        notes: reason ? `${movement.notes || ''}\n[REJECTED] ${reason}` : movement.notes,
      },
    });
  }

  /**
   * List movements with filters
   */
  async findAll(query: MovementQueryDto) {
    const { type, warehouseId, status, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryMovementWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status as MovementStatus;
    if (warehouseId) {
      where.OR = [
        { sourceWarehouseId: warehouseId },
        { destinationWarehouseId: warehouseId },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lines: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
          sourceWarehouse: { select: { id: true, code: true, name: true } },
          destinationWarehouse: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true } },
        sourceWarehouse: true,
        destinationWarehouse: true,
        supplier: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!movement) throw new NotFoundException('Movement not found');
    return movement;
  }
}
