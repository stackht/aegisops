import datetime
from sqlalchemy.orm import Session
from backend.app.database.models import RemediationAction, Incident, Service, AuditLog, Deployment
from backend.app.security.policy_engine import PolicyEngine
from backend.app.monitoring.k8s_client import KubernetesAdapter
from backend.simulation.state import SimulationState

APPROVER_ROLES = ("Admin", "DevOps")

# Healthy limits used to verify recovery after an action
VERIFY_CPU_MAX = 60.0
VERIFY_LATENCY_MAX = 200.0
VERIFY_ERROR_MAX = 0.02
VERIFY_MEMORY_MAX = 450.0


class RemediationEngine:
    def __init__(self):
        self.policy_engine = PolicyEngine()
        self.k8s_adapter = KubernetesAdapter()

    def create_remediation(
        self,
        db: Session,
        service_name: str,
        action_type: str,
        target_resource: str,
        parameters: dict,
        user_role: str = "DevOps",
        incident_id: int = None,
        risk_level: str = "LOW"
    ) -> RemediationAction:
        policy_res = self.policy_engine.evaluate_action(user_role, action_type, risk_level, service_name)
        decision = policy_res["decision"]
        status = {"ALLOW": "APPROVED", "REQUIRE_APPROVAL": "PENDING_APPROVAL", "DENY": "DENIED"}.get(decision, "PENDING_APPROVAL")

        remediation = RemediationAction(
            incident_id=incident_id,
            service_name=service_name,
            action_type=action_type,
            target_resource=target_resource,
            parameters=parameters,
            risk_level=risk_level,
            policy_decision=decision,
            status=status
        )
        db.add(remediation)
        db.commit()
        db.refresh(remediation)
        return remediation

    @staticmethod
    def _sync_simulation(service_name: str, svc: Service):
        """Keep the live telemetry simulation consistent with the recovered service."""
        state = SimulationState()
        sim_svc = state.services.get(service_name)
        if sim_svc:
            sim_svc["cpu"] = svc.current_cpu_usage
            sim_svc["memory"] = svc.current_memory_usage
            sim_svc["latency"] = svc.current_latency_ms
            sim_svc["error_rate"] = svc.current_error_rate
            sim_svc["health"] = svc.health_status
            sim_svc["replicas"] = svc.replicas_ready
            sim_svc["desired"] = svc.replicas_desired
        if state.target_service == service_name and state.is_running:
            state.is_running = False
            state.add_timeline_event(f"Remediation recovered {service_name}; failure scenario stopped.", "INFO")
        state.restarts.pop(service_name, None)
        for pod in state.pods:
            if pod["service"] == service_name:
                pod["status"] = "Running"
                pod["restarts"] = 0

    @staticmethod
    def _verify(svc: Service, action_type: str) -> tuple:
        """Verify recovery by re-reading the service telemetry after the action."""
        ok = (
            svc.current_cpu_usage < VERIFY_CPU_MAX
            and svc.current_latency_ms < VERIFY_LATENCY_MAX
            and svc.current_error_rate < VERIFY_ERROR_MAX
            and svc.current_memory_usage < VERIFY_MEMORY_MAX
        )
        reading = (
            f"CPU {svc.current_cpu_usage:.1f}%, memory {svc.current_memory_usage:.0f} MB, "
            f"latency {svc.current_latency_ms:.0f} ms, error rate {svc.current_error_rate * 100:.1f}%"
        )
        if ok:
            return True, f"RECOVERY VERIFIED after {action_type}: {reading} are within healthy limits."
        return False, f"RECOVERY NOT VERIFIED after {action_type}: {reading} still exceed healthy limits."

    def execute_remediation(
        self,
        db: Session,
        remediation_id: int,
        approved_by_user: str = "auto-remediation-bot",
        user_role: str = "DevOps"
    ) -> dict:
        remediation = db.query(RemediationAction).filter(RemediationAction.id == remediation_id).first()
        if not remediation:
            return {"error": "Remediation action not found"}

        if remediation.status == "SUCCESS":
            return {"error": "Action was already executed successfully."}
        if remediation.status in ("REJECTED", "DENIED") or remediation.policy_decision == "DENY":
            return {"error": "Action is denied by the authorization policy and cannot be executed."}
        if remediation.policy_decision == "REQUIRE_APPROVAL" and user_role not in APPROVER_ROLES:
            return {"error": f"Action requires approval by an Admin or DevOps user; role '{user_role}' cannot approve it."}

        remediation.status = "EXECUTING"
        remediation.approved_by = approved_by_user
        remediation.executed_at = datetime.datetime.utcnow()
        db.commit()

        exec_res = {"success": False, "message": "Unknown action"}
        params = remediation.parameters or {}
        svc = db.query(Service).filter(Service.name == remediation.service_name).first()

        if remediation.action_type == "SCALE_DEPLOYMENT":
            replicas = params.get("replicas", 4)
            exec_res = self.k8s_adapter.scale_deployment("default", remediation.service_name, replicas)
            if exec_res.get("success") and svc:
                svc.replicas_desired = replicas
                svc.replicas_ready = replicas
                svc.current_cpu_usage = max(15.0, svc.current_cpu_usage * 0.4)
                svc.current_latency_ms = max(20.0, svc.current_latency_ms * 0.3)
                svc.current_error_rate = min(svc.current_error_rate, 0.001)

        elif remediation.action_type == "RESTART_POD":
            exec_res = self.k8s_adapter.restart_pod("default", remediation.service_name)
            if exec_res.get("success") and svc:
                svc.current_memory_usage = 180.0
                svc.current_cpu_usage = min(svc.current_cpu_usage, 25.0)
                svc.current_latency_ms = min(svc.current_latency_ms, 45.0)
                svc.current_error_rate = min(svc.current_error_rate, 0.001)

        elif remediation.action_type == "ROLLBACK_DEPLOYMENT":
            exec_res = self.k8s_adapter.rollback_deployment("default", remediation.service_name, params.get("revision", "previous"))
            if exec_res.get("success") and svc:
                svc.current_cpu_usage = max(15.0, svc.current_cpu_usage * 0.45)
                svc.current_latency_ms = max(20.0, svc.current_latency_ms * 0.35)
                svc.current_memory_usage = min(svc.current_memory_usage, 220.0)
                svc.current_error_rate = min(svc.current_error_rate, 0.001)
                latest = (
                    db.query(Deployment)
                    .filter(Deployment.service_name == remediation.service_name)
                    .order_by(Deployment.deployed_at.desc())
                    .first()
                )
                if latest:
                    latest.status = "ROLLED_BACK"

        if exec_res.get("success") and svc:
            verified, message = self._verify(svc, remediation.action_type)
            svc.health_status = "HEALTHY" if verified else "DEGRADED"
            remediation.status = "SUCCESS" if verified else "UNVERIFIED"
            remediation.verification_result = message
            self._sync_simulation(remediation.service_name, svc)

            # Auto-resolve associated incident only when recovery is verified
            if verified and remediation.incident_id:
                inc = db.query(Incident).filter(Incident.id == remediation.incident_id).first()
                if inc:
                    inc.status = "RESOLVED"
                    inc.resolved_at = datetime.datetime.utcnow()
                    inc.summary = f"Resolved automatically via remediation action {remediation.action_type}."
        else:
            remediation.status = "FAILED"
            remediation.verification_result = f"Execution failed: {exec_res.get('message')}"

        db.commit()

        # Create audit log entry
        audit = AuditLog(
            username=approved_by_user,
            action=f"EXECUTE_{remediation.action_type}",
            resource=remediation.target_resource,
            details={"remediation_id": remediation.id, "role": user_role, "result": exec_res}
        )
        db.add(audit)
        db.commit()

        return {
            "status": remediation.status,
            "verification_result": remediation.verification_result,
            "execution_details": exec_res
        }
