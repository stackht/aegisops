import datetime
from typing import List, Dict, Any, Optional

class SimulationState:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SimulationState, cls).__new__(cls)
            cls._instance.reset()
        return cls._instance

    def reset(self):
        self.mode = "SIMULATION"  # "LIVE" or "SIMULATION"
        self.is_running = False
        self.is_paused = False
        self.clock_seconds = 0
        self.current_scenario: Optional[str] = None
        self.target_service: str = "checkout-service"
        self.intensity: float = 0.7
        self.duration_seconds: int = 60
        self.restarts: Dict[str, int] = {}  # pod restart counters injected by failure scenarios

        # Timeline logs
        self.timeline: List[Dict[str, Any]] = [
            {
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "time_offset": "00:00",
                "message": "Simulation system initialized to Healthy Baseline.",
                "type": "INFO"
            }
        ]

        # Monitored microservices initial baseline
        self.services: Dict[str, Dict[str, Any]] = {
            "checkout-service": {"cpu": 24.5, "memory": 180.0, "latency": 45.0, "error_rate": 0.01, "health": "HEALTHY", "replicas": 3, "desired": 3},
            "payment-service": {"cpu": 32.0, "memory": 210.0, "latency": 65.0, "error_rate": 0.005, "health": "HEALTHY", "replicas": 2, "desired": 2},
            "auth-service": {"cpu": 15.0, "memory": 120.0, "latency": 25.0, "error_rate": 0.000, "health": "HEALTHY", "replicas": 2, "desired": 2},
            "inventory-service": {"cpu": 18.0, "memory": 150.0, "latency": 35.0, "error_rate": 0.002, "health": "HEALTHY", "replicas": 2, "desired": 2},
            "notification-service": {"cpu": 10.0, "memory": 90.0, "latency": 15.0, "error_rate": 0.000, "health": "HEALTHY", "replicas": 1, "desired": 1}
        }

        # Monitored nodes
        self.nodes: List[Dict[str, Any]] = [
            {"name": "minikube-node-1", "status": "Ready", "cpu": 28.4, "memory": 42.1},
            {"name": "minikube-node-2", "status": "Ready", "cpu": 31.2, "memory": 38.5}
        ]

        # Active Pods
        self.pods: List[Dict[str, Any]] = [
            {"name": "checkout-service-7f89d-abc1", "service": "checkout-service", "node": "minikube-node-1", "status": "Running", "restarts": 0, "memory_mb": 185.0},
            {"name": "checkout-service-7f89d-abc2", "service": "checkout-service", "node": "minikube-node-2", "status": "Running", "restarts": 0, "memory_mb": 175.0},
            {"name": "payment-service-5c64b-xyz1", "service": "payment-service", "node": "minikube-node-1", "status": "Running", "restarts": 0, "memory_mb": 215.0},
            {"name": "payment-service-5c64b-xyz2", "service": "payment-service", "node": "minikube-node-2", "status": "Running", "restarts": 0, "memory_mb": 205.0},
            {"name": "auth-service-4d89a-qwe1", "service": "auth-service", "node": "minikube-node-1", "status": "Running", "restarts": 0, "memory_mb": 120.0}
        ]

    def add_timeline_event(self, message: str, event_type: str = "INFO"):
        mm = self.clock_seconds // 60
        ss = self.clock_seconds % 60
        offset_str = f"{mm:02d}:{ss:02d}"
        self.timeline.insert(0, {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "time_offset": offset_str,
            "message": message,
            "type": event_type
        })
        if len(self.timeline) > 50:
            self.timeline.pop()
