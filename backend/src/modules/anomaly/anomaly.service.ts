import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);
  private readonly aiServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async detectAnomalies(daysBack = 90, contamination?: number) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/v1/anomaly/detect`,
        { days_back: daysBack, contamination },
        { timeout: 60000 },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Anomaly detection failed: ${error.message}`);
      throw new HttpException('Anomaly detection service unavailable', 503);
    }
  }

  async checkTransaction(data: {
    movementType: string;
    quantity: number;
    hour: number;
    userDailyCount?: number;
    unitCost?: number;
  }) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/v1/anomaly/check`,
        {
          movement_type: data.movementType,
          quantity: data.quantity,
          hour: data.hour,
          user_daily_count: data.userDailyCount || 1,
          unit_cost: data.unitCost || 0,
        },
        { timeout: 10000 },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Transaction check failed: ${error.message}`);
      throw new HttpException('Anomaly check service unavailable', 503);
    }
  }
}
