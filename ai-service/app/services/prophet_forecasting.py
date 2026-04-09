# ══════════════════════════════════════════════════════════════════
# Multivariate Prophet Forecasting Service
# Uses Facebook Prophet with external regressors:
# - National holidays (auto-integrated)
# - Day-of-week / seasonality patterns
# - Custom regressors (holiday proximity, trend)
# ══════════════════════════════════════════════════════════════════

import logging
import os
from datetime import datetime, timedelta
from typing import Optional

import joblib
import numpy as np
import pandas as pd

from app.config import settings
from app.services.data_repository import DataRepository
from app.services.holiday_service import get_holiday_dataframe, add_holiday_features

logger = logging.getLogger(__name__)


class ProphetForecastingService:
    """
    Multivariate forecasting using Facebook Prophet.

    Integrates:
    - Automatic holiday detection (Indonesian public holidays)
    - Multiple seasonality (weekly, monthly, yearly)
    - External regressors (holiday proximity, trend)
    - Uncertainty intervals
    """

    _instance = None
    _model = None
    _model_version: str = "untrained"
    _model_metrics: dict = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def train(self, product_id: Optional[str] = None) -> dict:
        """Train Prophet model on historical demand data."""
        logger.info(f"Training Prophet model (product: {product_id or 'ALL'})...")

        try:
            from prophet import Prophet
        except ImportError:
            logger.error("Prophet not installed, falling back to sklearn")
            return {"status": "failed", "error": "Prophet not installed"}

        # Fetch training data
        if product_id:
            daily_demand = DataRepository.get_daily_demand(product_id, days_back=365)
        else:
            product_ids = DataRepository.get_all_active_product_ids()
            all_demands = []
            for pid in product_ids:
                demand = DataRepository.get_daily_demand(pid, days_back=365)
                if not demand.empty:
                    all_demands.append(demand)

            if not all_demands:
                return {"status": "failed", "error": "No training data available"}

            daily_demand = pd.concat(all_demands, ignore_index=True)
            daily_demand = daily_demand.groupby("date")["demand"].sum().reset_index()

        if len(daily_demand) < settings.MIN_TRAINING_SAMPLES:
            logger.warning("Insufficient data, generating synthetic training data...")
            daily_demand = self._generate_synthetic_data()

        # Prepare Prophet format: ds (date) and y (value)
        prophet_df = daily_demand.rename(columns={"date": "ds", "demand": "y"})
        prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])

        # Add external regressors
        prophet_df = add_holiday_features(prophet_df, date_col="ds")

        # Fetch holidays for Prophet
        min_date = prophet_df["ds"].min()
        max_date = prophet_df["ds"].max() + timedelta(days=90)
        holidays_df = get_holiday_dataframe(min_date, max_date)

        # Build Prophet model with multivariate features
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            holidays=holidays_df if not holidays_df.empty else None,
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10.0,
            interval_width=settings.CONFIDENCE_LEVEL,
        )

        # Add custom regressors
        model.add_regressor("is_holiday")
        model.add_regressor("days_to_holiday")
        model.add_regressor("days_after_holiday")

        # Add monthly seasonality
        model.add_seasonality(name="monthly", period=30.5, fourier_order=5)

        # Train
        model.fit(prophet_df[["ds", "y", "is_holiday", "days_to_holiday", "days_after_holiday"]])

        # Cross-validation metrics
        try:
            from prophet.diagnostics import cross_validation, performance_metrics
            cv_results = cross_validation(
                model,
                initial="90 days",
                period="30 days",
                horizon="30 days",
            )
            metrics_df = performance_metrics(cv_results)
            metrics = {
                "mae": round(float(metrics_df["mae"].mean()), 4),
                "rmse": round(float(metrics_df["rmse"].mean()), 4),
                "mape": round(float(metrics_df["mape"].mean()) * 100, 2),
                "best_model": "prophet_multivariate",
                "training_samples": len(prophet_df),
                "features": ["holidays_id", "weekly_seasonality", "monthly_seasonality", "yearly_seasonality"],
            }
        except Exception as e:
            logger.warning(f"Cross-validation failed: {e}")
            metrics = {
                "mae": 0,
                "rmse": 0,
                "best_model": "prophet_multivariate",
                "training_samples": len(prophet_df),
                "features": ["holidays_id", "weekly_seasonality", "monthly_seasonality"],
            }

        # Save model
        ProphetForecastingService._model = model
        ProphetForecastingService._model_version = f"prophet-v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        ProphetForecastingService._model_metrics = metrics

        model_path = os.path.join(settings.MODEL_PATH, "prophet_model.joblib")
        joblib.dump({
            "model": model,
            "version": ProphetForecastingService._model_version,
            "metrics": metrics,
            "trained_at": datetime.utcnow().isoformat(),
        }, model_path)

        logger.info(f"Prophet model trained: MAE={metrics.get('mae', 'N/A')}")

        return {
            "status": "success",
            "model": "prophet_multivariate",
            "version": ProphetForecastingService._model_version,
            "metrics": metrics,
        }

    def predict(
        self,
        product_id: str,
        warehouse_id: Optional[str] = None,
        period_days: int = 30,
    ) -> dict:
        """Generate multivariate forecast using Prophet."""
        if not self.is_model_loaded():
            logger.info("No Prophet model loaded, training...")
            train_result = self.train()
            if train_result.get("status") != "success":
                raise ValueError("Prophet model training failed")

        model = ProphetForecastingService._model

        # Create future dataframe
        future = model.make_future_dataframe(periods=period_days)
        future = add_holiday_features(future, date_col="ds")

        # Predict
        forecast = model.predict(future)

        # Extract forecast period
        forecast_period = forecast.tail(period_days)
        predictions = forecast_period["yhat"].clip(lower=0).tolist()
        total_predicted = sum(predictions)
        daily_avg = total_predicted / period_days if period_days > 0 else 0

        confidence_lower = max(0, float(forecast_period["yhat_lower"].sum()))
        confidence_upper = float(forecast_period["yhat_upper"].sum())

        # Reorder suggestion
        product_info = DataRepository.get_product_info(product_id)
        current_stock = DataRepository.get_current_stock(product_id, warehouse_id)

        suggested_reorder = 0
        if product_info:
            safety_stock = product_info.get("min_stock_level", 0)
            expected_stock_after = current_stock - total_predicted
            if expected_stock_after < product_info.get("reorder_point", 0):
                suggested_reorder = max(
                    int(total_predicted + safety_stock - current_stock),
                    product_info.get("reorder_quantity", 0),
                )

        # Seasonality components
        components = {}
        try:
            comp_df = forecast_period[["ds", "trend", "weekly", "yearly"]].copy()
            components = {
                "trend": comp_df["trend"].tolist(),
                "weekly": comp_df["weekly"].tolist(),
                "yearly": comp_df["yearly"].tolist(),
            }
            if "holidays" in forecast_period.columns:
                components["holidays"] = forecast_period["holidays"].tolist()
        except Exception:
            pass

        return {
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "period_days": period_days,
            "predicted_demand": round(total_predicted, 2),
            "daily_average": round(daily_avg, 2),
            "daily_predictions": [round(p, 2) for p in predictions],
            "confidence_lower": round(confidence_lower, 2),
            "confidence_upper": round(confidence_upper, 2),
            "suggested_reorder": suggested_reorder,
            "current_stock": current_stock,
            "model_version": ProphetForecastingService._model_version,
            "model_metrics": ProphetForecastingService._model_metrics,
            "components": components,
        }

    def load_model(self):
        """Load saved Prophet model from disk."""
        model_path = os.path.join(settings.MODEL_PATH, "prophet_model.joblib")
        if os.path.exists(model_path):
            try:
                data = joblib.load(model_path)
                ProphetForecastingService._model = data["model"]
                ProphetForecastingService._model_version = data["version"]
                ProphetForecastingService._model_metrics = data.get("metrics", {})
                logger.info(f"Prophet model loaded: {data['version']}")
            except Exception as e:
                logger.error(f"Failed to load Prophet model: {e}")

    def is_model_loaded(self) -> bool:
        return ProphetForecastingService._model is not None

    def get_model_version(self) -> str:
        return ProphetForecastingService._model_version

    @staticmethod
    def _generate_synthetic_data(base_demand: int = 25, days: int = 365) -> pd.DataFrame:
        """Generate synthetic demand data with holiday effects."""
        np.random.seed(42)
        dates = pd.date_range(end=datetime.utcnow(), periods=days, freq="D")

        demand = []
        for i, date in enumerate(dates):
            base = base_demand + (i * 0.03)
            day_of_week = date.dayofweek
            weekly_factor = 1.0 if day_of_week < 5 else 0.4
            month_factor = 1.0 + 0.2 * np.sin(2 * np.pi * date.month / 12)
            # Holiday spike effect (around major holidays)
            holiday_factor = 1.5 if date.month == 12 and date.day > 20 else 1.0
            holiday_factor = 1.8 if date.month == 1 and date.day < 5 else holiday_factor
            noise = np.random.normal(0, base_demand * 0.15)
            daily_demand = max(0, int(base * weekly_factor * month_factor * holiday_factor + noise))
            demand.append(daily_demand)

        return pd.DataFrame({"date": dates, "demand": demand})
