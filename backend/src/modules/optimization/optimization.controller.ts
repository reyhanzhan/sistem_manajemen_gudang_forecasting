import { Controller, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { OptimizationService } from './optimization.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('optimization')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('optimization')
export class OptimizationController {
  constructor(private readonly optimizationService: OptimizationService) {}

  @Post('purchase-order')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generate optimized purchase order (EOQ)' })
  generatePO(@Body() body: {
    productId: string;
    warehouseId?: string;
    orderCost?: number;
    holdingCostRate?: number;
  }) {
    return this.optimizationService.generatePurchaseOrder(body);
  }

  @Post('bulk-po')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate bulk PO for all products needing reorder' })
  bulkPO(@Query('warehouseId') warehouseId?: string) {
    return this.optimizationService.generateBulkPO(warehouseId);
  }
}
