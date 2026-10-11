import unittest
from ml.anomaly_detection.isolation_forest import AnomalyDetector
from ml.failure_prediction.failure_predictor import FailurePredictor
from ml.classification.service_classifier import ServiceHealthClassifier
from ml.neuro_fuzzy.overload_risk import NeuroFuzzyOverloadRiskEngine


class TestMLPipeline(unittest.TestCase):
    def setUp(self):
        self.anomaly_detector = AnomalyDetector()
        self.failure_predictor = FailurePredictor()
        self.service_classifier = ServiceHealthClassifier()
        self.neuro_fuzzy_engine = NeuroFuzzyOverloadRiskEngine()

    def test_anomaly_detection_normal(self):
        features = {"cpu_usage": 20.0, "memory_usage": 180.0, "latency": 35.0, "error_rate": 0.001, "pod_restarts": 0}
        res = self.anomaly_detector.detect(features)
        self.assertIn("is_anomaly", res)
        self.assertIn("anomaly_score", res)
        self.assertIn("severity", res)

    def test_anomaly_detection_spike(self):
        features = {"cpu_usage": 98.0, "memory_usage": 850.0, "latency": 950.0, "error_rate": 0.25, "pod_restarts": 8}
        res = self.anomaly_detector.detect(features)
        self.assertTrue(res["is_anomaly"])
        self.assertGreaterEqual(res["anomaly_score"], 0.60)

    def test_failure_prediction(self):
        features = {"cpu_usage": 92.0, "memory_usage": 700.0, "latency": 600.0, "error_rate": 0.15, "pod_restarts": 5, "historical_failures": 3, "node_cpu_usage": 85.0}
        res = self.failure_predictor.predict(features)
        self.assertGreater(res["failure_probability"], 0.50)
        self.assertIn(res["risk"], ["HIGH", "CRITICAL"])

    def test_service_health_classification(self):
        healthy_features = {"cpu_usage": 25.0, "memory_usage": 150.0, "latency": 30.0, "error_rate": 0.001, "pod_restarts": 0}
        critical_features = {"cpu_usage": 95.0, "memory_usage": 800.0, "latency": 800.0, "error_rate": 0.20, "pod_restarts": 5}
        
        self.assertEqual(self.service_classifier.classify(healthy_features), "HEALTHY")
        self.assertEqual(self.service_classifier.classify(critical_features), "CRITICAL")

    def test_neuro_fuzzy_risk(self):
        high_load = {"cpu_usage": 90.0, "memory_usage": 800.0, "latency": 650.0, "error_rate": 0.10}
        res = self.neuro_fuzzy_engine.evaluate_risk(high_load)
        self.assertGreaterEqual(res["overload_risk_score"], 0.60)
        self.assertIn("RISK", res["risk_category"])


if __name__ == "__main__":
    unittest.main()
