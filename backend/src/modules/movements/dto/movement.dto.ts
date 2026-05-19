import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsInt, Min, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MovementLineDto {
  @ApiProperty() @IsString() productId: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateMovementDto {
  @ApiProperty({ enum: ['STOCK_IN', 'STOCK_OUT', 'TRANSFER', 'ADJUSTMENT'] as const })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Source warehouse (required for STOCK_OUT, TRANSFER)' })
  @IsOptional() @IsString() sourceWarehouseId?: string;

  @ApiPropertyOptional({ description: 'Destination warehouse (required for STOCK_IN, TRANSFER)' })
  @IsOptional() @IsString() destinationWarehouseId?: string;

  @ApiPropertyOptional({ description: 'Supplier (for STOCK_IN)' })
  @IsOptional() @IsString() supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [MovementLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovementLineDto)
  lines: MovementLineDto[];
}

export class MovementQueryDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
