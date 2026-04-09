# ══════════════════════════════════════════════════════════════════
# Inventory Optimization Service — Prescriptive AI
# Auto-PO Generator using Economic Order Quantity (EOQ)
#
# Calculates:
# - EOQ (Economic Order Quantity)
# - ROP (Reorder Point) with Safety Stock
# - Total Cost Optimization
# - Lead Time Analysis
# - Stockout Risk Assessment
# ══════════════════════════════════════════════════════════════════

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from scipy import stats
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal
from app.services.data_repository import DataRepository

logger = logging.getLogger(__name__)


class InventoryOptimizationService:
    """
    Prescriptive AI for inventory optimization.

    Implements:
    1. EOQ (Economic Order Quantity) - Wilson's formula
    2. Safety Stock calculation with service level
    3. Reorder Point (ROP) with lead time
    4. Total Cost of Ownership
    5. Auto-PO generation with supplier selection
    """

    @staticmethod
    def get_supplier_data(product_id: str) -> list[dict]:
        """Get supplier info for a product including lead time and cost."""
        db = SessionLocal()
        try:
            query = text("""
                SELECT
                    s.id as supplier_id,
                    s.name as supplier_name,
                    s.lead_time_days,
                    s.rating,
                    ps.unit_cost,
                    ps.min_order_qty,
                    ps.is_primary
                FROM product_suppliers ps
                JOIN suppliers s ON s.id = ps.supplier_id
                WHERE ps.product_id = :product_id
                  AND s.is_active = true
                ORDER BY ps.is_primary DESC, ps.unit_cost ASC
            """)
            result = db.execute(query, {"product_id": product_id}).fetchall()
            return [
                {
                    "supplier_id": r[0],
                    "supplier_name": r[1],
                    "lead_time_days": r[2],
                    "rating": float(r[3]) if r[3] else 3.0,
                    "unit_cost": float(r[4]),
                    "min_order_qty": r[5],
                    "is_primary": r[6],
                }
                for r in result
            ]
        except Exception as e:
            logger.error(f"Error fetching supplier data: {e}")
            return []
        finally:
            db.close()

    @staticmethod
    def calculate_demand_stats(product_id: str, warehouse_id: Optional[str] = None) -> dict:
        """Calculate demand statistics from historical data."""
        daily_demand = DataRepository.get_daily_demand(product_id, warehouse_id, days_back=365)

        if daily_demand.empty or len(daily_demand) < 14:
            # Fallback estimates
            return {
                "daily_avg": 10.0,
                "daily_std": 3.0,
                "weekly_avg": 70.0,
                "monthly_avg": 300.0,
                "annual_demand": 3650.0,
                "demand_variability": 0.3,
                "data_points": 0,
            }

        demand = daily_demand["demand"].astype(float)

        daily_avg = float(demand.mean())
        daily_std = float(demand.std()) if len(demand) > 1 else daily_avg * 0.2

        return {
            "daily_avg": round(daily_avg, 2),
            "daily_std": round(daily_std, 2),
            "weekly_avg": round(daily_avg * 7, 2),
            "monthly_avg": round(daily_avg * 30, 2),
            "annual_demand": round(daily_avg * 365, 2),
            "demand_variability": round(daily_std / daily_avg if daily_avg > 0 else 0, 4),
            "data_points": len(demand),
        }

    @staticmethod
    def calculate_eoq(
        annual_demand: float,
        order_cost: float,
        holding_cost_per_unit: float,
    ) -> float:
        """
        Calculate Economic Order Quantity using Wilson's formula.
        EOQ = sqrt((2 * D * S) / H)
        D = Annual demand
        S = Order/setup cost per order
        H = Holding cost per unit per year
        """
        if annual_demand <= 0 or order_cost <= 0 or holding_cost_per_unit <= 0:
            return 0

        eoq = math.sqrt((2 * annual_demand * order_cost) / holding_cost_per_unit)
        return round(eoq)

    @staticmethod
    def calculate_safety_stock(
        daily_std: float,
        lead_time_days: int,
        service_level: float = 0.95,
    ) -> int:
        """
        Calculate safety stock for desired service level.
        SS = Z * σ_d * √(LT)
        Z = Z-score for service level
        σ_d = Standard deviation of daily demand
        LT = Lead time in days
        """
        z_score = stats.norm.ppf(service_level)
        safety_stock = z_score * daily_std * math.sqrt(lead_time_days)
        return max(0, round(safety_stock))

    @staticmethod
    def calculate_reorder_point(
        daily_avg: float,
        lead_time_days: int,
        safety_stock: int,
    ) -> int:
        """
        Calculate Reorder Point.
        ROP = (d * LT) + SS
        d = Average daily demand
        LT = Lead time in days
        SS = Safety stock
        """
        rop = (daily_avg * lead_time_days) + safety_stock
        return max(0, round(rop))

    @staticmethod
    def calculate_stockout_risk(
        current_stock: int,
        daily_avg: float,
        daily_std: float,
        lead_time_days: int,
    ) -> dict:
        """Calculate stockout probability during lead time."""
        if daily_avg <= 0:
            return {"risk_percent": 0, "days_of_stock": float("inf"), "urgency": "LOW"}

        # Days of stock remaining
        days_of_stock = current_stock / daily_avg if daily_avg > 0 else float("inf")

        # Demand during lead time
        demand_during_lt = daily_avg * lead_time_days
        std_during_lt = daily_std * math.sqrt(lead_time_days)

        # Probability that demand during LT exceeds current stock
        if std_during_lt > 0:
            z = (current_stock - demand_during_lt) / std_during_lt
            stockout_prob = 1 - stats.norm.cdf(z)
        else:
            stockout_prob = 0 if current_stock >= demand_during_lt else 1

        stockout_percent = round(stockout_prob * 100, 2)

        # Urgency level
        if stockout_percent > 50 or days_of_stock < lead_time_days:
            urgency = "CRITICAL"
        elif stockout_percent > 20 or days_of_stock < lead_time_days * 1.5:
            urgency = "HIGH"
        elif stockout_percent > 5 or days_of_stock < lead_time_days * 2:
            urgency = "MEDIUM"
        else:
            urgency = "LOW"

        return {
            "risk_percent": stockout_percent,
            "days_of_stock": round(days_of_stock, 1),
            "demand_during_leadtime": round(demand_during_lt, 1),
            "urgency": urgency,
        }

    def generate_purchase_order(
        self,
        product_id: str,
        warehouse_id: Optional[str] = None,
        order_cost: Optional[float] = None,
        holding_cost_rate: Optional[float] = None,
    ) -> dict:
        """
        Generate optimized purchase order recommendation.

        Returns EOQ, optimal supplier, cost analysis, and risk assessment.
        """
        # Get product info
        product_info = DataRepository.get_product_info(product_id)
        if not product_info:
            return {"status": "error", "message": "Product not found"}

        # Get demand statistics
        demand_stats = self.calculate_demand_stats(product_id, warehouse_id)

        # Get supplier data
        suppliers = self.get_supplier_data(product_id)
        if not suppliers:
            suppliers = [{
                "supplier_id": None,
                "supplier_name": "Default Supplier",
                "lead_time_days": 7,
                "rating": 3.0,
                "unit_cost": float(product_info.get("unit_price", 10000)),
                "min_order_qty": 1,
                "is_primary": True,
            }]

        # Current stock
        current_stock = DataRepository.get_current_stock(product_id, warehouse_id)

        # Calculate for each supplier
        supplier_options = []
        for supplier in suppliers:
            unit_cost = supplier["unit_cost"]
            lead_time = supplier["lead_time_days"]
            _order_cost = order_cost or settings.DEFAULT_ORDER_COST
            _holding_rate = holding_cost_rate or settings.DEFAULT_HOLDING_COST_RATE
            holding_cost_per_unit = unit_cost * _holding_rate

            # EOQ
            eoq = self.calculate_eoq(
                demand_stats["annual_demand"],
                _order_cost,
                holding_cost_per_unit,
            )

            # Ensure EOQ meets minimum order quantity
            eoq = max(eoq, supplier["min_order_qty"])

            # Safety Stock
            safety_stock = self.calculate_safety_stock(
                demand_stats["daily_std"],
                lead_time,
                settings.SERVICE_LEVEL,
            )

            # Reorder Point
            rop = self.calculate_reorder_point(
                demand_stats["daily_avg"],
                lead_time,
                safety_stock,
            )

            # Stockout Risk
            stockout_risk = self.calculate_stockout_risk(
                current_stock,
                demand_stats["daily_avg"],
                demand_stats["daily_std"],
                lead_time,
            )

            # Total Cost Analysis
            orders_per_year = demand_stats["annual_demand"] / eoq if eoq > 0 else 0
            annual_order_cost = orders_per_year * _order_cost
            annual_holding_cost = (eoq / 2) * holding_cost_per_unit
            annual_purchase_cost = demand_stats["annual_demand"] * unit_cost
            total_annual_cost = annual_order_cost + annual_holding_cost + annual_purchase_cost

            # Should we order now?
            should_order = current_stock <= rop

            supplier_options.append({
                "supplier": {
                    "id": supplier["supplier_id"],
                    "name": supplier["supplier_name"],
                    "lead_time_days": lead_time,
                    "rating": supplier["rating"],
                    "is_primary": supplier["is_primary"],
                },
                "eoq": eoq,
                "unit_cost": unit_cost,
                "safety_stock": safety_stock,
                "reorder_point": rop,
                "stockout_risk": stockout_risk,
                "cost_analysis": {
                    "order_cost_per_order": _order_cost,
                    "holding_cost_rate": _holding_rate,
                    "holding_cost_per_unit": round(holding_cost_per_unit, 2),
                    "orders_per_year": round(orders_per_year, 1),
                    "annual_order_cost": round(annual_order_cost, 2),
                    "annual_holding_cost": round(annual_holding_cost, 2),
                    "annual_purchase_cost": round(annual_purchase_cost, 2),
                    "total_annual_cost": round(total_annual_cost, 2),
                },
                "should_order": should_order,
                "recommended_order_qty": eoq if should_order else 0,
            })

        # Select best supplier (lowest total cost with acceptable rating)
        supplier_options.sort(key=lambda x: x["cost_analysis"]["total_annual_cost"])
        best_option = supplier_options[0]

        return {
            "status": "success",
            "product": {
                "id": product_id,
                "sku": product_info.get("sku", ""),
                "name": product_info.get("name", ""),
            },
            "warehouse_id": warehouse_id,
            "current_stock": current_stock,
            "demand_stats": demand_stats,
            "recommended": {
                "supplier": best_option["supplier"],
                "order_quantity": best_option["eoq"],
                "safety_stock": best_option["safety_stock"],
                "reorder_point": best_option["reorder_point"],
                "should_order_now": best_option["should_order"],
                "urgency": best_option["stockout_risk"]["urgency"],
                "total_cost": best_option["cost_analysis"]["total_annual_cost"],
            },
            "supplier_options": supplier_options,
        }

    def generate_bulk_po(self, warehouse_id: Optional[str] = None) -> dict:
        """Generate PO recommendations for all products needing reorder."""
        product_ids = DataRepository.get_all_active_product_ids()
        recommendations = []

        for pid in product_ids:
            try:
                result = self.generate_purchase_order(pid, warehouse_id)
                if result.get("status") == "success" and result["recommended"]["should_order_now"]:
                    recommendations.append(result)
            except Exception as e:
                logger.error(f"Error generating PO for product {pid}: {e}")

        # Sort by urgency
        urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        recommendations.sort(
            key=lambda x: urgency_order.get(x["recommended"]["urgency"], 4)
        )

        return {
            "status": "success",
            "total_products_analyzed": len(product_ids),
            "products_needing_reorder": len(recommendations),
            "recommendations": recommendations,
            "generated_at": datetime.utcnow().isoformat(),
        }
