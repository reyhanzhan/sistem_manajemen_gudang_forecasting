import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type WarehouseStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-JKT-01' }) @IsString() code: string;
  @ApiProperty({ example: 'Jakarta Main Warehouse' }) @IsString() name: string;
  @ApiProperty() @IsString() address: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() province: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
}

export class UpdateWarehouseDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() capacity?: number;
  @IsOptional() @IsString() status?: WarehouseStatus;
}

export class WarehouseQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: WarehouseStatus;
  @IsOptional() @IsString() city?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
