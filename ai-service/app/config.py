from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application configuration from environment variables."""

    DATABASE_URL: str = "postgresql://wms_admin:wms_secure_2024@localhost:5432/warehouse_management"
    MODEL_PATH: str = str(Path(__file__).parent.parent / "models")
    MODEL_VERSION: str = "1.0.0"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Forecasting parameters
    DEFAULT_FORECAST_DAYS: int = 30
    MIN_TRAINING_SAMPLES: int = 10
    CONFIDENCE_LEVEL: float = 0.95

    # Holiday API (Nager.Date - free, no key required)
    HOLIDAY_API_URL: str = "https://date.nager.at/api/v3"
    HOLIDAY_COUNTRY: str = "ID"  # Indonesia

    # Anomaly Detection
    ANOMALY_CONTAMINATION: float = 0.05  # 5% expected anomaly rate
    ANOMALY_SUSPICIOUS_HOURS: list[int] = [0, 1, 2, 3, 4, 5]  # midnight-5am

    # EOQ / Inventory Optimization
    DEFAULT_HOLDING_COST_RATE: float = 0.20  # 20% of unit cost per year
    DEFAULT_ORDER_COST: float = 50000.0  # Rp 50,000 per order
    SERVICE_LEVEL: float = 0.95  # 95% service level for safety stock

    # Retraining schedule
    RETRAIN_CRON: str = "0 2 * * 0"  # Every Sunday at 2 AM

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure model directory exists
Path(settings.MODEL_PATH).mkdir(parents=True, exist_ok=True)
