# ══════════════════════════════════════════════════════════════════
# Automated Model Retraining Pipeline
# Can be triggered via cron job, GitHub Actions, or APScheduler
# ══════════════════════════════════════════════════════════════════

import logging
import sys
from datetime import datetime

logger = logging.getLogger(__name__)


def retrain_all_models():
    """Retrain both sklearn and Prophet models with latest data."""
    logger.info(f"═══ Automated Retraining Pipeline Started: {datetime.utcnow().isoformat()} ═══")

    results = {}

    # 1. Retrain sklearn model
    try:
        from app.services.forecasting import ForecastingService
        sklearn_svc = ForecastingService()
        sklearn_result = sklearn_svc.train()
        results["sklearn"] = sklearn_result
        logger.info(f"Sklearn model: {sklearn_result.get('status')}")
    except Exception as e:
        results["sklearn"] = {"status": "failed", "error": str(e)}
        logger.error(f"Sklearn retraining failed: {e}")

    # 2. Retrain Prophet model
    try:
        from app.services.prophet_forecasting import ProphetForecastingService
        prophet_svc = ProphetForecastingService()
        prophet_result = prophet_svc.train()
        results["prophet"] = prophet_result
        logger.info(f"Prophet model: {prophet_result.get('status')}")
    except Exception as e:
        results["prophet"] = {"status": "failed", "error": str(e)}
        logger.error(f"Prophet retraining failed: {e}")

    # 3. Run anomaly detection refresh
    try:
        from app.services.anomaly_detection import AnomalyDetectionService
        anomaly_svc = AnomalyDetectionService()
        anomaly_result = anomaly_svc.detect_anomalies(days_back=90)
        results["anomaly_detection"] = {
            "status": "success",
            "anomalies_found": anomaly_result.get("summary", {}).get("anomalies_detected", 0),
        }
        logger.info(f"Anomaly detection: {anomaly_result.get('summary', {}).get('anomalies_detected', 0)} anomalies")
    except Exception as e:
        results["anomaly_detection"] = {"status": "failed", "error": str(e)}
        logger.error(f"Anomaly detection refresh failed: {e}")

    logger.info(f"═══ Retraining Pipeline Complete ═══")
    return results


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    results = retrain_all_models()
    for model, result in results.items():
        status = result.get("status", "unknown")
        print(f"  {model}: {status}")

    # Exit with error code if any model failed
    if any(r.get("status") == "failed" for r in results.values()):
        sys.exit(1)
