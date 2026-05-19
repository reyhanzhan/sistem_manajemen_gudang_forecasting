import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';

// Core modules
import { PrismaModule } from './common/prisma/prisma.module';
import { EventsModule } from './common/events/events.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { ProductsModule } from './modules/products/products.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MovementsModule } from './modules/movements/movements.module';
import { ForecastModule } from './modules/forecast/forecast.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnomalyModule } from './modules/anomaly/anomaly.module';
import { OptimizationModule } from './modules/optimization/optimization.module';

@Module({
  imports: [
    // ─── Configuration ───────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // ─── Task Scheduling (CRON jobs) ─────────────────────
    ScheduleModule.forRoot(),

    // ─── Database ────────────────────────────────────────
    PrismaModule,

    // ─── Real-time WebSocket ─────────────────────────────
    EventsModule,

    // ─── Feature Modules ─────────────────────────────────
    AuthModule,
    UsersModule,
    WarehousesModule,
    ProductsModule,
    SuppliersModule,
    InventoryModule,
    MovementsModule,
    ForecastModule,
    NotificationsModule,
    DashboardModule,
    AnomalyModule,
    OptimizationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
