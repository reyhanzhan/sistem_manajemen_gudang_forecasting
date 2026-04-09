# ══════════════════════════════════════════════════════════════════
# Anomaly Detection Service
# Uses Isolation Forest (scikit-learn) to detect suspicious
# transactions in the audit trail and movement history.
# ══════════════════════════════════════════════════════════════════

import logging
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.config import settings
from app.database import SessionLocal
from sqlalchemy import text

logger = logging.getLogger(__name__)


class AnomalyDetectionService:
    """
    Detects anomalous inventory movements using Isolation Forest.

    Features analyzed:
    - Transaction hour (unusual hours = suspicious)
    - Quantity (unusually large or small)
    - Frequency (too many transactions in short period)
    - Day of week (weekend activity)
    - Deviation from product average quantity
    """

    _instance = None
    _model: Optional[IsolationForest] = None
    _scaler: Optional[StandardScaler] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @staticmethod
    def get_movement_data(days_back: int = 90) -> pd.DataFrame:
        """Fetch completed movement data with timestamps."""
        db = SessionLocal()
        try:
            query = text("""
                SELECT
                    im.id as movement_id,
                    im.reference_number,
                    im.type as movement_type,
                    im.status,
                    im.created_at,
                    im.source_warehouse_id,
                    im.destination_warehouse_id,
                    im.created_by_id as user_id,
                    u.first_name || ' ' || u.last_name as user_name,
                    ml.product_id,
                    p.sku as product_sku,
                    p.name as product_name,
                    ml.quantity,
                    ml.unit_cost
                FROM inventory_movements im
                JOIN movement_lines ml ON ml.movement_id = im.id
                JOIN users u ON u.id = im.created_by_id
                JOIN products p ON p.id = ml.product_id
                WHERE im.created_at >= :cutoff_date
                ORDER BY im.created_at DESC
            """)

            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            result = db.execute(query, {"cutoff_date": cutoff_date})
            rows = result.fetchall()

            if not rows:
                return pd.DataFrame()

            df = pd.DataFrame(rows, columns=[
                "movement_id", "reference_number", "movement_type", "status",
                "created_at", "source_warehouse_id", "destination_warehouse_id",
                "user_id", "user_name", "product_id", "product_sku",
                "product_name", "quantity", "unit_cost",
            ])

            df["created_at"] = pd.to_datetime(df["created_at"])
            return df

        except Exception as e:
            logger.error(f"Error fetching movement data: {e}")
            return pd.DataFrame()
        finally:
            db.close()

    @staticmethod
    def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
        """Create features for anomaly detection."""
        features = df.copy()

        # Time-based features
        features["hour"] = features["created_at"].dt.hour
        features["day_of_week"] = features["created_at"].dt.dayofweek
        features["is_weekend"] = (features["day_of_week"] >= 5).astype(int)
        features["is_suspicious_hour"] = features["hour"].isin(
            settings.ANOMALY_SUSPICIOUS_HOURS
        ).astype(int)

        # Quantity features
        product_avg = features.groupby("product_id")["quantity"].transform("mean")
        product_std = features.groupby("product_id")["quantity"].transform("std").fillna(1)
        features["quantity_zscore"] = (features["quantity"] - product_avg) / product_std

        # User activity frequency (transactions per user in rolling 24h)
        features = features.sort_values("created_at")
        features["user_daily_count"] = features.groupby(
            [features["user_id"], features["created_at"].dt.date]
        ).cumcount() + 1

        # Value features
        features["total_value"] = features["quantity"] * features["unit_cost"].fillna(0)

        # Type encoding
        type_map = {"STOCK_IN": 0, "STOCK_OUT": 1, "TRANSFER": 2, "ADJUSTMENT": 3}
        features["type_encoded"] = features["movement_type"].map(type_map).fillna(3)

        return features

    def detect_anomalies(
        self,
        days_back: int = 90,
        contamination: Optional[float] = None,
    ) -> dict:
        """
        Run anomaly detection on recent movement data.

        Returns list of anomalous transactions with risk scores.
        """
        df = self.get_movement_data(days_back)

        if df.empty:
            return {
                "status": "no_data",
                "message": "No movement data available for analysis",
                "anomalies": [],
                "summary": {},
            }

        features_df = self.engineer_features(df)

        # Select features for model
        feature_cols = [
            "hour", "day_of_week", "is_weekend", "is_suspicious_hour",
            "quantity", "quantity_zscore", "user_daily_count",
            "total_value", "type_encoded",
        ]

        X = features_df[feature_cols].fillna(0)

        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Train Isolation Forest
        contamination_rate = contamination or settings.ANOMALY_CONTAMINATION
        model = IsolationForest(
            n_estimators=200,
            contamination=contamination_rate,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_scaled)

        # Predict anomalies (-1 = anomaly, 1 = normal)
        predictions = model.predict(X_scaled)
        anomaly_scores = model.decision_function(X_scaled)

        features_df["is_anomaly"] = predictions == -1
        features_df["anomaly_score"] = anomaly_scores
        features_df["risk_level"] = pd.cut(
            anomaly_scores,
            bins=[-np.inf, -0.3, -0.1, np.inf],
            labels=["HIGH", "MEDIUM", "LOW"],
        )

        # Save model
        AnomalyDetectionService._model = model
        AnomalyDetectionService._scaler = scaler

        # Extract anomalies
        anomalies = features_df[features_df["is_anomaly"]].copy()

        anomaly_list = []
        for _, row in anomalies.iterrows():
            reasons = []
            if row["is_suspicious_hour"]:
                reasons.append(f"Unusual hour ({int(row['hour'])}:00)")
            if abs(row["quantity_zscore"]) > 2:
                reasons.append(f"Unusual quantity (z-score: {row['quantity_zscore']:.1f})")
            if row["is_weekend"]:
                reasons.append("Weekend activity")
            if row["user_daily_count"] > 10:
                reasons.append(f"High activity ({int(row['user_daily_count'])} transactions/day)")
            if not reasons:
                reasons.append("Statistical outlier")

            anomaly_list.append({
                "movement_id": row["movement_id"],
                "reference_number": row["reference_number"],
                "movement_type": row["movement_type"],
                "user_id": row["user_id"],
                "user_name": row["user_name"],
                "product_sku": row["product_sku"],
                "product_name": row["product_name"],
                "quantity": int(row["quantity"]),
                "created_at": row["created_at"].isoformat(),
                "hour": int(row["hour"]),
                "anomaly_score": round(float(row["anomaly_score"]), 4),
                "risk_level": row["risk_level"],
                "reasons": reasons,
            })

        # Sort by anomaly score (most anomalous first)
        anomaly_list.sort(key=lambda x: x["anomaly_score"])

        # Summary statistics
        summary = {
            "total_transactions": len(df),
            "anomalies_detected": len(anomaly_list),
            "anomaly_rate": round(len(anomaly_list) / len(df) * 100, 2) if len(df) > 0 else 0,
            "high_risk": len([a for a in anomaly_list if a["risk_level"] == "HIGH"]),
            "medium_risk": len([a for a in anomaly_list if a["risk_level"] == "MEDIUM"]),
            "suspicious_hour_anomalies": len([a for a in anomaly_list if any("Unusual hour" in r for r in a["reasons"])]),
            "unusual_quantity_anomalies": len([a for a in anomaly_list if any("Unusual quantity" in r for r in a["reasons"])]),
            "analysis_period_days": days_back,
        }

        return {
            "status": "success",
            "anomalies": anomaly_list,
            "summary": summary,
        }

    def check_single_transaction(
        self,
        movement_type: str,
        quantity: int,
        hour: int,
        user_daily_count: int = 1,
        unit_cost: float = 0,
    ) -> dict:
        """
        Check if a single transaction looks anomalous (real-time check).
        Uses the last trained model.
        """
        if AnomalyDetectionService._model is None:
            return {"is_anomaly": False, "message": "No model trained yet"}

        day_of_week = datetime.utcnow().weekday()
        is_weekend = 1 if day_of_week >= 5 else 0
        is_suspicious_hour = 1 if hour in settings.ANOMALY_SUSPICIOUS_HOURS else 0
        type_map = {"STOCK_IN": 0, "STOCK_OUT": 1, "TRANSFER": 2, "ADJUSTMENT": 3}

        features = np.array([[
            hour, day_of_week, is_weekend, is_suspicious_hour,
            quantity, 0,  # quantity_zscore (unknown without context)
            user_daily_count, quantity * unit_cost, type_map.get(movement_type, 3),
        ]])

        features_scaled = AnomalyDetectionService._scaler.transform(features)
        prediction = AnomalyDetectionService._model.predict(features_scaled)
        score = AnomalyDetectionService._model.decision_function(features_scaled)

        return {
            "is_anomaly": bool(prediction[0] == -1),
            "anomaly_score": round(float(score[0]), 4),
            "risk_level": "HIGH" if score[0] < -0.3 else "MEDIUM" if score[0] < -0.1 else "LOW",
        }
