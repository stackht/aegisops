# AegisOps Demo Walkthrough

AegisOps is a demo build: telemetry, Kubernetes and the language model are simulated. Start the backend and the
dashboard (see README), open http://localhost:3000 and follow the steps.

```text
STEP 1  Baseline
        Overview: 5 services HEALTHY, 0 incidents, anomaly score 0.00 (LOW), failure risk a few percent.
STEP 2  Inject a failure
        Simulation Controls > "CPU Saturation (95%)" > Inject Scenario (or: python scripts/simulate_cpu.py).
        An incident is opened and the service turns CRITICAL.
STEP 3  Detection
        Overview tiles and the AI Intelligence page show the live model outputs for the worst service:
        anomaly score, failure probability, health class, fuzzy overload risk and rule degrees.
STEP 4  Root cause analysis
        Incident Center > select the incident. The RCA ranks metric evidence first
        ("CPU saturation ... 0.88"); a recent deployment is listed as a contributing factor.
STEP 5  Explanation
        The summary and the retrieved runbooks appear (demo template, no external model).
STEP 6  Authorisation
        Remediation: "Suggest Scale Action" creates SCALE_DEPLOYMENT. The policy decision depends on the selected
        role (try Viewer = DENY, Developer = REQUIRE_APPROVAL, DevOps = ALLOW).
STEP 7  Execute and verify
        Execute. The simulated cluster scales the deployment, recovery is verified from the new telemetry
        (CPU, latency, error rate within healthy limits) and the incident becomes RESOLVED.
STEP 8  Other scenarios
        Memory leak -> RESTART_POD (ALLOW). Pod crash loop -> RESTART_POD. A rollback can also be created and
        executed by an Admin or DevOps user.
```
