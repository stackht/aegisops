import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score
)
from ml.anomaly_detection.isolation_forest import AnomalyDetector
from ml.failure_prediction.failure_predictor import FailurePredictor
from ml.classification.service_classifier import ServiceHealthClassifier


class ModelEvaluator:
    @staticmethod
    def evaluate_failure_predictor() -> dict:
        predictor = FailurePredictor()
        X, y_true = predictor._generate_synthetic_training_data(num_samples=1000, seed=2024)  # held-out seed
        
        y_prob = []
        for i in range(len(X)):
            row = {
                "cpu_usage": X[i, 0],
                "memory_usage": X[i, 1],
                "latency": X[i, 2],
                "error_rate": X[i, 3],
                "pod_restarts": X[i, 4],
                "historical_failures": X[i, 5],
                "node_cpu_usage": X[i, 6]
            }
            y_prob.append(predictor.predict(row)["failure_probability"])

        y_pred = [1 if p >= 0.5 else 0 for p in y_prob]

        cm = confusion_matrix(y_true, y_pred)
        tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)

        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred, zero_division=0)
        rec = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        auc = roc_auc_score(y_true, y_prob)

        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0

        return {
            "model_name": "RandomForest_FailurePredictor",
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "false_positive_rate": round(float(fpr), 4),
            "false_negative_rate": round(float(fnr), 4),
            "confusion_matrix": cm.tolist()
        }

    @staticmethod
    def evaluate_service_classifier() -> dict:
        classifier = ServiceHealthClassifier()
        X, y_true = classifier._generate_synthetic_training_data(num_samples=1000, seed=2025)  # held-out seed
        
        y_pred = []
        for i in range(len(X)):
            row = {
                "cpu_usage": X[i, 0],
                "memory_usage": X[i, 1],
                "latency": X[i, 2],
                "error_rate": X[i, 3],
                "pod_restarts": X[i, 4]
            }
            y_pred.append(classifier.classify(row))

        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred, average="weighted", zero_division=0)
        rec = recall_score(y_true, y_pred, average="weighted", zero_division=0)
        f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)

        return {
            "model_name": "RandomForest_ServiceHealthClassifier",
            "accuracy": round(acc, 4),
            "precision_weighted": round(prec, 4),
            "recall_weighted": round(rec, 4),
            "f1_weighted": round(f1, 4),
            "confusion_matrix": confusion_matrix(y_true, y_pred, labels=["HEALTHY", "DEGRADED", "CRITICAL"]).tolist()
        }


def evaluate_anomaly_detector() -> dict:
    detector = AnomalyDetector()
    X, y_true = detector._generate_synthetic_baseline(num_samples=1000, seed=2026, return_labels=True)  # held-out seed
    y_pred = []
    for row in X:
        res = detector.detect({
            "cpu_usage": row[0], "memory_usage": row[1], "latency": row[2],
            "error_rate": row[3], "pod_restarts": row[4]
        })
        y_pred.append(1 if res["is_anomaly"] else 0)
    cm = confusion_matrix(y_true, y_pred)
    return {
        "model_name": "IsolationForest_AnomalyDetector",
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "confusion_matrix": cm.tolist()
    }


ModelEvaluator.evaluate_anomaly_detector = staticmethod(evaluate_anomaly_detector)


if __name__ == "__main__":
    print("Evaluating Models...")
    evaluator = ModelEvaluator()
    print("Failure Predictor Evaluation:", evaluator.evaluate_failure_predictor())
    print("Service Classifier Evaluation:", evaluator.evaluate_service_classifier())
    print("Anomaly Detector Evaluation:", evaluator.evaluate_anomaly_detector())
