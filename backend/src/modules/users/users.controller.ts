import { Controller, Get, Patch, Param, Body, Query, UseGuards, Post, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all users (Admin/Manager)' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':userId/warehouses/:warehouseId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign user to warehouse' })
  assignWarehouse(
    @Param('userId') userId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.usersService.assignWarehouse(userId, warehouseId);
  }

  @Delete(':userId/warehouses/:warehouseId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove warehouse assignment' })
  removeWarehouse(
    @Param('userId') userId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.usersService.removeWarehouseAssignment(userId, warehouseId);
  }
}
