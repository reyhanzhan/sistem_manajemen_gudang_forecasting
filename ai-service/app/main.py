# ══════════════════════════════════════════════════════════════════
# AI Demand Forecasting Microservice
# Python + FastAPI + Prophet + scikit-learn
# Features: Multivariate Forecasting, Anomaly Detection, EOQ
# ══════════════════════════════════════════════════════════════════

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.api.routes import router as api_router
from app.database import engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Background scheduler for automated retraining
scheduler = BackgroundScheduler()


def scheduled_retrain():
    """Background task: retrain models weekly."""
    from app.services.retrain_pipeline import retrain_all_models
    logger.info("Scheduled model retraining triggered...")
    retrain_all_models()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("🚀 AI Forecasting Service starting up...")
    logger.info(f"📊 Model storage path: {settings.MODEL_PATH}")

    # Initialize sklearn model on startup if exists
    from app.services.forecasting import ForecastingService
    forecasting_service = ForecastingService()
    forecasting_service.load_model()

    # Initialize Prophet model on startup if exists
    from app.services.prophet_forecasting import ProphetForecastingService
    prophet_service = ProphetForecastingService()
    prophet_service.load_model()

    # Schedule weekly retraining (every Sunday at 2 AM)
    scheduler.add_job(scheduled_retrain, "cron", day_of_week="sun", hour=2, minute=0)
    scheduler.start()
    logger.info("📅 Automated retraining scheduled (every Sunday 2:00 AM)")

    yield

    scheduler.shutdown()
    logger.info("🛑 AI Forecasting Service shutting down...")


app = FastAPI(
    title="WMS AI Forecasting Service",
    description="AI-powered demand forecasting, anomaly detection, and inventory optimization",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from app.services.forecasting import ForecastingService
    from app.services.prophet_forecasting import ProphetForecastingService
    sklearn_svc = ForecastingService()
    prophet_svc = ProphetForecastingService()
    return {
        "status": "healthy",
        "service": "ai-forecasting",
        "version": "2.0.0",
        "models": {
            "sklearn": {
                "loaded": sklearn_svc.is_model_loaded(),
                "version": sklearn_svc.get_model_version(),
            },
            "prophet": {
                "loaded": prophet_svc.is_model_loaded(),
                "version": prophet_svc.get_model_version(),
            },
        },
        "features": [
            "multivariate_forecasting",
            "anomaly_detection",
            "inventory_optimization",
            "auto_po_generation",
            "automated_retraining",
        ],
    }


@app.get("/")
async def root():
    return {
        "message": "WMS AI Forecasting Service v2.0",
        "docs": "/docs",
        "endpoints": {
            "forecast": "/api/v1/forecast/predict",
            "anomaly_detection": "/api/v1/anomaly/detect",
            "purchase_order": "/api/v1/optimization/purchase-order",
            "retraining": "/api/v1/forecast/train",
        },
    }
