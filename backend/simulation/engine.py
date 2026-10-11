import asyncio
import datetime
from backend.simulation.state import SimulationState
from backend.simulation.scenarios import apply_scenario_step


class SimulationEngine:
    def __init__(self):
        self.state = SimulationState()

    def start_scenario(self, scenario_name: str, target_service: str = "checkout-service", duration_seconds: int = 60, intensity: float = 0.7) -> dict:
        self.state.current_scenario = scenario_name
        self.state.target_service = target_service
        self.state.duration_seconds = duration_seconds
        self.state.intensity = intensity
        self.state.clock_seconds = 0
        self.state.is_running = True
        self.state.is_paused = False

        self.state.add_timeline_event(
            f"Simulation scenario '{scenario_name}' started targeting '{target_service}' (Duration: {duration_seconds}s).",
            "INFO"
        )
        return self.get_status()

    def pause_scenario(self) -> dict:
        self.state.is_paused = True
        self.state.add_timeline_event("Simulation clock paused.", "WARNING")
        return self.get_status()

    def resume_scenario(self) -> dict:
        self.state.is_paused = False
        self.state.add_timeline_event("Simulation clock resumed.", "INFO")
        return self.get_status()

    def reset_system(self) -> dict:
        self.state.reset()
        self.state.add_timeline_event("Simulation state reset to healthy nominal baseline.", "INFO")
        return self.get_status()

    def tick(self):
        apply_scenario_step(self.state)

    def get_status(self) -> dict:
        return {
            "mode": self.state.mode,
            "is_running": self.state.is_running,
            "is_paused": self.state.is_paused,
            "clock_seconds": self.state.clock_seconds,
            "current_scenario": self.state.current_scenario,
            "target_service": self.state.target_service,
            "intensity": self.state.intensity,
            "duration_seconds": self.state.duration_seconds,
            "timeline": self.state.timeline[:20],
            "services": self.state.services,
            "nodes": self.state.nodes,
            "pods": self.state.pods
        }
