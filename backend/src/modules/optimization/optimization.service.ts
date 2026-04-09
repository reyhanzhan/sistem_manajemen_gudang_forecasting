import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);
  private readonly aiServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async generatePurchaseOrder(data: {
    productId: string;
    warehouseId?: string;
    orderCost?: number;
    holdingCostRate?: number;
  }) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/v1/optimization/purchase-order`,
        {
          product_id: data.productId,
          warehouse_id: data.warehouseId,
          order_cost: data.orderCost,
          holding_cost_rate: data.holdingCostRate,
        },
        { timeout: 30000 },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`PO generation failed: ${error.message}`);
      throw new HttpException('Optimization service unavailable', 503);
    }
  }

  async generateBulkPO(warehouseId?: string) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/v1/optimization/bulk-po`,
        null,
        { params: { warehouse_id: warehouseId }, timeout: 120000 },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Bulk PO generation failed: ${error.message}`);
      throw new HttpException('Optimization service unavailable', 503);
    }
  }
}
