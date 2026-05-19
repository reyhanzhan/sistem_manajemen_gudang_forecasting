import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const ROLE_OPTIONS = ['ADMIN', 'MANAGER', 'STAFF'] as const;
export type Role = (typeof ROLE_OPTIONS)[number];

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional({ enum: ROLE_OPTIONS }) @IsOptional() @IsString() role?: Role;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UserQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
