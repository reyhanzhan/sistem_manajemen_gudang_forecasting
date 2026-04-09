import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ForecastService } from './forecast.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('forecast')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Post('predict/:productId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get AI demand forecast for a product' })
  predict(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('periodDays') periodDays?: number,
  ) {
    return this.forecastService.getForecast(productId, warehouseId, periodDays);
  }

  @Get('history/:productId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get forecast history for a product' })
  history(@Param('productId') productId: string, @Query('limit') limit?: number) {
    return this.forecastService.getHistory(productId, limit);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Run bulk forecast for all products' })
  bulkForecast() {
    return this.forecastService.bulkForecast();
  }

  @Post('train')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Trigger AI model retraining' })
  retrain() {
    return this.forecastService.triggerRetraining();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI service health' })
  health() {
    return this.forecastService.getAiServiceHealth();
  }
}
