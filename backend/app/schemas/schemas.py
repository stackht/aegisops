from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime


# User & Auth Schemas
class UserBase(BaseModel):
    username: str
    email: str
    role: str = "DevOps"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# Infrastructure & Services
class ServiceBase(BaseModel):
    name: str
    namespace: str = "default"
    health_status: str = "HEALTHY"
    current_cpu_usage: float = 0.0
    current_memory_usage: float = 0.0
    current_latency_ms: float = 0.0
    current_error_rate: float = 0.0
    replicas_desired: int = 2
    replicas_ready: int = 2


class ServiceResponse(ServiceBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True


class PodResponse(BaseModel):
    id: int
    name: str
    namespace: str
    service_id: Optional[int] = None
    node_name: str
    status: str
    restart_count: int
    cpu_usage_pct: float
    memory_usage_mb: float

    class Config:
        from_attributes = True


class NodeResponse(BaseModel):
    id: int
    name: str
    status: str
    cpu_capacity_cores: float
    memory_capacity_bytes: float
    cpu_usage_pct: float
    memory_usage_pct: float

    class Config:
        from_attributes = True


# Monitoring & Telemetry
class MetricItem(BaseModel):
    service_name: str
    metric_name: str
    value: float
    timestamp: Optional[datetime] = None
    labels: Optional[Dict[str, Any]] = None


# Anomaly & Prediction Schemas
class AnomalyResponse(BaseModel):
    id: int
    timestamp: datetime
    service_name: str
    metric_name: str
    metric_value: float
    anomaly_score: float
    severity: str
    is_anomaly: bool
    details: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class PredictionResponse(BaseModel):
    id: int
    timestamp: datetime
    service_name: str
    failure_probability: float
    risk_level: str
    overload_risk_score: float
    top_contributing_features: List[Any] = []

    class Config:
        from_attributes = True


# Incident & RCA Schemas
class IncidentEvidenceSchema(BaseModel):
    id: int
    evidence_type: str
    source: str
    description: str
    payload: Dict[str, Any]
    timestamp: datetime

    class Config:
        from_attributes = True


class RCAResultSchema(BaseModel):
    id: int
    probable_root_cause: str
    confidence_score: float
    evidence_summary: str
    slm_explanation: Optional[str] = None
    suggested_fix: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentResponse(BaseModel):
    id: int
    incident_code: str
    title: str
    service_name: str
    severity: str
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    summary: Optional[str] = None
    evidences: List[IncidentEvidenceSchema] = []
    rca_result: Optional[RCAResultSchema] = None

    class Config:
        from_attributes = True


# Remediation Action
class RemediationRequest(BaseModel):
    service_name: str
    action_type: str  # SCALE_DEPLOYMENT, RESTART_POD, ROLLBACK_DEPLOYMENT
    target_resource: str
    parameters: Dict[str, Any] = {}
    incident_id: Optional[int] = None
    user_role: str = "DevOps"
    risk_level: str = "LOW"


class RemediationResponse(BaseModel):
    id: int
    incident_id: Optional[int] = None
    service_name: str
    action_type: str
    target_resource: str
    parameters: Dict[str, Any]
    risk_level: str
    status: str
    policy_decision: str
    approved_by: Optional[str] = None
    executed_at: Optional[datetime] = None
    verification_result: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Cloud Cost
class CostResponse(BaseModel):
    id: int
    provider: str
    service_name: str
    resource_id: str
    daily_cost: float
    currency: str
    is_anomaly: bool
    anomaly_score: float
    recorded_date: datetime

    class Config:
        from_attributes = True


# Simulation Trigger
class SimulationRequest(BaseModel):
    scenario: str  # cpu_spike, memory_leak, pod_crash, network_latency, deployment_failure, cascading_failure
    service_name: str = "checkout-service"
    duration_seconds: int = 60
