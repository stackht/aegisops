from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import datetime
import time

from backend.app.database.connection import get_db
from backend.app.database.models import (
    User, Service, Node, Pod, Metric, Anomaly, FailurePrediction,
    Incident, IncidentEvidence, RCAResult, RemediationAction, CloudCost, Deployment, PipelineRun
)
from backend.app.schemas.schemas import (
    UserCreate, UserResponse, Token, ServiceResponse, PodResponse, NodeResponse,
    AnomalyResponse, PredictionResponse, IncidentResponse, RemediationRequest,
    RemediationResponse, CostResponse, SimulationRequest
)
from backend.app.security.auth import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from ml.anomaly_detection.isolation_forest import AnomalyDetector
from ml.failure_prediction.failure_predictor import FailurePredictor
from ml.classification.service_classifier import ServiceHealthClassifier
from ml.neuro_fuzzy.overload_risk import NeuroFuzzyOverloadRiskEngine
from backend.app.rca.rca_engine import RootCauseAnalysisEngine
from backend.app.ai.rag_engine import RAGEngine
from backend.app.ai.slm_assistant import SLMAssistant
from backend.ai.ollama_provider import OllamaProvider
from backend.ai.context_builder import ContextBuilder
from backend.ai.prompts import AIOPS_SYSTEM_PROMPT
from backend.app.remediation.remediation_engine import RemediationEngine
from backend.app.services.cost_service import CloudCostService
from backend.app.services.cicd_service import CICDPredictionService
from backend.simulation.engine import SimulationEngine
from backend.simulation.state import SimulationState
from backend.app.config import DEMO_MODE

router = APIRouter()

# Singletons
anomaly_detector = AnomalyDetector()
failure_predictor = FailurePredictor()
service_classifier = ServiceHealthClassifier()
neuro_fuzzy_engine = NeuroFuzzyOverloadRiskEngine()
rca_engine = RootCauseAnalysisEngine()
rag_engine = RAGEngine()
slm_assistant = SLMAssistant()
ollama_provider = OllamaProvider()
remediation_engine = RemediationEngine()
cost_service = CloudCostService()
cicd_service = CICDPredictionService()
simulation_engine = SimulationEngine()


