# REST & WebSockets API Documentation

## Base URL
`http://localhost:8000/api/v1`

---

## 1. Authentication Endpoints

### `POST /auth/register`
Register a new user account.
- **Request Body:**
```json
{
  "username": "devops_john",
  "email": "john@aiops.local",
  "password": "password123",
  "role": "DevOps"
}
```

### `POST /auth/login`
Authenticate user and retrieve JWT access token.
- **Form Data:** `username`, `password`
- **Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": { "id": 1, "username": "admin", "role": "Admin" }
}
```

---

## 2. Infrastructure & Telemetry

### `GET /services`
List monitored Kubernetes microservices and their health status.

### `GET /nodes`
List cluster nodes, CPU capacity, and memory usage.

### `GET /pods`
List active pod instances, node assignments, and restart counts.

---

## 3. AI / ML Intelligence Endpoints

### `GET /anomalies`
Fetch recent anomaly detection records.

### `GET /predictions`
Fetch failure prediction outputs.

### `POST /ai/analyze`
Submit raw service telemetry for full ML pipeline analysis (Anomaly Detection, Failure Prediction, Health Classification & Fuzzy Risk).
- **Request Body:**
```json
{
  "service_name": "checkout-service",
  "cpu_usage": 94.5,
  "memory_usage": 520.0,
  "latency": 380.0,
  "error_rate": 0.08,
  "pod_restarts": 4
}
```

---

## 4. Incident & RCA Endpoints

### `GET /incidents`
Fetch all recorded system incidents.

### `POST /incidents/{id}/analyze`
Trigger Hybrid RCA Engine analysis, runbook retrieval, and Ollama SLM incident explanation generation.

---

## 5. Remediation Endpoints

### `GET /remediation/actions`
List all proposed, approved, and executed remediation actions.

### `POST /remediation/{id}/execute`
Execute policy-approved remediation action (Kubernetes scaling / pod restart) and run recovery verification.

---

## 6. Simulation & WebSockets

### `POST /simulation/trigger`
Trigger synthetic failure scenarios (`cpu_spike`, `memory_leak`, `pod_crash`) and open the matching incident.

### `WebSocket /ws/monitoring`
Real-time telemetry and incident stream broadcasting every 3 seconds.

---

## 7. Demo-mode notes (current build)

- `POST /remediation/create` accepts `user_role` (Admin, DevOps, Developer, Viewer) and `risk_level` (LOW, HIGH). The policy
  decision and the initial status (APPROVED, PENDING_APPROVAL or DENIED) follow from them.
- `POST /remediation/{id}/execute?user_role=...` refuses DENIED actions and refuses REQUIRE_APPROVAL actions unless the role is
  Admin or DevOps. Supported actions: `SCALE_DEPLOYMENT`, `RESTART_POD`, `ROLLBACK_DEPLOYMENT` (simulated). The result
  contains a verification message computed from the service telemetry after the action; the status is `SUCCESS` only if
  the service is back within healthy limits.
- `POST /simulation/start` and `POST /simulation/trigger` both start the scenario and open the matching incident.
- `GET /ai/health` reports `demo_mode`. The WebSocket payload contains `ai_summary` with live model outputs per service.
