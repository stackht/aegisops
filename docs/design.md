# AIOps Control Center — Product & Design Specification

> **Philosophy:** A minimal, technical, premium observability console designed for infrastructure control room operations. Emphasizes information density, evidence-driven root cause analysis, status-driven semantics, and continuous real-time feedback.

---

## 1. Design Principles

1. **Information Density without Noise:** Clean technical layout built for observability engineers. No decorative bloat, giant cards, or heavy gradients.
2. **Status-Driven Color Palette:** Restrained dark base (`#080B10`, `#0D121A`). Color is reserved strictly for operational state: Green (`#22C55E` - Healthy), Amber (`#F59E0B` - Warning), Red (`#EF4444` - Critical), Blue (`#3B82F6` - Info), Purple (`#A78BFA` - AI/Inference).
3. **Monospace for Telemetry & Identifiers:** All telemetry metrics, pod names, timestamps, incident IDs, model confidence scores, and API paths use `JetBrains Mono` / `ui-monospace`.
4. **Contextual Master-Detail Layouts:** Incidents, topology nodes, and remediation actions open contextual inspector drawers rather than redirecting to disconnected pages.
5. **Real-time First (WebSocket Driven):** All telemetry curves, incident states, and simulation clocks react directly to backend event streams.

---

## 2. Color System & Design Tokens

```text
Base Background:       #080B10
Surface Card:          #0D121A
Elevated Surface:      #111823
Subtle Border:         rgba(255, 255, 255, 0.08)
Primary Text:          #F3F5F7
Secondary Text:        #8B95A5
Muted Text:            #596474

Status Colors:
Healthy / Success:     #22C55E
Warning / Medium:      #F59E0B
Critical / High Risk:  #EF4444
Informational / Blue:  #3B82F6
AI / Inference:        #A78BFA
```

---

## 3. Typography System

- **Primary UI Font:** `Inter`, `Geist Sans`, `system-ui`
- **Technical Metrics Font:** `JetBrains Mono`, `ui-monospace`
- **Font Scale:**
  - Headers: 18px / 20px (Bold)
  - Section Titles: 14px (Semi-Bold)
  - Body Text: 12px / 13px (Regular)
  - Micro / Labels: 10px / 11px (Monospace)

---

## 4. Layout & AppShell

- **Top System Status Bar:** Displays global indicators (`● SIMULATION`, K8s Status, ML Engine, SLM Status, WebSocket Link) and Command Palette shortcut (`Ctrl + K`).
- **Collapsible Sidebar:** Navigation tabs with crisp Lucide icons and active indicator states.
- **Main Workspace:** Adaptive grid layouts (1920×1080, 1440×900, 1366×768 responsive support).

---

## 5. Simulation System Architecture

The simulation engine operates entirely on the backend (`backend/simulation/`):
- **Operating Modes:** `LIVE` (real Prometheus/K8s telemetry) vs `SIMULATION` (deterministic synthetic telemetry scenarios).
- **Scenarios:** CPU Saturation, Pod Memory Leak (OOMKilled), Pod CrashLoopBackOff, Traffic Spike, Network Latency, and Cascading Microservice Failure.
- **Controls:** Start, Pause, Resume, Stop, Reset to Healthy Baseline.

---

## 6. Incident State Machine

```text
NORMAL → ANOMALY → PREDICTED → INCIDENT_OPEN → INVESTIGATING → RCA_COMPLETE → RECOMMENDATION → APPROVAL → REMEDIATING → VERIFYING → RESOLVED
```

---

## 7. AI & SLM Integration

- **LLM Provider Abstraction:** Configurable provider interface (`OllamaProvider`, `OptionalCloudProvider`).
- **Endpoints:**
  - `GET /api/v1/ai/health`: Returns SLM status, model name, RAG readiness, and round-trip latency.
  - `POST /api/v1/ai/chat`: Accepts natural language query + incident context, queries RAG vector store, invokes SLM, and returns evidence-backed copilot response with citations.
- **Fallback:** Automatic deterministic response generation if Ollama is unreachable.
