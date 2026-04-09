import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview stats' })
  getOverview() { return this.dashboardService.getOverview(); }

  @Get('movement-trends')
  @ApiOperation({ summary: 'Get movement trends (last N days)' })
  getMovementTrends(@Query('days') days?: number) {
    return this.dashboardService.getMovementTrends(days);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top products by movement volume' })
  getTopProducts(@Query('limit') limit?: number) {
    return this.dashboardService.getTopProducts(limit);
  }

  @Get('warehouse-utilization')
  @ApiOperation({ summary: 'Get warehouse utilization stats' })
  getWarehouseUtilization() {
    return this.dashboardService.getWarehouseUtilization();
  }
}
