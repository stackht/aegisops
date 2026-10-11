import unittest
from backend.app.rca.rca_engine import RootCauseAnalysisEngine
from backend.app.security.policy_engine import PolicyEngine


class TestRCAAndPolicy(unittest.TestCase):
    def setUp(self):
        self.rca_engine = RootCauseAnalysisEngine()
        self.policy_engine = PolicyEngine()

    def test_rca_cpu_saturation(self):
        metrics = {"cpu_usage": 95.0, "memory_usage": 200.0, "latency": 450.0, "error_rate": 0.08, "pod_restarts": 0}
        res = self.rca_engine.analyze_incident("checkout-service", metrics)
        self.assertIn("CPU saturation", res["probable_root_cause"])
        self.assertGreater(len(res["evidences"]), 0)

    def test_prolog_policy_authorization(self):
        admin_res = self.policy_engine.evaluate_action("Admin", "SCALE_DEPLOYMENT", "LOW", "payment-service")
        viewer_res = self.policy_engine.evaluate_action("Viewer", "SCALE_DEPLOYMENT", "LOW", "payment-service")
        
        self.assertEqual(admin_res["decision"], "ALLOW")
        self.assertEqual(viewer_res["decision"], "DENY")


if __name__ == "__main__":
    unittest.main()
