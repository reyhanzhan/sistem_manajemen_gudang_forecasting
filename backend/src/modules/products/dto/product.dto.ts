import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-ELEC-001' }) @IsString() sku: string;
  @ApiProperty({ example: 'Wireless Mouse Logitech M331' }) @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ default: 'pcs' }) @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensions?: string;
  @ApiPropertyOptional({ default: 10 }) @IsOptional() @IsInt() @Min(0) minStockLevel?: number;
  @ApiPropertyOptional({ default: 1000 }) @IsOptional() @IsInt() @Min(0) maxStockLevel?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(0) reorderPoint?: number;
  @ApiPropertyOptional({ default: 100 }) @IsOptional() @IsInt() @Min(1) reorderQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsInt() @Min(0) minStockLevel?: number;
  @IsOptional() @IsInt() @Min(0) maxStockLevel?: number;
  @IsOptional() @IsInt() @Min(0) reorderPoint?: number;
  @IsOptional() @IsInt() @Min(1) reorderQuantity?: number;
  @IsOptional() @IsNumber() unitPrice?: number;
  @IsOptional() @IsString() status?: string;
}

export class ProductQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
