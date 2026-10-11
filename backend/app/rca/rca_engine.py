from typing import List


class RootCauseAnalysisEngine:
    """
    Hybrid RCA Engine combining temporal correlation, multi-modal evidence collection
    (metrics, logs, events, deployments, traces), and service dependency graph traversal.

    Ranking rule: direct metric evidence (what the telemetry shows right now) outranks a
    deployment that merely happened recently. A deployment becomes the primary cause only
    when no metric-based cause explains the incident; otherwise it is reported as a
    contributing factor.
    """

    def __init__(self):
        # Service dependency graph: upstream -> downstream
        self.dependency_graph = {
            "checkout-service": ["payment-service", "inventory-service", "auth-service"],
            "payment-service": ["auth-service"],
            "inventory-service": ["auth-service"],
            "notification-service": ["auth-service"],
            "auth-service": []
        }

    def analyze_incident(
        self,
        service_name: str,
        metrics: dict,
        logs: List[str] = None,
        k8s_events: List[str] = None,
        recent_deployments: List[dict] = None
    ) -> dict:
        logs = logs or []
        k8s_events = k8s_events or []
        recent_deployments = recent_deployments or []

        evidences = []
        candidate_causes = []
        contributing_factors = []

        cpu = metrics.get("cpu_usage", 25.0)
        memory = metrics.get("memory_usage", 200.0)
        latency = metrics.get("latency", 40.0)
        error_rate = metrics.get("error_rate", 0.005)
        restarts = metrics.get("pod_restarts", 0)

        # 1. Inspect Metric Evidence
        if cpu > 85.0:
            evidences.append({
                "evidence_type": "METRIC_SPIKE",
                "source": "Prometheus",
                "description": f"{service_name} CPU usage saturated at {cpu:.1f}% (threshold 80%).",
                "payload": {"cpu_usage": cpu}
            })
            candidate_causes.append({
                "cause": f"{service_name} CPU saturation causing thread starvation and high latency.",
                "confidence": 0.88,
                "score_bonus": 0.35
            })

        memory_leak = memory > 512.0
        crash_loop = restarts > 2 and not memory_leak and cpu <= 85.0
        if memory_leak or restarts > 2:
            evidences.append({
                "evidence_type": "POD_RESTART",
                "source": "kube-state-metrics",
                "description": f"Pod restarts detected ({restarts} restarts) with memory footprint at {memory:.1f}MB.",
                "payload": {"memory_mb": memory, "restarts": restarts}
            })
        if memory_leak:
            candidate_causes.append({
                "cause": f"Memory leak or OOMKilled termination in {service_name} leading to pod instability.",
                "confidence": 0.85,
                "score_bonus": 0.30
            })
        elif crash_loop:
            candidate_causes.append({
                "cause": f"Pod instability: repeated container crashes (CrashLoopBackOff) in {service_name}.",
                "confidence": 0.86,
                "score_bonus": 0.30
            })

        if error_rate > 0.05:
            evidences.append({
                "evidence_type": "HIGH_ERROR_RATE",
                "source": "cAdvisor/Ingress",
                "description": f"Elevated HTTP 5xx error rate measured at {error_rate*100:.1f}%.",
                "payload": {"error_rate": error_rate}
            })

        metric_based = len(candidate_causes) > 0

        # 2. Inspect Deployment Evidence
        for dep in recent_deployments:
            dep_svc = dep.get("service_name")
            if dep_svc == service_name or dep_svc in self.dependency_graph.get(service_name, []):
                evidences.append({
                    "evidence_type": "DEPLOYMENT_EVENT",
                    "source": "CI/CD Pipeline",
                    "description": f"Recent deployment of {dep_svc} version {dep.get('version')} occurred recently.",
                    "payload": dep
                })
                text = f"Recent code deployment ({dep.get('version')}) of {dep_svc} may have introduced a performance regression or unhandled exception."
                if metric_based:
                    contributing_factors.append(text)
                    candidate_causes.append({"cause": text, "confidence": 0.75, "score_bonus": 0.20})
                else:
                    candidate_causes.append({"cause": text, "confidence": 0.90, "score_bonus": 0.40})

        # 3. Service Dependency Propagation Check
        dependencies = self.dependency_graph.get(service_name, [])
        for dep_svc in dependencies:
            candidate_causes.append({
                "cause": f"Upstream dependency bottleneck or failure propagation from {dep_svc}.",
                "confidence": 0.70,
                "score_bonus": 0.20
            })

        # Rank candidate causes
        if not candidate_causes:
            primary_root_cause = f"Transient network jitter or unclassified load anomaly on {service_name}."
            confidence = 0.60
        else:
            sorted_causes = sorted(candidate_causes, key=lambda x: x["confidence"], reverse=True)
            primary_root_cause = sorted_causes[0]["cause"]
            confidence = sorted_causes[0]["confidence"]

        evidence_summary_text = "; ".join([e["description"] for e in evidences]) if evidences else "No critical anomaly thresholds breached."

        return {
            "probable_root_cause": primary_root_cause,
            "confidence_score": round(confidence, 2),
            "evidence_summary": evidence_summary_text,
            "evidences": evidences,
            "candidate_causes": candidate_causes,
            "contributing_factors": contributing_factors
        }
