# ══════════════════════════════════════════════════════════════════
# External Holiday API Integration
# Integrates national holidays into forecasting features
# ══════════════════════════════════════════════════════════════════

import logging
from datetime import datetime
from typing import Optional

import httpx
import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory cache for holidays
_holiday_cache: dict[int, list[dict]] = {}


async def fetch_holidays(year: int) -> list[dict]:
    """Fetch national holidays from Nager.Date API."""
    if year in _holiday_cache:
        return _holiday_cache[year]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.HOLIDAY_API_URL}/PublicHolidays/{year}/{settings.HOLIDAY_COUNTRY}"
            )
            if response.status_code == 200:
                holidays = response.json()
                _holiday_cache[year] = holidays
                logger.info(f"Fetched {len(holidays)} holidays for {year}")
                return holidays
    except Exception as e:
        logger.warning(f"Failed to fetch holidays for {year}: {e}")

    return []


def fetch_holidays_sync(year: int) -> list[dict]:
    """Synchronous version for use in non-async contexts."""
    if year in _holiday_cache:
        return _holiday_cache[year]

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{settings.HOLIDAY_API_URL}/PublicHolidays/{year}/{settings.HOLIDAY_COUNTRY}"
            )
            if response.status_code == 200:
                holidays = response.json()
                _holiday_cache[year] = holidays
                logger.info(f"Fetched {len(holidays)} holidays for {year}")
                return holidays
    except Exception as e:
        logger.warning(f"Failed to fetch holidays for {year}: {e}")

    return []


def get_holiday_dataframe(start_date: datetime, end_date: datetime) -> pd.DataFrame:
    """
    Create a DataFrame of holidays between start_date and end_date.
    Compatible with Prophet's holiday format.
    """
    years = range(start_date.year, end_date.year + 1)
    all_holidays = []

    for year in years:
        holidays = fetch_holidays_sync(year)
        for h in holidays:
            all_holidays.append({
                "ds": pd.to_datetime(h["date"]),
                "holiday": h.get("localName", h.get("name", "Holiday")),
                "lower_window": -1,  # effect starts 1 day before
                "upper_window": 1,   # effect lasts 1 day after
            })

    if not all_holidays:
        return pd.DataFrame(columns=["ds", "holiday", "lower_window", "upper_window"])

    df = pd.DataFrame(all_holidays)
    df = df[(df["ds"] >= pd.to_datetime(start_date)) & (df["ds"] <= pd.to_datetime(end_date))]
    return df


def add_holiday_features(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """Add holiday-related features to a DataFrame."""
    result = df.copy()
    result[date_col] = pd.to_datetime(result[date_col])

    min_date = result[date_col].min()
    max_date = result[date_col].max()
    holidays_df = get_holiday_dataframe(min_date, max_date)

    if holidays_df.empty:
        result["is_holiday"] = 0
        result["days_to_holiday"] = 30
        result["days_after_holiday"] = 30
        return result

    holiday_dates = set(holidays_df["ds"].dt.date)

    result["is_holiday"] = result[date_col].dt.date.apply(
        lambda d: 1 if d in holiday_dates else 0
    )

    # Days to next holiday and days since last holiday
    sorted_holidays = sorted(holiday_dates)

    def days_to_nearest_holiday(d):
        d = d.date() if hasattr(d, "date") else d
        future = [h for h in sorted_holidays if h >= d]
        past = [h for h in sorted_holidays if h <= d]
        days_to = (future[0] - d).days if future else 30
        days_after = (d - past[-1]).days if past else 30
        return days_to, days_after

    holiday_info = result[date_col].apply(days_to_nearest_holiday)
    result["days_to_holiday"] = holiday_info.apply(lambda x: min(x[0], 30))
    result["days_after_holiday"] = holiday_info.apply(lambda x: min(x[1], 30))

    return result
