import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.connection import Base
from backend.app.database.models import Service, Incident, Deployment
from backend.app.rca.rca_engine import RootCauseAnalysisEngine
from backend.app.remediation.remediation_engine import RemediationEngine
from backend.app.ai.slm_assistant import SLMAssistant
from ml.anomaly_detection.isolation_forest import AnomalyDetector
from ml.neuro_fuzzy.overload_risk import NeuroFuzzyOverloadRiskEngine


class TestCalibratedAnomalyScore(unittest.TestCase):
    def setUp(self):
        self.detector = AnomalyDetector()

    def test_normal_telemetry_is_not_an_anomaly(self):
        res = self.detector.detect({"cpu_usage": 25.0, "memory_usage": 200.0, "latency": 40.0, "error_rate": 0.005, "pod_restarts": 0})
        self.assertFalse(res["is_anomaly"])
        self.assertLess(res["anomaly_score"], 0.5)
        self.assertEqual(res["severity"], "LOW")

    def test_cpu_spike_is_an_anomaly(self):
        res = self.detector.detect({"cpu_usage": 94.5, "memory_usage": 180.0, "latency": 420.0, "error_rate": 0.08, "pod_restarts": 0})
        self.assertTrue(res["is_anomaly"])
        self.assertGreater(res["anomaly_score"], 0.5)


class TestFuzzyCoverage(unittest.TestCase):
    def setUp(self):
        self.engine = NeuroFuzzyOverloadRiskEngine()

    def test_memory_only_leak_is_high_risk(self):
        res = self.engine.evaluate_risk({"cpu_usage": 30.0, "memory_usage": 920.0, "latency": 60.0, "error_rate": 0.12})
        self.assertGreaterEqual(res["overload_risk_score"], 0.60)

    def test_crash_loop_is_high_risk(self):
        res = self.engine.evaluate_risk({"cpu_usage": 12.0, "memory_usage": 150.0, "latency": 35.0, "error_rate": 0.25, "pod_restarts": 6})
        self.assertGreaterEqual(res["overload_risk_score"], 0.60)

    def test_idle_service_is_low_risk(self):
        res = self.engine.evaluate_risk({"cpu_usage": 15.0, "memory_usage": 150.0, "latency": 30.0, "error_rate": 0.001})
        self.assertLess(res["overload_risk_score"], 0.35)


class TestRcaRanking(unittest.TestCase):
    def test_metric_evidence_outranks_deployment(self):
        rca = RootCauseAnalysisEngine()
        res = rca.analyze_incident(
            "checkout-service",
            {"cpu_usage": 95.0, "memory_usage": 200.0, "latency": 450.0, "error_rate": 0.08, "pod_restarts": 0},
            recent_deployments=[{"service_name": "checkout-service", "version": "v2.1.0"}],
        )
        self.assertIn("CPU saturation", res["probable_root_cause"])
        self.assertEqual(len(res["contributing_factors"]), 1)

    def test_crash_loop_is_reported_as_crash_loop(self):
        rca = RootCauseAnalysisEngine()
        res = rca.analyze_incident("inventory-service", {"cpu_usage": 12.0, "memory_usage": 150.0, "latency": 35.0, "error_rate": 0.25, "pod_restarts": 6})
        self.assertIn("CrashLoopBackOff", res["probable_root_cause"])
        action = SLMAssistant()._extract_action("inventory-service", res["probable_root_cause"])
        self.assertEqual(action["action_type"], "RESTART_POD")


class TestRemediationEngine(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(bind=engine)
        self.db = sessionmaker(bind=engine)()
        self.db.add(Service(name="checkout-service", current_cpu_usage=94.5, current_memory_usage=180.0,
                            current_latency_ms=420.0, current_error_rate=0.08, health_status="CRITICAL",
                            replicas_desired=3, replicas_ready=3))
        self.db.add(Deployment(service_name="checkout-service", version="v2.1.0"))
        self.db.add(Incident(incident_code="INC-1", title="CPU", service_name="checkout-service", severity="HIGH", status="OPEN"))
        self.db.commit()
        self.engine = RemediationEngine()

    def test_scale_out_recovers_and_resolves_incident(self):
        rem = self.engine.create_remediation(self.db, "checkout-service", "SCALE_DEPLOYMENT", "deployment/checkout-service",
                                             {"replicas": 4}, user_role="DevOps", incident_id=1, risk_level="LOW")
        self.assertEqual(rem.policy_decision, "ALLOW")
        res = self.engine.execute_remediation(self.db, rem.id, user_role="DevOps")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertIn("RECOVERY VERIFIED", res["verification_result"])
        svc = self.db.query(Service).first()
        self.assertEqual(svc.health_status, "HEALTHY")
        self.assertEqual(svc.replicas_ready, 4)
        self.assertEqual(self.db.query(Incident).first().status, "RESOLVED")

    def test_rollback_is_implemented(self):
        rem = self.engine.create_remediation(self.db, "checkout-service", "ROLLBACK_DEPLOYMENT", "deployment/checkout-service",
                                             {"revision": "previous"}, user_role="DevOps", risk_level="HIGH")
        self.assertEqual(rem.policy_decision, "REQUIRE_APPROVAL")
        res = self.engine.execute_remediation(self.db, rem.id, user_role="Admin")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(self.db.query(Deployment).first().status, "ROLLED_BACK")

    def test_denied_action_cannot_be_executed(self):
        rem = self.engine.create_remediation(self.db, "checkout-service", "SCALE_DEPLOYMENT", "deployment/checkout-service",
                                             {"replicas": 4}, user_role="Viewer", risk_level="LOW")
        self.assertEqual(rem.policy_decision, "DENY")
        self.assertEqual(rem.status, "DENIED")
        self.assertIn("error", self.engine.execute_remediation(self.db, rem.id, user_role="Admin"))

    def test_approval_needs_admin_or_devops(self):
        rem = self.engine.create_remediation(self.db, "checkout-service", "RESTART_POD", "pod/checkout-service",
                                             {}, user_role="Developer", risk_level="LOW")
        self.assertEqual(rem.policy_decision, "REQUIRE_APPROVAL")
        self.assertIn("error", self.engine.execute_remediation(self.db, rem.id, user_role="Viewer"))
        self.assertEqual(self.engine.execute_remediation(self.db, rem.id, user_role="DevOps")["status"], "SUCCESS")


if __name__ == "__main__":
    unittest.main()
