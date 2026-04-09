import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnomalyService } from './anomaly.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('anomaly')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('anomaly')
export class AnomalyController {
  constructor(private readonly anomalyService: AnomalyService) {}

  @Post('detect')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Detect anomalous inventory movements' })
  detect(@Body() body: { daysBack?: number; contamination?: number }) {
    return this.anomalyService.detectAnomalies(body.daysBack, body.contamination);
  }

  @Post('check')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Real-time anomaly check for a single transaction' })
  check(@Body() body: {
    movementType: string;
    quantity: number;
    hour: number;
    userDailyCount?: number;
    unitCost?: number;
  }) {
    return this.anomalyService.checkTransaction(body);
  }
}
