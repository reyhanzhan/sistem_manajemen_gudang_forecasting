import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MovementsService } from './movements.service';
import { CreateMovementDto, MovementQueryDto } from './dto/movement.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('movements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create stock movement (In/Out/Transfer)' })
  create(@Body() dto: CreateMovementDto, @CurrentUser('id') userId: string) {
    return this.movementsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List movements with filters' })
  findAll(@Query() query: MovementQueryDto) {
    return this.movementsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movement details' })
  findOne(@Param('id') id: string) {
    return this.movementsService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Approve and execute movement' })
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.movementsService.approve(id, userId);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Reject movement' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.movementsService.reject(id, userId, reason);
  }
}
