from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import PipelineRun
from ml.failure_prediction.failure_predictor import FailurePredictor


class CICDPredictionService:
    def __init__(self):
        self.predictor = FailurePredictor()

    def evaluate_pipeline_runs(self, db: Session) -> List[Dict[str, Any]]:
        runs = db.query(PipelineRun).all()
        results = []
        for run in runs:
            # Predict failure based on tests_failed, duration, branch
            test_fail_ratio = run.tests_failed / (run.tests_passed + run.tests_failed + 1)
            features = {
                "cpu_usage": 50.0 + (test_fail_ratio * 40.0),
                "memory_usage": 300.0,
                "latency": run.build_duration_sec,
                "error_rate": test_fail_ratio,
                "pod_restarts": run.tests_failed,
                "historical_failures": 2 if run.branch != "main" else 0,
                "node_cpu_usage": 40.0
            }
            pred = self.predictor.predict(features)
            prob = pred["failure_probability"]
            risk = pred["risk"]

            run.failure_probability = prob
            run.risk_assessment = risk
            if prob > 0.65:
                run.status = "FAILED"

            results.append({
                "id": run.id,
                "pipeline_name": run.pipeline_name,
                "commit_sha": run.commit_sha,
                "branch": run.branch,
                "build_duration_sec": run.build_duration_sec,
                "tests_passed": run.tests_passed,
                "tests_failed": run.tests_failed,
                "failure_probability": prob,
                "risk_assessment": risk,
                "status": run.status,
                "created_at": run.created_at.isoformat() if run.created_at else ""
            })
        db.commit()
        return results
