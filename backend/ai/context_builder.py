from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.simulation.state import SimulationState
from backend.app.database.models import Incident, Service, Anomaly, FailurePrediction, RCAResult, RemediationAction


class ContextBuilder:
    """
    Dynamically constructs a context snapshot of the current environment state
    (Telemetry, Services, Incidents, ML Predictions, RCA Evidence, Remediation)
    for injection into LLM prompts.
    """

    @staticmethod
    def build_system_context(db: Session, target_service: Optional[str] = None) -> str:
        sim_state = SimulationState()
        sim_status = sim_state.services
        
        # 1. Monitored Services & Current Telemetry
        services_text = []
        for name, data in sim_status.items():
            services_text.append(
                f"- {name}: Health={data['health']}, CPU={data['cpu']:.1f}%, Memory={data['memory']:.1f}MB, Latency={data['latency']:.0f}ms, Errors={(data['error_rate']*100):.1f}%, Replicas={data['replicas']}/{data['desired']}"
            )
        services_summary = "\n".join(services_text)

        # 2. Active Incidents in Database
        open_incidents = db.query(Incident).filter(Incident.status != "RESOLVED").order_by(Incident.detected_at.desc()).all()
        incidents_text = []
        if open_incidents:
            for inc in open_incidents[:3]:
                rca = db.query(RCAResult).filter(RCAResult.incident_id == inc.id).first()
                rca_str = f" | RCA: {rca.probable_root_cause}" if rca else ""
                incidents_text.append(f"- [{inc.incident_code}] {inc.title} (Severity: {inc.severity}, Status: {inc.status}, Service: {inc.service_name}){rca_str}")
            incidents_summary = "\n".join(incidents_text)
        else:
            incidents_summary = "No active incidents detected. All services operating normally."

        # 3. Latest ML Predictions & Anomalies
        latest_anom = db.query(Anomaly).order_by(Anomaly.timestamp.desc()).first()
        anom_str = f"Latest Anomaly: {latest_anom.service_name} (Score: {latest_anom.anomaly_score}, Severity: {latest_anom.severity})" if latest_anom else "No metric anomalies currently flagged."

        latest_pred = db.query(FailurePrediction).order_by(FailurePrediction.timestamp.desc()).first()
        pred_str = f"Failure Prediction: {latest_pred.service_name} (Prob: {(latest_pred.failure_probability*100):.1f}%, Risk: {latest_pred.risk_level})" if latest_pred else "Failure Risk: LOW"

        # 4. Remediation Actions
        remediations = db.query(RemediationAction).order_by(RemediationAction.created_at.desc()).limit(2).all()
        rem_text = "\n".join([f"- {r.action_type} on {r.service_name} (Policy: {r.policy_decision}, Status: {r.status})" for r in remediations]) if remediations else "None pending"

        # Construct Final Structured Prompt Context
        context_prompt = f"""=== CURRENT CLUSTER SYSTEM STATE ===
Mode: {sim_state.mode}
Simulation Clock: {sim_state.clock_seconds}s
Active Scenario: {sim_state.current_scenario or 'Healthy Baseline'}

MONITORED MICROSERVICES TELEMETRY:
{services_summary}

ACTIVE INCIDENTS:
{incidents_summary}

AI/ML OBSERVABILITY:
{anom_str}
{pred_str}

REMEDIATION STATUS:
{rem_text}
===================================="""
        return context_prompt
