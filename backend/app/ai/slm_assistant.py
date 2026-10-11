import os
import time
import requests
from typing import List, Dict, Any

from backend.app.config import DEMO_MODE


class SLMAssistant:
    """
    Ollama Small Language Model (SLM) Incident Assistant with RAG integration
    and robust deterministic rule-based fallback.
    """

    def __init__(self):
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model_name = os.getenv("MODEL_NAME", "qwen2.5:1.5b")
        self._offline_until = 0.0  # after a failed call, skip Ollama for 60 s so the workflow stays fast

    def generate_explanation_and_remediation(
        self,
        incident_code: str,
        service_name: str,
        probable_root_cause: str,
        evidence_summary: str,
        rag_context: List[Dict[str, Any]]
    ) -> dict:
        prompt = self._build_prompt(
            incident_code, service_name, probable_root_cause, evidence_summary, rag_context
        )

        if not DEMO_MODE and time.time() >= self._offline_until:
            try:
                response = requests.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.2, "num_predict": 400}
                    },
                    timeout=(0.5, 8.0)
                )
                if response.status_code == 200:
                    text = response.json().get("response", "").strip()
                    if text:
                        return {
                            "slm_explanation": text,
                            "suggested_remediation": self._extract_action(service_name, probable_root_cause),
                            "source": f"Ollama ({self.model_name}) + RAG"
                        }
            except Exception as e:
                self._offline_until = time.time() + 60.0
                print(f"[SLMAssistant] Ollama API offline or timed out ({e}). Using deterministic fallback.")

        # Deterministic Fallback
        return self._deterministic_fallback(incident_code, service_name, probable_root_cause, evidence_summary, rag_context)

    def _build_prompt(
        self, incident_code: str, service_name: str, probable_root_cause: str,
        evidence_summary: str, rag_context: List[Dict[str, Any]]
    ) -> str:
        context_str = "\n".join([f"- {r['title']}: {r['content']}" for r in rag_context])
        return f"""You are an expert AIOps Incident Assistant. Analyze the following incident:
Incident Code: {incident_code}
Target Service: {service_name}
Probable Root Cause: {probable_root_cause}
Telemetry Evidence: {evidence_summary}

Relevant Runbooks:
{context_str}

Provide a concise 3-sentence incident summary, root cause explanation, and explicit remediation step."""

    def _deterministic_fallback(
        self, incident_code: str, service_name: str, probable_root_cause: str,
        evidence_summary: str, rag_context: List[Dict[str, Any]]
    ) -> dict:
        runbook_ref = f" Referenced Runbook: '{rag_context[0]['title']}'." if rag_context else ""
        explanation = (
            f"Incident {incident_code} targeting microservice '{service_name}' was triggered by anomalous telemetry. "
            f"The primary root cause is determined to be: {probable_root_cause}. "
            f"Collected Evidence: {evidence_summary}.{runbook_ref}"
        )
        return {
            "slm_explanation": explanation,
            "suggested_remediation": self._extract_action(service_name, probable_root_cause),
            "source": "Demo SLM (deterministic template)" if DEMO_MODE else "Deterministic Policy Engine (SLM Fallback)"
        }

    def _extract_action(self, service_name: str, root_cause: str) -> dict:
        root_cause_lower = root_cause.lower()
        if "crashloop" in root_cause_lower or "crashes" in root_cause_lower:
            return {
                "action_type": "RESTART_POD",
                "target_resource": f"pod/{service_name}-unhealthy-instance",
                "parameters": {"grace_period": 30},
                "risk_level": "LOW",
                "reason": "Restart the crash-looping pod so that Kubernetes recreates it from a clean state."
            }
        if "cpu" in root_cause_lower or "saturation" in root_cause_lower:
            return {
                "action_type": "SCALE_DEPLOYMENT",
                "target_resource": f"deployment/{service_name}",
                "parameters": {"replicas": 4},
                "risk_level": "LOW",
                "reason": "Scale deployment replicas from 2 to 4 to relieve CPU saturation."
            }
        elif "memory" in root_cause_lower or "oom" in root_cause_lower:
            return {
                "action_type": "RESTART_POD",
                "target_resource": f"pod/{service_name}-unhealthy-instance",
                "parameters": {"grace_period": 30},
                "risk_level": "LOW",
                "reason": "Restart pod instance to release memory leak heap space."
            }
        elif "deployment" in root_cause_lower or "code" in root_cause_lower:
            return {
                "action_type": "ROLLBACK_DEPLOYMENT",
                "target_resource": f"deployment/{service_name}",
                "parameters": {"revision": "previous"},
                "risk_level": "HIGH",
                "reason": "Rollback deployment to previous stable revision."
            }
        else:
            return {
                "action_type": "SCALE_DEPLOYMENT",
                "target_resource": f"deployment/{service_name}",
                "parameters": {"replicas": 3},
                "risk_level": "LOW",
                "reason": "Scale deployment to handle load pressure."
            }
