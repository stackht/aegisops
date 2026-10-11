import asyncio
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.routers import router as api_router
from backend.app.database.connection import engine, Base, SessionLocal
from backend.app.database.models import Service, Anomaly, Incident
from backend.simulation.engine import SimulationEngine
from ml.anomaly_detection.isolation_forest import AnomalyDetector
from ml.failure_prediction.failure_predictor import FailurePredictor
from ml.classification.service_classifier import ServiceHealthClassifier
from ml.neuro_fuzzy.overload_risk import NeuroFuzzyOverloadRiskEngine

# Create database tables automatically on launch
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AIOps Control Center & Monitoring System",
    description="Autonomous Cloud and Kubernetes Observability Platform",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
sim_engine = SimulationEngine()
_detector = AnomalyDetector()
_predictor = FailurePredictor()
_classifier = ServiceHealthClassifier()
_fuzzy = NeuroFuzzyOverloadRiskEngine()


def analyse_services(services: dict) -> dict:
    """Run the four models on the current telemetry of every service and summarise the worst one."""
    per_service = {}
    for name, d in services.items():
        features = {
            "cpu_usage": d["cpu"], "memory_usage": d["memory"], "latency": d["latency"],
            "error_rate": d["error_rate"], "pod_restarts": sim_engine.state.restarts.get(name, 0),
        }
        anomaly = _detector.detect(features)
        failure = _predictor.predict(features)
        fuzzy = _fuzzy.evaluate_risk(features)
        per_service[name] = {
            "anomaly_score": anomaly["anomaly_score"], "is_anomaly": anomaly["is_anomaly"], "anomaly_severity": anomaly["severity"],
            "failure_probability": failure["failure_probability"], "failure_risk": failure["risk"],
            "top_feature": failure["top_contributing_features"][0]["feature"],
            "health_class": _classifier.classify(features),
            "overload_risk_score": fuzzy["overload_risk_score"], "overload_category": fuzzy["risk_category"],
            "memberships": fuzzy["memberships"], "fuzzy_rule_triggers": fuzzy["fuzzy_rule_triggers"],
        }
    worst = max(per_service, key=lambda n: per_service[n]["overload_risk_score"] + per_service[n]["failure_probability"] + per_service[n]["anomaly_score"])
    return {"worst_service": worst, "worst": per_service[worst], "services": per_service}


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws/monitoring")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def background_monitoring_loop():
    """
    Continuous background loop updating simulation state and broadcasting structured WebSocket events
    """
    while True:
        await asyncio.sleep(2)
        # Advance simulation step
        sim_engine.tick()

        if manager.active_connections:
            db = SessionLocal()
            try:
                sim_status = sim_engine.get_status()
                open_incidents = db.query(Incident).filter(Incident.status == "OPEN").all()
                anomalies_count = db.query(Anomaly).count()

                payload = {
                    "type": "telemetry.update",
                    "timestamp": asyncio.get_event_loop().time(),
                    "simulation": {
                        "mode": sim_status["mode"],
                        "is_running": sim_status["is_running"],
                        "is_paused": sim_status["is_paused"],
                        "clock_seconds": sim_status["clock_seconds"],
                        "current_scenario": sim_status["current_scenario"],
                        "timeline": sim_status["timeline"]
                    },
                    "ai_summary": analyse_services({
                        s.name: {"cpu": s.current_cpu_usage, "memory": s.current_memory_usage, "latency": s.current_latency_ms, "error_rate": s.current_error_rate}
                        for s in db.query(Service).all()
                    }),
                    "open_incidents_count": len(open_incidents),
                    "total_anomalies_count": anomalies_count,
                    "services": [
                        {
                            "name": name,
                            "health_status": data["health"],
                            "cpu_usage": data["cpu"],
                            "memory_usage": data["memory"],
                            "latency_ms": data["latency"],
                            "error_rate": data["error_rate"],
                            "replicas": f"{data['replicas']}/{data['desired']}"
                        }
                        for name, data in sim_status["services"].items()
                    ]
                }
                await manager.broadcast(payload)
            except Exception as e:
                print(f"[WebSocket Loop Error] {e}")
            finally:
                db.close()


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(background_monitoring_loop())


@app.get("/")
def root():
    return {
        "status": "online",
        "system": "AIOps Control Center (Minimal Technical Observability Console)",
        "version": "2.0.0",
        "docs_url": "/docs"
    }
