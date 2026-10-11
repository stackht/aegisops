import numpy as np


class NeuroFuzzyOverloadRiskEngine:
    """
    Hybrid Neuro-Fuzzy System for Infrastructure Overload Risk Assessment.
    Uses fuzzy membership functions (triangular/trapezoidal) and rule aggregation
    to calculate continuous Overload Risk Score [0.0 - 1.0] and Risk Category.
    """

    @staticmethod
    def _fuzzy_low(val, min_val=0.0, mid_val=30.0, max_val=60.0):
        if val <= min_val:
            return 1.0
        elif min_val < val < mid_val:
            return (mid_val - val) / (mid_val - min_val)
        return 0.0

    @staticmethod
    def _fuzzy_medium(val, low_val=30.0, peak_val=60.0, high_val=85.0):
        if low_val < val <= peak_val:
            return (val - low_val) / (peak_val - low_val)
        elif peak_val < val < high_val:
            return (high_val - val) / (high_val - peak_val)
        return 0.0

    @staticmethod
    def _fuzzy_high(val, min_val=60.0, peak_val=85.0, max_val=100.0):
        if val < min_val:
            return 0.0
        elif min_val <= val < peak_val:
            return (val - min_val) / (peak_val - min_val)
        return 1.0

    def evaluate_risk(self, metrics: dict) -> dict:
        cpu = metrics.get("cpu_usage", 25.0)
        memory_pct = (metrics.get("memory_usage", 200.0) / 1024.0) * 100.0
        latency = metrics.get("latency", 40.0)
        error_rate_pct = metrics.get("error_rate", 0.005) * 100.0

        # Fuzzy Fuzzification
        cpu_low = self._fuzzy_low(cpu, 0, 30, 60)
        cpu_med = self._fuzzy_medium(cpu, 30, 60, 80)
        cpu_high = self._fuzzy_high(cpu, 60, 80, 100)

        mem_low = self._fuzzy_low(memory_pct, 0, 35, 65)
        mem_med = self._fuzzy_medium(memory_pct, 35, 65, 85)
        mem_high = self._fuzzy_high(memory_pct, 65, 85, 100)

        lat_low = self._fuzzy_low(latency, 0, 100, 300)
        lat_med = self._fuzzy_medium(latency, 100, 300, 800)
        lat_high = self._fuzzy_high(latency, 300, 800, 2000)

        err_high = self._fuzzy_high(error_rate_pct, 1, 5, 20)
        restart_high = self._fuzzy_high(metrics.get("pod_restarts", 0), 1, 4, 8)

        # Fuzzy Rule Base Execution (Mamdani Inference)
        # Rule 1: IF CPU=HIGH AND MEMORY=HIGH AND LATENCY=HIGH THEN CRITICAL (Weight 1.0)
        rule_critical = min(cpu_high, mem_high, lat_high)

        # Rule 2: IF CPU=HIGH AND ERROR_RATE=HIGH THEN CRITICAL (Weight 0.9)
        rule_critical_2 = min(cpu_high, err_high)

        # Rule 3: IF (CPU=HIGH AND MEMORY=HIGH) OR (MEMORY=HIGH AND LATENCY=HIGH) THEN HIGH (Weight 0.8)
        # Rule 3b: IF MEMORY=HIGH (OOM risk) OR (LATENCY=HIGH AND ERROR_RATE=HIGH) OR (RESTARTS=HIGH AND ERROR_RATE=HIGH) THEN HIGH
        rule_high_1 = max(min(cpu_high, mem_high), min(mem_high, lat_high), mem_high, min(lat_high, err_high), min(restart_high, err_high))

        # Rule 4: IF CPU=MED AND MEMORY=MED AND LATENCY=MED THEN MEDIUM (Weight 0.5)
        rule_medium = min(cpu_med, mem_med, lat_med)

        # Defuzzification (Center of Gravity estimation)
        critical_degree = max(rule_critical, rule_critical_2)
        high_degree = rule_high_1
        medium_degree = rule_medium

        raw_score = (
            critical_degree * 0.95 +
            high_degree * 0.75 +
            medium_degree * 0.50 +
            (1.0 - max(critical_degree, high_degree, medium_degree)) * 0.15
        )

        overload_score = float(np.clip(raw_score, 0.0, 1.0))

        if overload_score >= 0.80:
            risk_category = "CRITICAL RISK"
        elif overload_score >= 0.60:
            risk_category = "HIGH RISK"
        elif overload_score >= 0.35:
            risk_category = "MEDIUM RISK"
        else:
            risk_category = "LOW RISK"

        return {
            "overload_risk_score": round(overload_score, 3),
            "risk_category": risk_category,
            "memberships": {
                "cpu": {"low": round(cpu_low, 2), "medium": round(cpu_med, 2), "high": round(cpu_high, 2)},
                "memory": {"low": round(mem_low, 2), "medium": round(mem_med, 2), "high": round(mem_high, 2)},
                "latency": {"low": round(lat_low, 2), "medium": round(lat_med, 2), "high": round(lat_high, 2)},
                "error_rate": {"high": round(err_high, 2)},
                "restarts": {"high": round(restart_high, 2)}
            },
            "fuzzy_rule_triggers": {
                "rule_critical_triple_saturation": round(critical_degree, 2),
                "rule_high_dual_saturation": round(high_degree, 2),
                "rule_medium_moderate_load": round(medium_degree, 2)
            }
        }
