# AegisOps: AI-Powered Cloud and Kubernetes Monitoring (Static Demo)

> **AegisOps is a static, simulation-only demo.** There is no backend. The telemetry, the Kubernetes cluster, the
> incident workflow and the machine learning models all run inside the browser page, and nothing is sent anywhere.
> The language model is replaced by a deterministic template. It shows how an AIOps workflow fits together; it does
> not monitor or change any real infrastructure.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in frontend/dist
```

## Deploy to Cloudflare Pages

| Setting | Value |
|---|---|
| Framework preset | None (or Vite) |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |

No environment variables and no server are needed.

## What the demo shows

```text
OBSERVE  -> simulated telemetry of 5 microservices (CPU, memory, latency, errors, restarts)
UNDERSTAND -> Isolation Forest anomaly detection
PREDICT  -> Random Forest failure probability + Random Forest health class + fuzzy overload risk
INVESTIGATE -> root cause analysis (metric, deployment and dependency evidence)
EXPLAIN  -> runbook retrieval + explanation (demo template)
DECIDE   -> Prolog-style policy table: ALLOW / REQUIRE_APPROVAL / DENY by role, action and risk
ACT      -> simulated scale / restart / rollback
VERIFY   -> recovery checked from the service telemetry after the action
```

Then follow [DEMO.md](DEMO.md).

## How the static version works

| Part | File |
|---|---|
| In-browser "backend": simulation, scenarios, incidents, RCA, policy, remediation, copilot | `frontend/src/demo/engine.js` |
| Model inference (Isolation Forest, two Random Forests, fuzzy engine) | `frontend/src/demo/ml.js` |
| Trained scikit-learn trees exported to JSON (0.75 MB) | `frontend/src/demo/models.json` |
| Request interception: `fetch('/api/v1/...')` is answered locally | `installDemoApi()` in `engine.js`, called from `main.jsx` |

The models were trained in Python (`ml/`) and exported with `python scripts/export_models.py`; the JavaScript
versions give the same outputs as scikit-learn on 300 random test samples. The Python backend (`backend/`) is kept
as the reference implementation and for the unit tests (`pytest`, 18 tests); the website does not use it.

## Measured model results (synthetic data, held-out seeds)

| Model | Test data | Result |
|---|---|---|
| Isolation Forest | 950 normal + 50 anomalous samples | accuracy 100 % |
| Failure predictor | 1000 samples | accuracy 94.1 %, F1 0.939, ROC-AUC 0.989 |
| Health classifier | 1000 samples, 3 classes | accuracy 99.9 % |

The labels of the synthetic data follow fixed rules, so these figures show that the models recover those rules,
not how they would perform on real production telemetry.

## Demo behaviour

- Failure scenarios (CPU saturation, memory leak, pod crash loop, traffic surge, network latency, cascading
  failure) are started from Simulation Controls. CPU, memory and crash scenarios also open an incident.
- A remediation is evaluated for the selected role and risk; `DENY` actions cannot be executed and
  `REQUIRE_APPROVAL` actions can be approved only by an Admin or DevOps user.
- Recovery is verified by re-reading the (simulated) service telemetry after the action.
- Cost anomalies use a simple rule (more than $200 per day). Reset Simulation restores the baseline.

## Stack

React 18, Vite, Tailwind CSS, Recharts. Models: scikit-learn (training only).