# 1. Authentication Router
@router.post("/auth/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user_in.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# 2. Monitoring & Infrastructure Router
@router.get("/services", response_model=List[ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(Service).all()


@router.get("/nodes", response_model=List[NodeResponse])
def get_nodes(db: Session = Depends(get_db)):
    return db.query(Node).all()


@router.get("/pods", response_model=List[PodResponse])
def get_pods(db: Session = Depends(get_db)):
    return db.query(Pod).all()


@router.get("/deployments")
def get_deployments(db: Session = Depends(get_db)):
    return db.query(Deployment).order_by(Deployment.deployed_at.desc()).all()


# 3. AI / ML Intelligence Router
@router.get("/anomalies", response_model=List[AnomalyResponse])
def get_anomalies(db: Session = Depends(get_db)):
    return db.query(Anomaly).order_by(Anomaly.timestamp.desc()).limit(50).all()


@router.get("/predictions", response_model=List[PredictionResponse])
def get_predictions(db: Session = Depends(get_db)):
    return db.query(FailurePrediction).order_by(FailurePrediction.timestamp.desc()).limit(50).all()


@router.get("/ai/health")
async def get_ai_health():
    t0 = time.time()
    ollama_health = await ollama_provider.check_health()
    latency_ms = int((time.time() - t0) * 1000)

    return {
        "ollama": ollama_health["status"],
        "model": ollama_health.get("active_model", "phi:latest"),
        "provider": ollama_health["provider"],
        "slm_available": ollama_health.get("slm_available", False),
        "demo_mode": DEMO_MODE,
        "rag": "ready",
        "latency_ms": latency_ms
    }


@router.post("/ai/chat")
async def ai_copilot_chat(payload: dict, db: Session = Depends(get_db)):
    t0 = time.time()
    user_query = payload.get("message", "").strip()

    if not user_query:
        raise HTTPException(status_code=400, detail="Message prompt cannot be empty")

    # 1. Dynamically Build Live System Context
    system_context = ContextBuilder.build_system_context(db)

    # 2. Retrieve Relevant RAG Knowledge Sources
    rag_docs = rag_engine.retrieve_context(user_query, db, top_k=2)

    # 3. Construct System & User Prompt
    rag_str = "\n".join([f"- {d['title']}: {d['content']}" for d in rag_docs])
    full_system_prompt = f"{AIOPS_SYSTEM_PROMPT}\n\n{system_context}\n\nOPERATIONAL RUNBOOKS:\n{rag_str}"

    # 4. Invoke Dynamic Ollama SLM Inference
    llm_resp = await ollama_provider.generate(user_query, system_prompt=full_system_prompt)
    latency_ms = int((time.time() - t0) * 1000)

    if llm_resp:
        active_model = ollama_provider.active_model or ollama_provider._auto_detect_model()
        return {
            "response": llm_resp,
            "provider": "ollama",
            "model": active_model,
            "source": f"Ollama SLM ({active_model})",
            "rag_sources": rag_docs,
            "slm_available": True,
            "latency_ms": latency_ms
        }

    # 5. Dynamic Telemetry Summarizer Fallback (If Ollama server is offline)
    # Generates dynamic response based STRICTLY on current system context!
    dynamic_fallback = (
        f"Based on current cluster telemetry context:\n"
        f"{system_context}\n\n"
        f"Note: demo mode is active; this response is generated by a deterministic template from the verified system state, not by a language model."
    )
    return {
        "response": dynamic_fallback,
        "provider": "demo_template",
        "model": "None (demo mode)",
        "source": "Demo template (deterministic telemetry summary)",
        "rag_sources": rag_docs,
        "slm_available": False,
        "latency_ms": latency_ms
    }


@router.post("/ai/analyze")
def analyze_service_telemetry(payload: dict, db: Session = Depends(get_db)):
    svc_name = payload.get("service_name", "checkout-service")
    cpu = payload.get("cpu_usage", 25.0)
    memory = payload.get("memory_usage", 200.0)
    latency = payload.get("latency", 40.0)
    error_rate = payload.get("error_rate", 0.005)
    pod_restarts = payload.get("pod_restarts", 0)

    features = {
        "cpu_usage": cpu,
        "memory_usage": memory,
        "latency": latency,
        "error_rate": error_rate,
        "pod_restarts": pod_restarts
    }

    # Run complete ML pipeline
    anomaly_res = anomaly_detector.detect(features)
    failure_res = failure_predictor.predict(features)
    health_class = service_classifier.classify(features)
    overload_res = neuro_fuzzy_engine.evaluate_risk(features)

    # Save to database
    if anomaly_res["is_anomaly"]:
        anom_record = Anomaly(
            service_name=svc_name,
            metric_name="multi_variate_cpu_latency",
            metric_value=cpu,
            anomaly_score=anomaly_res["anomaly_score"],
            severity=anomaly_res["severity"],
            is_anomaly=True
        )
        db.add(anom_record)

    pred_record = FailurePrediction(
        service_name=svc_name,
        failure_probability=failure_res["failure_probability"],
        risk_level=failure_res["risk"],
        overload_risk_score=overload_res["overload_risk_score"],
        top_contributing_features=failure_res["top_contributing_features"]
    )
    db.add(pred_record)

    # Update Service status
    svc = db.query(Service).filter(Service.name == svc_name).first()
    if svc:
        svc.current_cpu_usage = cpu
        svc.current_memory_usage = memory
        svc.current_latency_ms = latency
        svc.current_error_rate = error_rate
        svc.health_status = health_class

    db.commit()

    return {
        "service_name": svc_name,
        "health_classification": health_class,
        "anomaly_detection": anomaly_res,
        "failure_prediction": failure_res,
        "neuro_fuzzy_overload_risk": overload_res
    }


# 4. Incident Management & RCA Router
@router.get("/incidents", response_model=List[IncidentResponse])
def get_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.detected_at.desc()).all()


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident_by_id(incident_id: int, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@router.post("/incidents/{incident_id}/analyze")
def trigger_incident_rca_and_slm(incident_id: int, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    svc = db.query(Service).filter(Service.name == inc.service_name).first()
    metrics = {
        "cpu_usage": svc.current_cpu_usage if svc else 88.0,
        "memory_usage": svc.current_memory_usage if svc else 450.0,
        "latency": svc.current_latency_ms if svc else 380.0,
        "error_rate": svc.current_error_rate if svc else 0.08,
        "pod_restarts": SimulationState().restarts.get(inc.service_name, 0)
    }

    recent_deps = db.query(Deployment).filter(Deployment.service_name == inc.service_name).all()
    dep_payloads = [{"service_name": d.service_name, "version": d.version} for d in recent_deps]

    # Execute Hybrid RCA Engine
    rca_res = rca_engine.analyze_incident(inc.service_name, metrics, recent_deployments=dep_payloads)

    # RAG Retrieval
    rag_docs = rag_engine.retrieve_context(f"{inc.service_name} {rca_res['probable_root_cause']}", db, top_k=2)

    # SLM Generation
    slm_out = slm_assistant.generate_explanation_and_remediation(
        inc.incident_code, inc.service_name, rca_res["probable_root_cause"], rca_res["evidence_summary"], rag_docs
    )

    # Save RCA result
    existing_rca = db.query(RCAResult).filter(RCAResult.incident_id == inc.id).first()
    if existing_rca:
        existing_rca.probable_root_cause = rca_res["probable_root_cause"]
        existing_rca.confidence_score = rca_res["confidence_score"]
        existing_rca.evidence_summary = rca_res["evidence_summary"]
        existing_rca.slm_explanation = slm_out["slm_explanation"]
        existing_rca.suggested_fix = slm_out["suggested_remediation"]["reason"]
    else:
        new_rca = RCAResult(
            incident_id=inc.id,
            probable_root_cause=rca_res["probable_root_cause"],
            confidence_score=rca_res["confidence_score"],
            evidence_summary=rca_res["evidence_summary"],
            slm_explanation=slm_out["slm_explanation"],
            suggested_fix=slm_out["suggested_remediation"]["reason"]
        )
        db.add(new_rca)

    db.commit()

    return {
        "incident_id": inc.id,
        "incident_code": inc.incident_code,
        "metrics": metrics,
        "rca": rca_res,
        "rag_retrieved_documents": rag_docs,
        "slm_analysis": slm_out
    }


# 5. Remediation Engine Router
@router.get("/remediation/actions", response_model=List[RemediationResponse])
def get_remediations(db: Session = Depends(get_db)):
    return db.query(RemediationAction).order_by(RemediationAction.created_at.desc()).all()


@router.post("/remediation/create", response_model=RemediationResponse)
def create_remediation_action(req: RemediationRequest, db: Session = Depends(get_db)):
    return remediation_engine.create_remediation(
        db=db,
        service_name=req.service_name,
        action_type=req.action_type,
        target_resource=req.target_resource,
        parameters=req.parameters,
        user_role=req.user_role,
        incident_id=req.incident_id,
        risk_level=req.risk_level
    )


@router.post("/remediation/{remediation_id}/execute")
def execute_remediation(remediation_id: int, user_name: str = "DevOps Lead", user_role: str = "DevOps", db: Session = Depends(get_db)):
    res = remediation_engine.execute_remediation(db, remediation_id, approved_by_user=user_name, user_role=user_role)
    return res


# 6. Cloud Cost & CI/CD Intelligence Router
@router.get("/costs", response_model=List[CostResponse])
def get_cloud_costs(db: Session = Depends(get_db)):
    return cost_service.analyze_cost_anomalies(db)


@router.get("/cicd/predictions")
def get_cicd_predictions(db: Session = Depends(get_db)):
    return cicd_service.evaluate_pipeline_runs(db)


# 7. Simulation Subsystem Endpoints
@router.get("/simulation/status")
def get_simulation_status():
    return simulation_engine.get_status()


def _open_incident(db: Session, scenario: str, svc_name: str):
    """Apply the effect of a failure scenario to the demo database and open an incident for it."""
    scenario = scenario.lower()
    svc = db.query(Service).filter(Service.name == svc_name).first()
    if not svc:
        svc = db.query(Service).first()
        svc_name = svc.name if svc else svc_name
    if not svc:
        return None

    state = SimulationState()
    if scenario in ["cpu_spike", "cpu_saturation"]:
        svc.current_cpu_usage, svc.current_latency_ms, svc.current_error_rate = 94.5, 420.0, 0.08
        title, severity = f"CPU Saturation & Latency Spike on {svc_name}", "HIGH"
        summary = f"Synthetic CPU overload simulation triggered on {svc_name}."
    elif scenario == "memory_leak":
        svc.current_memory_usage, svc.current_error_rate = 920.0, 0.12
        state.restarts[svc_name] = 3
        title, severity = f"Pod OOMKilled Memory Leak on {svc_name}", "CRITICAL"
        summary = "Memory footprint reached 920MB triggering memory leak alarm."
    elif scenario in ["pod_crash", "crash_loop"]:
        svc.current_error_rate = 0.25
        state.restarts[svc_name] = 6
        title, severity = f"Pod CrashLoopBackOff on {svc_name}", "CRITICAL"
        summary = "Pod instance crashed repeatedly with exit code 137."
    else:
        db.commit()
        return None

    svc.health_status = "CRITICAL"
    n = db.query(Incident).count() + 1000
    while db.query(Incident).filter(Incident.incident_code == f"INC-{n}").first():
        n += 1
    code = f"INC-{n}"
    inc = Incident(
        incident_code=code,
        title=title,
        service_id=svc.id,
        service_name=svc_name,
        severity=severity,
        status="OPEN",
        summary=summary
    )
    db.add(inc)
    db.commit()
    return inc


@router.post("/simulation/start")
def start_simulation(payload: dict, db: Session = Depends(get_db)):
    sc_name = payload.get("scenario", "cpu_saturation")
    target_svc = payload.get("target_service", "checkout-service")
    duration = payload.get("duration_seconds", 60)
    intensity = payload.get("intensity", 0.7)
    status_ = simulation_engine.start_scenario(sc_name, target_svc, duration, intensity)
    _open_incident(db, sc_name, target_svc)
    return status_


@router.post("/simulation/pause")
def pause_simulation():
    return simulation_engine.pause_scenario()


@router.post("/simulation/resume")
def resume_simulation():
    return simulation_engine.resume_scenario()


@router.post("/simulation/reset")
def reset_simulation():
    return simulation_engine.reset_system()


@router.post("/simulation/trigger")
def trigger_simulation(req: SimulationRequest, db: Session = Depends(get_db)):
    svc_name = req.service_name
    scenario = req.scenario.lower()

    # Start simulation scenario in simulation engine and open the matching incident
    simulation_engine.start_scenario(scenario, target_service=svc_name)
    _open_incident(db, scenario, svc_name)
    return {"message": f"Simulation scenario '{scenario}' successfully triggered on {svc_name}."}
