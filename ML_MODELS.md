# Machine Learning Architecture & Evaluation (Demo Build)

All data is synthetic. Labels follow fixed rules, so the results show that the models recover those rules; they are not
an estimate of performance on real telemetry. Reproduce the numbers with `python -m ml.evaluation.evaluator`
(held-out random seeds, different from the training seeds).

## 1. Models

| Task | Algorithm | Notes |
|---|---|---|
| Anomaly detection | Isolation Forest (100 trees, contamination 5 %) | Decision = the forest's own prediction. The 0 to 1 score is calibrated so that 0.5 is the model threshold. |
| Failure prediction | Random Forest (100 trees, depth 10) | Probability of failure, risk level and top 3 features. |
| Health classification | Random Forest (100 trees, depth 8) | HEALTHY / DEGRADED / CRITICAL; one third of the training data comes from healthy ranges. |
| Overload risk | Fuzzy rule inference | Low / medium / high sets for CPU, memory, latency, errors and restarts; rules for CPU, memory, latency, error and restart combinations. |

## 2. Inputs

```python
features = ["cpu_usage", "memory_usage", "latency", "error_rate", "pod_restarts", "historical_failures", "node_cpu_usage"]
```

The anomaly detector, health classifier and fuzzy engine use the first five.

## 3. Results (held-out synthetic data)

| Model | Test data | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|---|
| Isolation Forest | 950 normal + 50 anomalous | 100 % | 1.000 | 1.000 | 1.000 | - |
| Failure predictor | 1000 samples | 94.1 % | 0.942 | 0.936 | 0.939 | 0.989 |
| Health classifier | 1000 samples, 3 classes | 99.9 % | 0.999 (weighted) | 0.999 (weighted) | 0.999 (weighted) | - |

Failure predictor confusion matrix (rows = actual, columns = predicted):

```text
                  Predicted Normal    Predicted Failure
Actual Normal           486                  28
Actual Failure           31                 455
```

## 4. Fuzzy rules

```text
R1: IF CPU = HIGH AND MEMORY = HIGH AND LATENCY = HIGH THEN CRITICAL
R2: IF CPU = HIGH AND ERROR_RATE = HIGH THEN CRITICAL
R3: IF (CPU = HIGH AND MEMORY = HIGH) OR (MEMORY = HIGH AND LATENCY = HIGH) THEN HIGH
R3b: IF MEMORY = HIGH OR (LATENCY = HIGH AND ERROR_RATE = HIGH) OR (RESTARTS = HIGH AND ERROR_RATE = HIGH) THEN HIGH
R4: IF CPU = MEDIUM AND MEMORY = MEDIUM AND LATENCY = MEDIUM THEN MEDIUM
score = 0.95 c + 0.75 h + 0.50 m + 0.15 (1 - max(c, h, m))
```
