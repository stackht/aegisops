import math
import random
from backend.simulation.state import SimulationState


def apply_scenario_step(state: SimulationState):
    """
    Executes a single step update (tick) for the active scenario.
    """
    if not state.is_running or state.is_paused or not state.current_scenario:
        # Apply normal Gaussian noise to baseline metrics
        for svc_name, svc in state.services.items():
            svc["cpu"] = max(5.0, min(100.0, svc["cpu"] + random.uniform(-0.8, 0.8)))
            svc["latency"] = max(10.0, min(2000.0, svc["latency"] + random.uniform(-1.5, 1.5)))
        return

    state.clock_seconds += 1
    t = state.clock_seconds
    svc_name = state.target_service
    target_svc = state.services.get(svc_name, state.services["checkout-service"])

    sc = state.current_scenario.lower()

    # Scenario 1: CPU Saturation
    if sc in ["cpu_spike", "cpu_saturation"]:
        progress = min(1.0, t / max(1, state.duration_seconds))
        target_svc["cpu"] = min(98.5, 35.0 + (progress * 62.0 * state.intensity))
        target_svc["latency"] = min(950.0, 45.0 + (progress * 520.0 * state.intensity))
        target_svc["error_rate"] = min(0.12, 0.005 + (progress * 0.08 * state.intensity))

        if t == 5:
            state.add_timeline_event(f"Workload CPU load rising on {svc_name} (CPU: {target_svc['cpu']:.1f}%).", "WARNING")
        elif t == 15:
            state.add_timeline_event(f"Threshold breached: {svc_name} CPU at {target_svc['cpu']:.1f}%. Isolation Forest Anomaly detected.", "CRITICAL")
            target_svc["health"] = "DEGRADED"
        elif t == 25:
            state.add_timeline_event(f"Critical CPU saturation on {svc_name} (CPU: {target_svc['cpu']:.1f}%, Latency: {target_svc['latency']:.0f}ms). Incident created.", "CRITICAL")
            target_svc["health"] = "CRITICAL"

    # Scenario 2: Memory Leak (OOMKilled)
    elif sc == "memory_leak":
        progress = min(1.0, t / max(1, state.duration_seconds))
        target_svc["memory"] = min(980.0, 180.0 + (progress * 760.0 * state.intensity))

        if target_svc["memory"] > 800.0:
            target_svc["health"] = "CRITICAL"
            target_svc["error_rate"] = 0.15
        elif target_svc["memory"] > 500.0:
            target_svc["health"] = "DEGRADED"

        if t == 10:
            state.add_timeline_event(f"Heap allocation footprint climbing rapidly on {svc_name} ({target_svc['memory']:.0f}MB).", "WARNING")
        elif t == 20:
            state.add_timeline_event(f"Memory starvation threshold exceeded ({target_svc['memory']:.0f}MB). Pod OOMKilled risk HIGH.", "CRITICAL")
        elif t == 28:
            state.add_timeline_event(f"Pod instance terminated with exit code 137 (OOMKilled). Incident INC-OOM created.", "CRITICAL")

    # Scenario 3: Pod Crash Loop
    elif sc in ["pod_crash", "crash_loop"]:
        target_svc["health"] = "CRITICAL"
        target_svc["error_rate"] = 0.25
        target_svc["cpu"] = 12.0

        for p in state.pods:
            if p["service"] == svc_name:
                p["status"] = "CrashLoopBackOff"
                p["restarts"] = min(15, p["restarts"] + (1 if t % 6 == 0 else 0))

        if t % 10 == 0:
            state.add_timeline_event(f"K8s Event: BackOff restart container in pod {svc_name}-pod (Restarts: {state.pods[0]['restarts']}).", "CRITICAL")

    # Scenario 4: Traffic Spike
    elif sc == "traffic_spike":
        progress = min(1.0, t / max(1, state.duration_seconds))
        target_svc["cpu"] = min(92.0, 25.0 + (progress * 65.0))
        target_svc["latency"] = min(680.0, 40.0 + (progress * 550.0))
        target_svc["error_rate"] = min(0.06, 0.001 + (progress * 0.05))

        if t == 8:
            state.add_timeline_event(f"Ingress traffic surging to 3,200 req/s on {svc_name}.", "WARNING")
        elif t == 18:
            state.add_timeline_event(f"Predictive Autoscaler flags replica exhaustion risk for {svc_name}.", "WARNING")

    # Scenario 5: Network Latency
    elif sc == "network_latency":
        progress = min(1.0, t / max(1, state.duration_seconds))
        target_svc["latency"] = min(1200.0, 45.0 + (progress * 1100.0))
        target_svc["error_rate"] = min(0.18, 0.002 + (progress * 0.16))

        if t == 12:
            state.add_timeline_event(f"Network socket connection delay spike on {svc_name} (Latency: {target_svc['latency']:.0f}ms).", "WARNING")

    # Scenario 6: Cascading Failure
    elif sc == "cascading_failure":
        # Upstream payment-service fails first, propagating to checkout-service
        pay_svc = state.services.get("payment-service")
        chk_svc = state.services.get("checkout-service")

        pay_svc["cpu"] = min(96.0, 30.0 + (t * 3.0))
        pay_svc["health"] = "CRITICAL" if t > 10 else "DEGRADED"

        if t > 8:
            chk_svc["latency"] = min(850.0, 45.0 + ((t - 8) * 40.0))
            chk_svc["error_rate"] = min(0.15, 0.01 + ((t - 8) * 0.01))
            chk_svc["health"] = "DEGRADED" if t < 15 else "CRITICAL"

        if t == 5:
            state.add_timeline_event("Cascading Root Event: payment-service CPU & thread starvation initiated.", "CRITICAL")
        elif t == 12:
            state.add_timeline_event("Dependency Propagation: checkout-service latency spiking due to payment-service timeout.", "CRITICAL")
        elif t == 20:
            state.add_timeline_event("Cascade Complete: Downstream checkout-service HTTP 504 Gateway Timeouts registered.", "CRITICAL")
