import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

interface ForecastResponse {
  product_id: string;
  warehouse_id?: string;
  predicted_demand: number;
  confidence_lower: number;
  confidence_upper: number;
  suggested_reorder: number;
  model_version: string;
  model_metrics: {
    mae: number;
    rmse: number;
    r2_score: number;
  };
}

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  /**
   * Request forecast for a specific product
   */
  async getForecast(productId: string, warehouseId?: string, periodDays = 30) {
    try {
      const response = await axios.post<ForecastResponse>(
        `${this.aiServiceUrl}/api/v1/forecast/predict`,
        {
          product_id: productId,
          warehouse_id: warehouseId,
          period_days: periodDays,
        },
        { timeout: 30000 },
      );

      const forecast = response.data;

      // Save forecast result to database
      const saved = await this.prisma.forecastResult.create({
        data: {
          productId,
          warehouseId,
          forecastDate: new Date(),
          periodDays,
          predictedDemand: forecast.predicted_demand,
          confidenceLower: forecast.confidence_lower,
          confidenceUpper: forecast.confidence_upper,
          suggestedReorder: forecast.suggested_reorder,
          modelVersion: forecast.model_version,
          modelMetrics: forecast.model_metrics as any,
          status: 'COMPLETED',
        },
      });

      return saved;
    } catch (error) {
      this.logger.error(`Forecast failed for product ${productId}: ${error.message}`);
      throw new HttpException('AI service unavailable or forecast failed', 503);
    }
  }

  /**
   * Get historical forecasts for a product
   */
  async getHistory(productId: string, limit = 10) {
    return this.prisma.forecastResult.findMany({
      where: { productId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Bulk forecast for all active products
   */
  async bulkForecast() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, sku: true },
    });

    this.logger.log(`Starting bulk forecast for ${products.length} products`);

    const results = [];
    for (const product of products) {
      try {
        const result = await this.getForecast(product.id);
        results.push({ productId: product.id, sku: product.sku, status: 'success', result });
      } catch (error) {
        results.push({ productId: product.id, sku: product.sku, status: 'failed', error: error.message });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    this.logger.log(`Bulk forecast completed: ${successCount}/${products.length} successful`);

    return { total: products.length, success: successCount, failed: products.length - successCount, results };
  }

  /**
   * CRON: Run bulk forecast daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledForecast() {
    this.logger.log('Running scheduled bulk forecast...');
    await this.bulkForecast();
  }

  /**
   * Get AI service health status
   */
  async getAiServiceHealth() {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, { timeout: 5000 });
      return { status: 'healthy', ...response.data };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Trigger model retraining
   */
  async triggerRetraining() {
    try {
      const response = await axios.post(`${this.aiServiceUrl}/api/v1/forecast/train`, {}, { timeout: 120000 });
      return response.data;
    } catch (error) {
      throw new HttpException('Model retraining failed', 503);
    }
  }
}
