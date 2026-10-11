# System Architecture & Technical Specifications

## 1. System Architecture Overview

The AIOps Platform operates as a closed-loop intelligent control plane for cloud-native Kubernetes environments.

```text
+-------------------------------------------------------------------------+
|                         OBSERVE & COLLECT                               |
|   Prometheus • kube-state-metrics • cAdvisor • Loki Logs • OpenTelemetry |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                         FEATURE & DATA ENGINE                           |
|      Min-Max Normalization • Sliding Window Metrics • Event Pipelines   |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                         INTELLIGENT ANALYSIS                            |
|  Isolation Forest (Anomaly) • Random Forest (Failure) • Fuzzy Risk |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                     INVESTIGATION & EXPLANATION                         |
|   Hybrid RCA Engine • Runbook Retrieval (RAG) • SLM Assistant (demo template)|
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                         DECISION & SAFETY                               |
|        Prolog-style Declarative Policy Engine (ALLOW / DENY / APPROVE)        |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                        REMEDIATION & RECOVERY                           |
|       Kubernetes API Scaling • Pod Restarts • Recovery Verification     |
+-------------------------------------------------------------------------+
```

---

## 2. Mermaid Diagrams Matrix

### Diagram 1: Overall System Architecture
```mermaid
graph TD
    K8s[Kubernetes Minikube Cluster] -->|Telemetry| Prom[Prometheus Collector]
    K8s -->|Logs| Loki[Loki Log Aggregator]
    
    Prom --> FastAPI[FastAPI Backend Core]
    Loki --> FastAPI
    
    subgraph AI/ML Engine
        FastAPI --> IF[Isolation Forest]
        FastAPI --> RF[Random Forest Predictor]
        FastAPI --> NF[Fuzzy Overload Risk]
    end
    
    subgraph RCA & SLM Assistant
        IF & RF --> RCA[Hybrid RCA Engine]
        RCA --> RAG[Runbook Store]
        RAG --> SLM[SLM Assistant (demo template)]
    end
    
    subgraph Safety & Execution
        SLM --> Policy[Prolog-style Policy Engine]
        Policy --> K8sExec[K8s Remediation Executor]
        K8sExec --> K8s
    end
    
    FastAPI -->|WebSockets| React[React Vite Dashboard]
```

### Diagram 2: Component Architecture
```mermaid
graph LR
    API[FastAPI Router] --> ServiceLayer[Service & Processing Layer]
    ServiceLayer --> MLLayer[ML Inference Layer]
    ServiceLayer --> RCALayer[RCA & Evidence Layer]
    ServiceLayer --> SecurityLayer[JWT & Policy Security]
    ServiceLayer --> DBLayer[SQLAlchemy ORM + SQLite/Postgres]
    ServiceLayer --> K8sLayer[Kubernetes Python Adapter]
```

### Diagram 3: Deployment Architecture
```mermaid
graph TD
    User([DevOps / Admin User]) --> UI[React Frontend - Port 3000]
    UI -->|REST / WebSockets| API[FastAPI Backend - Port 8000]
    API --> DB[(PostgreSQL / SQLite)]
    API --> Redis[(Redis Event Broker)]
    API --> Ollama[Ollama SLM Service - Port 11434]
    API --> K8sAPI[Kubernetes Control Plane]
```

### Diagram 4: DFD Level 0 (Context Diagram)
```mermaid
graph TD
    Admin([DevOps Engineer]) -->|Triggers Remediation / Views UI| AIOps[AIOps System]
    K8sEnv([Kubernetes Infrastructure]) -->|Metrics & Logs| AIOps
    AIOps -->|Automated Scaling & Restarts| K8sEnv
    AIOps -->|Incident Alerts & Explanations| Admin
```

### Diagram 5: DFD Level 1 (Data Flow Diagram)
```mermaid
graph TD
    P1[1. Telemetry Processing] -->|Normalized Features| P2[2. Anomaly & Failure Prediction]
    P2 -->|Incident Alerts| P3[3. Hybrid RCA Engine]
    P3 -->|Evidence Context| P4[4. SLM & RAG Explanation]
    P4 -->|Action Recommendation| P5[5. Policy Authorization Engine]
    P5 -->|Authorized Command| P6[6. K8s Remediation Execution]
```

### Diagram 6: ML Pipeline Architecture
```mermaid
graph LR
    RawData[Raw Metrics] --> FeatureEng[Feature Extraction]
    FeatureEng --> AnomalyMod[Isolation Forest]
    FeatureEng --> FailureMod[Random Forest Failure Predictor]
    FeatureEng --> ClassMod[Service Health Classifier]
    FeatureEng --> FuzzyMod[Fuzzy Overload Risk]
    AnomalyMod & FailureMod & ClassMod & FuzzyMod --> ConsolidatedRisk[Consolidated Risk Matrix]
```

### Diagram 7: Root Cause Analysis (RCA) Workflow
```mermaid
graph TD
    Inc[Incident Event] --> EvCollect[Multi-Modal Evidence Collector]
    EvCollect --> MetEv[Metric Spikes]
    EvCollect --> LogEv[Log Error Traces]
    EvCollect --> DepEv[CI/CD Deployment Events]
    EvCollect --> PodEv[Pod Restart Counts]
    MetEv & LogEv & DepEv & PodEv --> DepGraph[Dependency Graph Traversal]
    DepGraph --> Rank[Ranked Root Causes]
```

