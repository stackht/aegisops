import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
import enum
from backend.app.database.connection import Base


class HealthStatus(str, enum.Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"


class SeverityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    MITIGATED = "MITIGATED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class RemediationStatus(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTING = "EXECUTING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


# User & Auth Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="DevOps")  # Admin, DevOps, Developer, Viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="user")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    permissions = Column(JSON, default=list)


# Infrastructure & Service Models
class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    namespace = Column(String(50), default="default")
    health_status = Column(String(20), default="HEALTHY")
    current_cpu_usage = Column(Float, default=0.0)
    current_memory_usage = Column(Float, default=0.0)
    current_latency_ms = Column(Float, default=0.0)
    current_error_rate = Column(Float, default=0.0)
    replicas_desired = Column(Integer, default=2)
    replicas_ready = Column(Integer, default=2)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    pods = relationship("Pod", back_populates="service")
    incidents = relationship("Incident", back_populates="service")


class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    status = Column(String(20), default="Ready")
    cpu_capacity_cores = Column(Float, default=4.0)
    memory_capacity_bytes = Column(Float, default=16106127360.0)
    cpu_usage_pct = Column(Float, default=25.0)
    memory_usage_pct = Column(Float, default=40.0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class Pod(Base):
    __tablename__ = "pods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    namespace = Column(String(50), default="default")
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    node_name = Column(String(100), default="minikube-node-1")
    status = Column(String(30), default="Running")
    restart_count = Column(Integer, default=0)
    cpu_usage_pct = Column(Float, default=10.0)
    memory_usage_mb = Column(Float, default=128.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    service = relationship("Service", back_populates="pods")


class KubernetesResource(Base):
    __tablename__ = "kubernetes_resources"

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(50), nullable=False)  # Deployment, Pod, Service, HPA, ConfigMap
    name = Column(String(100), nullable=False)
    namespace = Column(String(50), default="default")
    status_summary = Column(Text, nullable=True)
    spec_json = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


# Monitoring & Metric Telemetry
class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_name = Column(String(100), index=True, nullable=False)
    metric_name = Column(String(50), nullable=False)  # cpu_usage, memory_usage, request_rate, latency, error_rate
    value = Column(Float, nullable=False)
    labels = Column(JSON, default=dict)


# AI/ML & Incident Models
class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_name = Column(String(100), index=True, nullable=False)
    metric_name = Column(String(50), nullable=False)
    metric_value = Column(Float, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    severity = Column(String(20), default="MEDIUM")
    is_anomaly = Column(Boolean, default=True)
    details = Column(JSON, default=dict)


class FailurePrediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_name = Column(String(100), index=True, nullable=False)
    failure_probability = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    overload_risk_score = Column(Float, default=0.0)
    top_contributing_features = Column(JSON, default=list)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_code = Column(String(30), unique=True, index=True, nullable=False)  # e.g., INC-1001
    title = Column(String(255), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    service_name = Column(String(100), index=True, nullable=False)
    severity = Column(String(20), default="HIGH")
    status = Column(String(20), default="OPEN")  # OPEN, INVESTIGATING, MITIGATED, RESOLVED
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)

    service = relationship("Service", back_populates="incidents")
    evidences = relationship("IncidentEvidence", back_populates="incident")
    rca_result = relationship("RCAResult", back_populates="incident", uselist=False)
    remediations = relationship("RemediationAction", back_populates="incident")


class IncidentEvidence(Base):
    __tablename__ = "incident_evidences"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False)  # METRIC_SPIKE, LOG_ERROR, POD_RESTART, DEPLOYMENT_EVENT, TRACE_SPAN
    source = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    payload = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="evidences")


class RCAResult(Base):
    __tablename__ = "rca_results"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, unique=True)
    probable_root_cause = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.85)
    evidence_summary = Column(Text, nullable=False)
    slm_explanation = Column(Text, nullable=True)
    suggested_fix = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="rca_result")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    service_name = Column(String(100), nullable=False)
    severity = Column(String(20), default="MEDIUM")
    message = Column(Text, nullable=False)
    channel = Column(String(50), default="WEBHOOK")  # WEBHOOK, EMAIL, TELEGRAM
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)


class RemediationAction(Base):
    __tablename__ = "remediation_actions"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    service_name = Column(String(100), nullable=False)
    action_type = Column(String(50), nullable=False)  # SCALE_DEPLOYMENT, RESTART_POD, ROLLBACK_DEPLOYMENT
    target_resource = Column(String(100), nullable=False)
    parameters = Column(JSON, default=dict)
    risk_level = Column(String(20), default="LOW")
    status = Column(String(30), default="PENDING_APPROVAL")  # PENDING_APPROVAL, APPROVED, REJECTED, EXECUTING, SUCCESS, FAILED
    policy_decision = Column(String(20), default="ALLOW")  # ALLOW, DENY, REQUIRE_APPROVAL
    approved_by = Column(String(100), nullable=True)
    executed_at = Column(DateTime, nullable=True)
    verification_result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="remediations")


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    deployed_by = Column(String(100), default="ci-cd-bot")
    deployed_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="SUCCESS")  # SUCCESS, FAILED, IN_PROGRESS


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_name = Column(String(100), nullable=False)
    commit_sha = Column(String(40), nullable=False)
    branch = Column(String(50), default="main")
    build_duration_sec = Column(Float, default=120.0)
    tests_passed = Column(Integer, default=45)
    tests_failed = Column(Integer, default=0)
    failure_probability = Column(Float, default=0.05)
    risk_assessment = Column(String(20), default="LOW")
    status = Column(String(30), default="SUCCESS")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class CloudCost(Base):
    __tablename__ = "cloud_costs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(20), default="AWS")  # AWS, Azure, GCP, Mock
    service_name = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=False)
    daily_cost = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    recorded_date = Column(DateTime, default=datetime.datetime.utcnow)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), default="RUNBOOK")  # RUNBOOK, K8S_DOC, INCIDENT_HISTORY
    content = Column(Text, nullable=False)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), default="system")
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
