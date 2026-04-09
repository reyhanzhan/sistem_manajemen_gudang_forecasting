# ══════════════════════════════════════════════════════════════════
# Data Repository — Reads historical data from PostgreSQL
# ══════════════════════════════════════════════════════════════════

import logging
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal

logger = logging.getLogger(__name__)


class DataRepository:
    """Handles all database reads for the AI service."""

    @staticmethod
    def get_movement_history(
        product_id: str,
        warehouse_id: Optional[str] = None,
        days_back: int = 365,
    ) -> pd.DataFrame:
        """
        Fetch historical inventory movement data for a product.

        Returns a DataFrame with columns:
        - date: movement date
        - movement_type: STOCK_IN, STOCK_OUT, TRANSFER
        - quantity: number of units moved
        - warehouse_id: warehouse involved
        """
        db: Session = SessionLocal()
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)

            query = text("""
                SELECT
                    DATE(im.created_at) as date,
                    im.type as movement_type,
                    ml.quantity,
                    im.source_warehouse_id,
                    im.destination_warehouse_id,
                    ml.product_id
                FROM inventory_movements im
                JOIN movement_lines ml ON ml.movement_id = im.id
                WHERE ml.product_id = :product_id
                  AND im.status = 'COMPLETED'
                  AND im.created_at >= :cutoff_date
                ORDER BY im.created_at ASC
            """)

            params = {"product_id": product_id, "cutoff_date": cutoff_date}

            result = db.execute(query, params)
            rows = result.fetchall()

            if not rows:
                logger.warning(f"No movement history found for product {product_id}")
                return pd.DataFrame()

            df = pd.DataFrame(rows, columns=[
                "date", "movement_type", "quantity",
                "source_warehouse_id", "destination_warehouse_id", "product_id"
            ])

            # Filter by warehouse if specified
            if warehouse_id:
                df = df[
                    (df["source_warehouse_id"] == warehouse_id) |
                    (df["destination_warehouse_id"] == warehouse_id)
                ]

            df["date"] = pd.to_datetime(df["date"])
            return df

        except Exception as e:
            logger.error(f"Error fetching movement history: {e}")
            return pd.DataFrame()
        finally:
            db.close()

    @staticmethod
    def get_daily_demand(
        product_id: str,
        warehouse_id: Optional[str] = None,
        days_back: int = 365,
    ) -> pd.DataFrame:
        """
        Aggregate daily demand (STOCK_OUT quantities) for a product.

        Returns a DataFrame with:
        - date: calendar date
        - demand: total units going out (STOCK_OUT + TRANSFER out)
        """
        df = DataRepository.get_movement_history(product_id, warehouse_id, days_back)

        if df.empty:
            return pd.DataFrame(columns=["date", "demand"])

        # Demand = STOCK_OUT + outgoing TRANSFER
        demand_df = df[df["movement_type"].isin(["STOCK_OUT", "TRANSFER"])]

        if demand_df.empty:
            return pd.DataFrame(columns=["date", "demand"])

        daily = demand_df.groupby("date")["quantity"].sum().reset_index()
        daily.columns = ["date", "demand"]

        # Fill missing dates with 0 demand
        date_range = pd.date_range(
            start=daily["date"].min(),
            end=datetime.utcnow(),
            freq="D",
        )
        full_dates = pd.DataFrame({"date": date_range})
        daily = full_dates.merge(daily, on="date", how="left").fillna(0)
        daily["demand"] = daily["demand"].astype(int)

        return daily

    @staticmethod
    def get_product_info(product_id: str) -> Optional[dict]:
        """Get product details including reorder config."""
        db: Session = SessionLocal()
        try:
            query = text("""
                SELECT id, sku, name, min_stock_level, reorder_point, reorder_quantity
                FROM products
                WHERE id = :product_id
            """)
            result = db.execute(query, {"product_id": product_id}).fetchone()
            if result:
                return {
                    "id": result[0],
                    "sku": result[1],
                    "name": result[2],
                    "min_stock_level": result[3],
                    "reorder_point": result[4],
                    "reorder_quantity": result[5],
                }
            return None
        finally:
            db.close()

    @staticmethod
    def get_current_stock(product_id: str, warehouse_id: Optional[str] = None) -> int:
        """Get current stock level for a product."""
        db: Session = SessionLocal()
        try:
            if warehouse_id:
                query = text("""
                    SELECT COALESCE(SUM(quantity), 0)
                    FROM inventory
                    WHERE product_id = :product_id AND warehouse_id = :warehouse_id
                """)
                result = db.execute(query, {"product_id": product_id, "warehouse_id": warehouse_id}).scalar()
            else:
                query = text("""
                    SELECT COALESCE(SUM(quantity), 0)
                    FROM inventory
                    WHERE product_id = :product_id
                """)
                result = db.execute(query, {"product_id": product_id}).scalar()
            return int(result or 0)
        finally:
            db.close()

    @staticmethod
    def get_all_active_product_ids() -> list[str]:
        """Get all active product IDs for bulk forecasting."""
        db: Session = SessionLocal()
        try:
            query = text("SELECT id FROM products WHERE status = 'ACTIVE'")
            result = db.execute(query).fetchall()
            return [row[0] for row in result]
        finally:
            db.close()