### Diagram 8: SLM & RAG Workflow
```mermaid
graph TD
    Incident --> Query[Build Search Query]
    Query --> Chroma[Runbook Retrieval]
    Chroma --> Context[Construct Prompt Context]
    Context --> SLM[Ollama SLM Engine]
    SLM --> Output[Structured Human Explanation]
```

### Diagram 9: Kubernetes Monitoring Flow
```mermaid
graph TD
    Pod[Pod Containers] --> cAdvisor[cAdvisor Engine]
    cAdvisor --> Prom[Prometheus Server]
    K8sState[kube-state-metrics] --> Prom
    Prom --> Backend[AIOps Collector]
```

### Diagram 10: Self-Healing Lifecycle
```mermaid
graph TD
    Detect[Failure Detected] --> PolicyCheck{Prolog-style Policy Check}
    PolicyCheck -->|ALLOW| Exec[Execute K8s Action]
    PolicyCheck -->|REQUIRE_APPROVAL| Approval[Human DevOps Approval]
    Approval -->|Approved| Exec
    Exec --> Verify{Recovery Verification}
    Verify -->|Healthy| Resolve[Resolve Incident]
    Verify -->|Unhealthy| Escalation[Escalate Alert]
```

### Diagram 11: Predictive Auto-Scaling Workflow
```mermaid
graph TD
    Metrics[Telemetry Stream] --> Predictor[Random Forest Predictor]
    Predictor -->|CPU > 85% Predicted| TriggerScale[Trigger Auto-Scale]
    TriggerScale --> Policy[Policy Check]
    Policy --> ScaleOut[K8s HPA / Replica Patch]
```

### Diagram 12: CI/CD Pipeline Failure Prediction
```mermaid
graph TD
    Commit[Git Commit] --> CI[CI/CD Build]
    CI --> FeatureExtractor[Build Duration & Test Ratio]
    FeatureExtractor --> ML[Failure Risk Predictor]
    ML -->|Risk > 60%| Flag[Flag Deployment Risk]
```

### Diagram 13: Cloud Cost Intelligence Workflow
```mermaid
graph TD
    CostData[Cloud Provider Cost Data] --> Normalize[Normalize AWS/GCP/Azure Data]
    Normalize --> IsoForest[Isolation Forest Cost Anomaly]
    IsoForest --> Alert[Cost Spike Alert & Optimization]
```

### Diagram 14: Authentication & Security Architecture
```mermaid
graph TD
    User[Client Application] -->|Login Credentials| Auth[FastAPI Auth Router]
    Auth -->|Validate Hash| DB[(User DB)]
    Auth -->|Generate| JWT[Signed JWT Bearer Token]
    User -->|Bearer Token| ProtectedAPI[Protected API Endpoint]
    ProtectedAPI -->|Verify Signature & Role| Execution[Authorize Request]
```

### Diagram 15: Entity Relationship (ER) Diagram
```mermaid
erDiagram
    USERS ||--o{ AUDIT_LOGS : creates
    SERVICES ||--o{ PODS : contains
    SERVICES ||--o{ INCIDENTS : experiences
    INCIDENTS ||--o{ INCIDENT_EVIDENCES : collects
    INCIDENTS ||--|| RCA_RESULTS : generates
    INCIDENTS ||--o{ REMEDIATION_ACTIONS : triggers
```

### Diagram 16: Database Architecture
```mermaid
graph TD
    App[FastAPI SQLAlchemy] --> Tables[Users • Services • Nodes • Pods • Metrics • Anomalies • Predictions • Incidents • Evidences • RCA • Remediations • Costs • AuditLogs]
    Tables --> Driver[(PostgreSQL / SQLite)]
```

### Diagram 17: Incident Lifecycle State Machine
```mermaid
stateDiagram-v2
    [*] --> OPEN: Anomaly Detected
    OPEN --> INVESTIGATING: RCA & SLM Triggered
    INVESTIGATING --> MITIGATED: Remediation Executed
    MITIGATED --> RESOLVED: Telemetry Recovery Verified
    RESOLVED --> [*]
```

### Diagram 18: End-to-End Sequence Diagram
```mermaid
sequenceDiagram
    participant K8s as Kubernetes
    participant Prom as Prometheus
    participant Backend as FastAPI
    participant ML as ML Engine
    participant SLM as SLM/RAG Assistant
    participant Policy as Policy Engine
    participant UI as React Dashboard

    Prom->>Backend: Telemetry Stream (CPU 94.5%)
    Backend->>ML: Run Anomaly & Failure Prediction
    ML-->>Backend: Anomaly Score = 0.91 (HIGH)
    Backend->>UI: Broadcast WebSocket Alert
    Backend->>SLM: Analyze Incident & Retrieve Runbook
    SLM-->>Backend: Explanation & Scale Recommendation
    Backend->>Policy: Evaluate Action (SCALE_DEPLOYMENT)
    Policy-->>Backend: ALLOW
    Backend->>K8s: Patch Deployment Scale (2 to 4)
    K8s-->>Backend: Scaled Successfully
    Backend->>UI: Broadcast Telemetry Recovery Verified
```
