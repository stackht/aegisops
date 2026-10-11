import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/failure"))
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_failure.joblib")


class FailurePredictor:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        self.is_fitted = False
        self.feature_names = [
            "cpu_usage", "memory_usage", "latency", "error_rate",
            "pod_restarts", "historical_failures", "node_cpu_usage"
        ]
        self._load_or_train_default()

    def _generate_synthetic_training_data(self, num_samples: int = 1500, seed: int = 42) -> tuple:
        rng = np.random.RandomState(seed)
        cpu = rng.uniform(5, 100, num_samples)
        memory = rng.uniform(50, 1024, num_samples)
        latency = rng.uniform(10, 1500, num_samples)
        error_rate = rng.uniform(0.0, 0.5, num_samples)
        pod_restarts = rng.poisson(lam=1.0, size=num_samples)
        hist_failures = rng.randint(0, 10, num_samples)
        node_cpu = rng.uniform(10, 95, num_samples)

        X = np.column_stack([cpu, memory, latency, error_rate, pod_restarts, hist_failures, node_cpu])

        score = (
            (cpu / 100.0) * 0.35 +
            (memory / 1024.0) * 0.2 +
            (latency / 1500.0) * 0.15 +
            (error_rate / 0.5) * 0.2 +
            (pod_restarts / 10.0) * 0.1
        )
        y = (score > 0.48).astype(int)

        return X, y

    def fit(self, X=None, y=None):
        if X is None or y is None:
            X, y = self._generate_synthetic_training_data()
        self.model.fit(X, y)
        self.is_fitted = True
        joblib.dump(self.model, MODEL_PATH)

    def _load_or_train_default(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                self.is_fitted = True
            except Exception:
                self.fit()
        else:
            self.fit()

    def predict(self, features: dict) -> dict:
        sample = np.array([[
            features.get("cpu_usage", 25.0),
            features.get("memory_usage", 200.0),
            features.get("latency", 40.0),
            features.get("error_rate", 0.005),
            features.get("pod_restarts", 0),
            features.get("historical_failures", 0),
            features.get("node_cpu_usage", 30.0)
        ]])

        prob = float(self.model.predict_proba(sample)[0][1])

        if prob >= 0.75:
            risk = "CRITICAL"
        elif prob >= 0.50:
            risk = "HIGH"
        elif prob >= 0.25:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        importances = dict(zip(self.feature_names, self.model.feature_importances_))
        sorted_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)

        return {
            "failure_probability": round(prob, 3),
            "risk": risk,
            "top_contributing_features": [{"feature": k, "importance": round(v, 3)} for k, v in sorted_features[:3]]
        }
