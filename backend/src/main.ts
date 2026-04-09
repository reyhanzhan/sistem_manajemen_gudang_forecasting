import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ─── Security ──────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // ─── Global Prefix ────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Validation ────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger API Documentation ─────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Warehouse Management System API')
    .setDescription('AI-Powered WMS — RESTful API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & Authorization')
    .addTag('users', 'User Management')
    .addTag('warehouses', 'Warehouse Management')
    .addTag('products', 'Product Catalog')
    .addTag('inventory', 'Inventory Operations')
    .addTag('movements', 'Stock Movements')
    .addTag('suppliers', 'Supplier Management')
    .addTag('forecast', 'AI Demand Forecasting')
    .addTag('notifications', 'Alert System')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ─── Start Server ──────────────────────────────────────
  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
