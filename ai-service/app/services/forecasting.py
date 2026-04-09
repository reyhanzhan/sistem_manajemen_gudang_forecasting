# ══════════════════════════════════════════════════════════════════
# AI Demand Forecasting Service
# ══════════════════════════════════════════════════════════════════
# This module implements the core ML pipeline:
# 1. Feature Engineering from historical movement data
# 2. Model Training (multiple algorithms with auto-selection)
# 3. Demand Prediction with confidence intervals
# 4. Reorder Quantity Suggestion
# ══════════════════════════════════════════════════════════════════

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import settings
from app.services.data_repository import DataRepository

logger = logging.getLogger(__name__)


class ForecastingService:
    """
    AI Demand Forecasting Engine.

    Uses an ensemble approach:
    1. Feature engineering from time series data
    2. Trains multiple models (Linear Regression, Random Forest, Gradient Boosting)
    3. Selects best performer via time-series cross-validation
    4. Generates predictions with confidence intervals
    """

    _instance = None
    _model: Optional[Pipeline] = None
    _model_version: str = "untrained"
    _model_metrics: dict = {}

    def __new__(cls):
        """Singleton pattern — one model instance in memory."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ─── Feature Engineering ─────────────────────────────────

    @staticmethod
    def create_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate time-series features from daily demand data.

        Features:
        - Lag features (demand from previous days)
        - Rolling statistics (7-day, 14-day, 30-day moving averages)
        - Calendar features (day of week, month, quarter)
        - Trend features (days since start)
        """
        features = df.copy()

        # Ensure date is datetime
        features["date"] = pd.to_datetime(features["date"])
        features = features.sort_values("date").reset_index(drop=True)

        # ─── Lag Features ─────────────────────────────────
        for lag in [1, 3, 7, 14, 21, 28]:
            features[f"lag_{lag}"] = features["demand"].shift(lag)

        # ─── Rolling Statistics ───────────────────────────
        for window in [7, 14, 30]:
            features[f"rolling_mean_{window}"] = (
                features["demand"].rolling(window=window, min_periods=1).mean()
            )
            features[f"rolling_std_{window}"] = (
                features["demand"].rolling(window=window, min_periods=1).std().fillna(0)
            )
            features[f"rolling_max_{window}"] = (
                features["demand"].rolling(window=window, min_periods=1).max()
            )
            features[f"rolling_min_{window}"] = (
                features["demand"].rolling(window=window, min_periods=1).min()
            )

        # ─── Calendar Features ────────────────────────────
        features["day_of_week"] = features["date"].dt.dayofweek
        features["day_of_month"] = features["date"].dt.day
        features["month"] = features["date"].dt.month
        features["quarter"] = features["date"].dt.quarter
        features["is_weekend"] = (features["day_of_week"] >= 5).astype(int)
        features["is_month_start"] = features["date"].dt.is_month_start.astype(int)
        features["is_month_end"] = features["date"].dt.is_month_end.astype(int)
        features["week_of_year"] = features["date"].dt.isocalendar().week.astype(int)

        # ─── Trend Features ───────────────────────────────
        features["days_since_start"] = (
            features["date"] - features["date"].min()
        ).dt.days

        # ─── Exponential Moving Average ───────────────────
        features["ewm_7"] = features["demand"].ewm(span=7).mean()
        features["ewm_14"] = features["demand"].ewm(span=14).mean()

        # Drop rows with NaN from lag features
        features = features.dropna().reset_index(drop=True)

        return features

    @staticmethod
    def get_feature_columns() -> list[str]:
        """Return list of feature column names used for training."""
        lag_cols = [f"lag_{l}" for l in [1, 3, 7, 14, 21, 28]]
        rolling_cols = []
        for w in [7, 14, 30]:
            rolling_cols.extend([
                f"rolling_mean_{w}", f"rolling_std_{w}",
                f"rolling_max_{w}", f"rolling_min_{w}",
            ])
        calendar_cols = [
            "day_of_week", "day_of_month", "month", "quarter",
            "is_weekend", "is_month_start", "is_month_end", "week_of_year",
        ]
        trend_cols = ["days_since_start", "ewm_7", "ewm_14"]

        return lag_cols + rolling_cols + calendar_cols + trend_cols

    # ─── Model Training ──────────────────────────────────────

    def train(self, product_id: Optional[str] = None) -> dict:
        """
        Train forecasting models on historical data.

        If product_id is None, trains on aggregated data from all products.
        Uses TimeSeriesSplit for proper temporal cross-validation.
        """
        logger.info(f"Starting model training (product: {product_id or 'ALL'})...")

        # Fetch training data
        if product_id:
            daily_demand = DataRepository.get_daily_demand(product_id, days_back=365)
        else:
            # Aggregate demand across all products for a general model
            product_ids = DataRepository.get_all_active_product_ids()
            all_demands = []
            for pid in product_ids:
                demand = DataRepository.get_daily_demand(pid, days_back=365)
                if not demand.empty:
                    demand["product_id"] = pid
                    all_demands.append(demand)

            if not all_demands:
                return {"status": "failed", "error": "No training data available"}

            daily_demand = pd.concat(all_demands, ignore_index=True)
            daily_demand = daily_demand.groupby("date")["demand"].sum().reset_index()

        if len(daily_demand) < settings.MIN_TRAINING_SAMPLES:
            # Generate synthetic data for demo if insufficient real data
            logger.warning("Insufficient data, generating synthetic training data...")
            daily_demand = self._generate_synthetic_data()

        # Create features
        features_df = self.create_features(daily_demand)

        if features_df.empty:
            return {"status": "failed", "error": "Feature engineering produced no data"}

        feature_cols = self.get_feature_columns()
        X = features_df[feature_cols]
        y = features_df["demand"]

        # ─── Model Selection via Time-Series CV ──────────
        models = {
            "linear_regression": Pipeline([
                ("scaler", StandardScaler()),
                ("model", LinearRegression()),
            ]),
            "random_forest": Pipeline([
                ("model", RandomForestRegressor(
                    n_estimators=100, max_depth=10,
                    random_state=42, n_jobs=-1,
                )),
            ]),
            "gradient_boosting": Pipeline([
                ("model", GradientBoostingRegressor(
                    n_estimators=100, max_depth=5,
                    learning_rate=0.1, random_state=42,
                )),
            ]),
        }

        tscv = TimeSeriesSplit(n_splits=3)
        best_model_name = None
        best_score = float("inf")
        results = {}

        for name, model in models.items():
            scores = []
            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

                model.fit(X_train, y_train)
                preds = model.predict(X_val)
                mae = mean_absolute_error(y_val, preds)
                scores.append(mae)

            avg_mae = np.mean(scores)
            results[name] = {"avg_mae": round(avg_mae, 4)}
            logger.info(f"  {name}: avg MAE = {avg_mae:.4f}")

            if avg_mae < best_score:
                best_score = avg_mae
                best_model_name = name

        # ─── Train best model on full dataset ────────────
        best_pipeline = models[best_model_name]
        best_pipeline.fit(X, y)

        # Final metrics on full dataset
        full_preds = best_pipeline.predict(X)
        metrics = {
            "mae": round(mean_absolute_error(y, full_preds), 4),
            "rmse": round(np.sqrt(mean_squared_error(y, full_preds)), 4),
            "r2_score": round(r2_score(y, full_preds), 4),
            "best_model": best_model_name,
            "training_samples": len(X),
            "cv_results": results,
        }

        # ─── Save model ─────────────────────────────────
        ForecastingService._model = best_pipeline
        ForecastingService._model_version = f"v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        ForecastingService._model_metrics = metrics

        model_path = os.path.join(settings.MODEL_PATH, "demand_model.joblib")
        joblib.dump({
            "model": best_pipeline,
            "version": ForecastingService._model_version,
            "metrics": metrics,
            "feature_columns": feature_cols,
            "trained_at": datetime.utcnow().isoformat(),
        }, model_path)

        logger.info(f"✅ Model trained: {best_model_name} (MAE: {metrics['mae']})")

        return {
            "status": "success",
            "model": best_model_name,
            "version": ForecastingService._model_version,
            "metrics": metrics,
        }

    # ─── Prediction ──────────────────────────────────────────

    def predict(
        self,
        product_id: str,
        warehouse_id: Optional[str] = None,
        period_days: int = 30,
    ) -> dict:
        """
        Generate demand forecast for a product.

        Returns predicted demand, confidence interval, and reorder suggestion.
        """
        if not self.is_model_loaded():
            # Auto-train if no model exists
            logger.info("No model loaded, triggering auto-training...")
            train_result = self.train()
            if train_result.get("status") != "success":
                raise ValueError("Model training failed")

        # Fetch recent demand history for feature generation
        daily_demand = DataRepository.get_daily_demand(product_id, warehouse_id, days_back=365)

        if daily_demand.empty or len(daily_demand) < 7:
            # Fallback: use product average or synthetic data
            daily_demand = self._generate_synthetic_data(base_demand=10, days=90)

        features_df = self.create_features(daily_demand)

        if features_df.empty:
            raise ValueError("Could not generate features for prediction")

        feature_cols = self.get_feature_columns()

        # Predict for each day in the forecast period
        predictions = []
        current_features = features_df.copy()

        for day_offset in range(period_days):
            # Use the last row's features for next prediction
            last_row = current_features.iloc[-1:][feature_cols]
            pred = max(0, ForecastingService._model.predict(last_row)[0])
            predictions.append(pred)

            # Generate next day's features (shift lags forward)
            new_row = current_features.iloc[-1].copy()
            new_row["date"] = new_row["date"] + timedelta(days=1)
            new_row["demand"] = pred
            new_row["days_since_start"] += 1

            new_df = pd.DataFrame([new_row])
            current_features = pd.concat(
                [current_features, new_df], ignore_index=True
            )

        total_predicted = sum(predictions)
        daily_avg = total_predicted / period_days if period_days > 0 else 0

        # ─── Confidence Interval ─────────────────────────
        # Use residual-based confidence (simple but effective)
        historical_demand = daily_demand["demand"].values
        std_demand = float(np.std(historical_demand)) if len(historical_demand) > 1 else daily_avg * 0.2
        z_score = 1.96  # 95% confidence

        confidence_lower = max(0, total_predicted - z_score * std_demand * np.sqrt(period_days))
        confidence_upper = total_predicted + z_score * std_demand * np.sqrt(period_days)

        # ─── Reorder Suggestion ──────────────────────────
        product_info = DataRepository.get_product_info(product_id)
        current_stock = DataRepository.get_current_stock(product_id, warehouse_id)

        suggested_reorder = 0
        if product_info:
            # Suggested = predicted demand + safety stock - current stock
            safety_stock = product_info.get("min_stock_level", 0)
            expected_stock_after = current_stock - total_predicted
            if expected_stock_after < product_info.get("reorder_point", 0):
                suggested_reorder = max(
                    int(total_predicted + safety_stock - current_stock),
                    product_info.get("reorder_quantity", 0),
                )

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
            "model_version": ForecastingService._model_version,
            "model_metrics": ForecastingService._model_metrics,
        }

    # ─── Utility Methods ─────────────────────────────────────

    def load_model(self):
        """Load saved model from disk."""
        model_path = os.path.join(settings.MODEL_PATH, "demand_model.joblib")
        if os.path.exists(model_path):
            try:
                data = joblib.load(model_path)
                ForecastingService._model = data["model"]
                ForecastingService._model_version = data["version"]
                ForecastingService._model_metrics = data.get("metrics", {})
                logger.info(f"Model loaded: {data['version']}")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
        else:
            logger.info("No saved model found. Will train on first prediction request.")

    def is_model_loaded(self) -> bool:
        return ForecastingService._model is not None

    def get_model_version(self) -> str:
        return ForecastingService._model_version

    @staticmethod
    def _generate_synthetic_data(base_demand: int = 25, days: int = 180) -> pd.DataFrame:
        """
        Generate synthetic demand data for demo/training when real data is insufficient.

        Creates realistic patterns:
        - Weekly seasonality (lower on weekends)
        - Monthly trends
        - Random noise
        """
        np.random.seed(42)
        dates = pd.date_range(end=datetime.utcnow(), periods=days, freq="D")

        demand = []
        for i, date in enumerate(dates):
            # Base demand with slight upward trend
            base = base_demand + (i * 0.05)

            # Weekly seasonality (lower on weekends)
            day_of_week = date.dayofweek
            weekly_factor = 1.0 if day_of_week < 5 else 0.4

            # Monthly seasonality
            month_factor = 1.0 + 0.15 * np.sin(2 * np.pi * date.month / 12)

            # Random noise
            noise = np.random.normal(0, base_demand * 0.2)

            daily_demand = max(0, int(base * weekly_factor * month_factor + noise))
            demand.append(daily_demand)

        return pd.DataFrame({"date": dates, "demand": demand})
