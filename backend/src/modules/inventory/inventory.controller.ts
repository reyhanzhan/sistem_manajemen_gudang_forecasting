import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory with filters' })
  findAll(@Query() query: any) {
    return this.inventoryService.findAll(query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Post('adjust')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Adjust stock level (physical count correction)' })
  adjustStock(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.inventoryService.adjustStock({ ...body, userId });
  }
}
