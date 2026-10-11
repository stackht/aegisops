# AegisOps: AI-Powered Cloud and Kubernetes Monitoring (Demo Build)

> **AegisOps is a demonstration project.** All telemetry is synthetic, the Kubernetes cluster is simulated and the
> language model is replaced by a deterministic template (`DEMO_MODE=true`, the default). It shows how an AIOps
> workflow fits together; it does not monitor or change any real infrastructure.

## What the demo shows

```text
OBSERVE  -> simulated telemetry of 5 microservices (CPU, memory, latency, errors, restarts)
UNDERSTAND -> Isolation Forest anomaly detection
PREDICT  -> Random Forest failure probability + Random Forest health class + fuzzy overload risk
INVESTIGATE -> Root cause analysis (metric, deployment and dependency evidence)
EXPLAIN  -> runbook retrieval + explanation (demo template)
DECIDE   -> Prolog-style policy table: ALLOW / REQUIRE_APPROVAL / DENY by role, action and risk
ACT      -> simulated scale / restart / rollback
VERIFY   -> recovery checked from the service telemetry after the action
```

## Techniques and where they live

| Stage | Technique | File |
|---|---|---|
| Anomaly detection | Isolation Forest, calibrated 0 to 1 score (0.5 = model threshold) | `ml/anomaly_detection/isolation_forest.py` |
| Failure prediction | Random Forest (100 trees, 7 features) | `ml/failure_prediction/failure_predictor.py` |
| Health classification | Random Forest (HEALTHY / DEGRADED / CRITICAL) | `ml/classification/service_classifier.py` |
| Overload risk | Fuzzy rule inference (CPU, memory, latency, errors, restarts) | `ml/neuro_fuzzy/overload_risk.py` |
| Root cause analysis | Evidence rules + dependency graph; metric evidence outranks deployments | `backend/app/rca/rca_engine.py` |
| Explanation | Keyword runbook retrieval + deterministic template (Ollama optional, off in demo mode) | `backend/app/ai/` |
| Authorisation | Role / action / risk rule table (Prolog-style, implemented in Python) | `backend/app/security/policy_engine.py` |
| Remediation | Scale, restart and rollback with telemetry-based verification and audit log | `backend/app/remediation/remediation_engine.py` |

## Run the demo

```bash
pip install -r requirements.txt
python scripts/seed_database.py                       # creates aiops.db with demo data
uvicorn backend.app.main:app --port 8000              # API, docs at http://localhost:8000/docs
cd frontend && npm install && npm run dev             # dashboard at http://localhost:3000
```

Then follow [DEMO.md](DEMO.md). Run the tests with `pytest` (18 tests) and the model evaluation with
`python -m ml.evaluation.evaluator`.

## Measured model results (synthetic data, held-out seeds)

| Model | Test data | Result |
|---|---|---|
| Isolation Forest | 950 normal + 50 anomalous samples | accuracy 100 % |
| Failure predictor | 1000 samples | accuracy 94.1 %, F1 0.939, ROC-AUC 0.989 |
| Health classifier | 1000 samples, 3 classes | accuracy 99.9 % |

The labels of the synthetic data follow fixed rules, so these figures show that the models recover those rules,
not how they would perform on real production telemetry.

## Demo-mode behaviour

- `DEMO_MODE=true` (default): Kubernetes actions only change the demo database; no language model is called.
- `DEMO_MODE=false`: uses a real kubeconfig for scale and restart, and an Ollama server for explanations.
  Rollback is simulated only.
- The failure scenarios (CPU saturation, memory leak, pod crash loop, traffic surge, network latency, cascading
  failure) are started from the dashboard or with the scripts in `scripts/`. CPU, memory and crash scenarios also
  open an incident.
- A remediation is evaluated for the selected role and risk; `DENY` actions cannot be executed and
  `REQUIRE_APPROVAL` actions can be approved only by an Admin or DevOps user.
- Cost anomalies use a simple rule (more than $200 per day).

## Stack

Python 3.11, FastAPI, SQLAlchemy (SQLite), scikit-learn, React 18, Vite, Tailwind CSS, Recharts.
