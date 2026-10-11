import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/anomaly"))
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.joblib")


class AnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=42
        )
        self.is_fitted = False
        self._load_or_train_default()

    def _generate_synthetic_baseline(self, num_samples: int = 1000, seed: int = 42, return_labels: bool = False):
        rng = np.random.RandomState(seed)
        # Normal operational metrics: cpu, memory, latency, error_rate, pod_restarts
        # Healthy services differ in size (a notification service is small, a checkout service is larger),
        # so the normal range is a band, not a single point.
        cpu = rng.uniform(5, 45, size=num_samples)
        memory = rng.uniform(80, 330, size=num_samples)
        latency = rng.uniform(10, 110, size=num_samples)
        error_rate = rng.exponential(scale=0.005, size=num_samples)
        pod_restarts = rng.poisson(lam=0.1, size=num_samples)

        # Inject 5% anomalies
        num_anomalies = int(num_samples * self.contamination)
        cpu[:num_anomalies] = rng.uniform(85, 99, num_anomalies)
        memory[:num_anomalies] = rng.uniform(600, 950, num_anomalies)
        latency[:num_anomalies] = rng.uniform(250, 1200, num_anomalies)
        error_rate[:num_anomalies] = rng.uniform(0.1, 0.45, num_anomalies)
        pod_restarts[:num_anomalies] = rng.randint(3, 15, num_anomalies)

        data = np.column_stack([
            np.clip(cpu, 0, 100),
            np.clip(memory, 10, 1024),
            np.clip(latency, 1, 3000),
            np.clip(error_rate, 0, 1.0),
            np.clip(pod_restarts, 0, 50)
        ])
        if return_labels:
            labels = np.zeros(num_samples, dtype=int)
            labels[:num_anomalies] = 1
            return data, labels
        return data

    def fit(self, data: np.ndarray = None):
        if data is None:
            data = self._generate_synthetic_baseline()
        self.model.fit(data)
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

    def detect(self, features: dict) -> dict:
        sample = np.array([[
            features.get("cpu_usage", 25.0),
            features.get("memory_usage", 200.0),
            features.get("latency", 40.0),
            features.get("error_rate", 0.005),
            features.get("pod_restarts", 0)
        ]])

        raw_score = float(self.model.score_samples(sample)[0])
        # Calibrated score in [0, 1]: 0.5 sits exactly on the model's own decision threshold
        # (offset_), normal telemetry scores near 0 and extreme telemetry near 1.
        anomaly_score = float(np.clip(0.5 + (self.model.offset_ - raw_score) / 0.05, 0.0, 1.0))
        is_anomaly = bool(self.model.predict(sample)[0] == -1)

        if not is_anomaly:
            severity = "LOW"
        elif anomaly_score > 0.8:
            severity = "CRITICAL"
        elif anomaly_score > 0.65:
            severity = "HIGH"
        else:
            severity = "MEDIUM"

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 3),
            "severity": severity
        }
