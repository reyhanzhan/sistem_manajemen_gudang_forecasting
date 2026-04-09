# ══════════════════════════════════════════════════════════════════
# API Routes — Forecast, Anomaly Detection, Inventory Optimization
# ══════════════════════════════════════════════════════════════════

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.forecasting import ForecastingService
from app.services.prophet_forecasting import ProphetForecastingService
from app.services.anomaly_detection import AnomalyDetectionService
from app.services.inventory_optimization import InventoryOptimizationService

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Request / Response Schemas ──────────────────────────────

class PredictRequest(BaseModel):
    product_id: str = Field(..., description="Product UUID")
    warehouse_id: Optional[str] = Field(None, description="Optional warehouse UUID filter")
    period_days: int = Field(30, ge=1, le=365, description="Forecast period in days")
    use_prophet: bool = Field(True, description="Use Prophet multivariate model")


class PredictResponse(BaseModel):
    product_id: str
    warehouse_id: Optional[str]
    period_days: int
    predicted_demand: float
    daily_average: float
    daily_predictions: list[float]
    confidence_lower: float
    confidence_upper: float
    suggested_reorder: int
    current_stock: int
    model_version: str
    model_metrics: dict
    components: Optional[dict] = None


class TrainResponse(BaseModel):
    status: str
    model: Optional[str] = None
    version: Optional[str] = None
    metrics: Optional[dict] = None
    error: Optional[str] = None


class AnomalyRequest(BaseModel):
    days_back: int = Field(90, ge=7, le=365, description="Days of history to analyze")
    contamination: Optional[float] = Field(None, ge=0.01, le=0.5, description="Expected anomaly rate")


class AnomalyCheckRequest(BaseModel):
    movement_type: str
    quantity: int
    hour: int
    user_daily_count: int = 1
    unit_cost: float = 0


class PORequest(BaseModel):
    product_id: str
    warehouse_id: Optional[str] = None
    order_cost: Optional[float] = None
    holding_cost_rate: Optional[float] = None


# ─── Forecast Endpoints ─────────────────────────────────────

@router.post("/forecast/predict", response_model=PredictResponse)
async def predict_demand(request: PredictRequest):
    """
    Generate AI-powered demand forecast for a product.

    Supports two engines:
    - Prophet (multivariate with holidays, seasonality)
    - Sklearn (Gradient Boosting / Random Forest)
    """
    try:
        if request.use_prophet:
            service = ProphetForecastingService()
        else:
            service = ForecastingService()

        result = service.predict(
            product_id=request.product_id,
            warehouse_id=request.warehouse_id,
            period_days=request.period_days,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/forecast/train", response_model=TrainResponse)
async def train_model(product_id: Optional[str] = None, use_prophet: bool = True):
    """Train or retrain the forecasting model."""
    try:
        if use_prophet:
            service = ProphetForecastingService()
        else:
            service = ForecastingService()

        result = service.train(product_id=product_id)
        return result
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/forecast/model-info")
async def get_model_info():
    """Get current model information and metrics."""
    sklearn_svc = ForecastingService()
    prophet_svc = ProphetForecastingService()
    return {
        "sklearn": {
            "is_loaded": sklearn_svc.is_model_loaded(),
            "version": sklearn_svc.get_model_version(),
            "metrics": ForecastingService._model_metrics,
        },
        "prophet": {
            "is_loaded": prophet_svc.is_model_loaded(),
            "version": prophet_svc.get_model_version(),
            "metrics": ProphetForecastingService._model_metrics,
        },
    }


@router.get("/forecast/products")
async def get_forecastable_products():
    """List all active products available for forecasting."""
    from app.services.data_repository import DataRepository
    product_ids = DataRepository.get_all_active_product_ids()
    return {"count": len(product_ids), "product_ids": product_ids}


# ─── Anomaly Detection Endpoints ────────────────────────────

@router.post("/anomaly/detect")
async def detect_anomalies(request: AnomalyRequest):
    """
    Detect anomalous inventory movements using Isolation Forest.

    Analyzes transaction patterns for:
    - Suspicious hours (midnight-5am)
    - Unusual quantities
    - High-frequency user activity
    - Weekend anomalies
    """
    try:
        service = AnomalyDetectionService()
        result = service.detect_anomalies(
            days_back=request.days_back,
            contamination=request.contamination,
        )
        return result
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


@router.post("/anomaly/check")
async def check_transaction(request: AnomalyCheckRequest):
    """Real-time anomaly check for a single transaction."""
    try:
        service = AnomalyDetectionService()
        result = service.check_single_transaction(
            movement_type=request.movement_type,
            quantity=request.quantity,
            hour=request.hour,
            user_daily_count=request.user_daily_count,
            unit_cost=request.unit_cost,
        )
        return result
    except Exception as e:
        logger.error(f"Transaction check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Inventory Optimization / Auto-PO Endpoints ─────────────

@router.post("/optimization/purchase-order")
async def generate_purchase_order(request: PORequest):
    """
    Generate optimized purchase order using EOQ model.

    Calculates:
    - Economic Order Quantity (EOQ)
    - Safety Stock with service level
    - Reorder Point
    - Stockout Risk Assessment
    - Total Cost Analysis per supplier
    """
    try:
        service = InventoryOptimizationService()
        result = service.generate_purchase_order(
            product_id=request.product_id,
            warehouse_id=request.warehouse_id,
            order_cost=request.order_cost,
            holding_cost_rate=request.holding_cost_rate,
        )
        return result
    except Exception as e:
        logger.error(f"PO generation error: {e}")
        raise HTTPException(status_code=500, detail=f"PO generation failed: {str(e)}")


@router.post("/optimization/bulk-po")
async def generate_bulk_po(warehouse_id: Optional[str] = None):
    """Generate PO recommendations for all products needing reorder."""
    try:
        service = InventoryOptimizationService()
        result = service.generate_bulk_po(warehouse_id=warehouse_id)
        return result
    except Exception as e:
        logger.error(f"Bulk PO error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
