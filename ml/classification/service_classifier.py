import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/classification"))
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "service_classifier.joblib")


class ServiceHealthClassifier:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
        self.classes = ["HEALTHY", "DEGRADED", "CRITICAL"]
        self.feature_names = ["cpu_usage", "memory_usage", "latency", "error_rate", "pod_restarts"]
        self.is_fitted = False
        self._load_or_train_default()

    def _generate_synthetic_training_data(self, num_samples: int = 1200, seed: int = 42) -> tuple:
        rng = np.random.RandomState(seed)
        # One third of the samples come from realistic healthy ranges, so that all three classes are well represented
        n_h = num_samples // 3
        cpu = np.concatenate([rng.uniform(5, 60, n_h), rng.uniform(5, 100, num_samples - n_h)])
        memory = np.concatenate([rng.uniform(80, 450, n_h), rng.uniform(50, 1024, num_samples - n_h)])
        latency = np.concatenate([rng.uniform(10, 200, n_h), rng.uniform(10, 1500, num_samples - n_h)])
        error_rate = np.concatenate([rng.uniform(0.0, 0.025, n_h), rng.uniform(0.0, 0.5, num_samples - n_h)])
        pod_restarts = np.concatenate([rng.randint(0, 2, n_h), rng.poisson(lam=1.0, size=num_samples - n_h)])

        X = np.column_stack([cpu, memory, latency, error_rate, pod_restarts])

        y = []
        for i in range(num_samples):
            if cpu[i] > 85 or error_rate[i] > 0.15 or pod_restarts[i] >= 4:
                y.append("CRITICAL")
            elif cpu[i] > 65 or latency[i] > 250 or error_rate[i] > 0.03:
                y.append("DEGRADED")
            else:
                y.append("HEALTHY")

        return X, np.array(y)

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

    def classify(self, features: dict) -> str:
        sample = np.array([[
            features.get("cpu_usage", 25.0),
            features.get("memory_usage", 200.0),
            features.get("latency", 40.0),
            features.get("error_rate", 0.005),
            features.get("pod_restarts", 0)
        ]])
        pred_label = self.model.predict(sample)[0]
        return str(pred_label)
