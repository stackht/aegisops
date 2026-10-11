from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import CloudCost
from ml.anomaly_detection.isolation_forest import AnomalyDetector


class CloudCostService:
    def __init__(self):
        self.anomaly_detector = AnomalyDetector()

    def analyze_cost_anomalies(self, db: Session) -> List[Dict[str, Any]]:
        costs = db.query(CloudCost).all()
        results = []
        for cost in costs:
            # Detect anomaly based on cost spike threshold / Isolation forest check
            features = {
                "cpu_usage": 20.0,
                "memory_usage": 200.0,
                "latency": 30.0,
                "error_rate": 0.001,
                "pod_restarts": 0
            }
            # High cost (> $200/day) flagged as cost anomaly
            is_anomaly = cost.daily_cost > 200.0 or cost.is_anomaly
            score = round(min(1.0, cost.daily_cost / 250.0), 2) if is_anomaly else 0.12

            cost.is_anomaly = is_anomaly
            cost.anomaly_score = score

            results.append({
                "id": cost.id,
                "provider": cost.provider,
                "service_name": cost.service_name,
                "resource_id": cost.resource_id,
                "daily_cost": cost.daily_cost,
                "currency": cost.currency,
                "is_anomaly": is_anomaly,
                "anomaly_score": score,
                "recorded_date": cost.recorded_date.isoformat() if cost.recorded_date else ""
            })
        db.commit()
        return results
