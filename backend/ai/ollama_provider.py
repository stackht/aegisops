import os
import requests
import asyncio
from typing import Optional, List, Dict, Any

from backend.app.config import DEMO_MODE


class OllamaProvider:
    """
    Dynamic Ollama SLM Provider that auto-detects installed local models
    (e.g., phi:latest, qwen3:8b, qwen2.5:1.5b) and executes non-blocking inferences.
    """

    def __init__(self):
        self.url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
        self.configured_model = os.getenv("OLLAMA_MODEL")
        self.active_model = None

    def _auto_detect_model(self) -> Optional[str]:
        if self.configured_model:
            return self.configured_model
        try:
            res = requests.get(f"{self.url}/api/tags", timeout=1.0)
            if res.status_code == 200:
                models_list = res.json().get("models", [])
                if models_list:
                    names = [m.get("name") for m in models_list]
                    # Prefer light/fast models if available
                    for preferred in ["phi:latest", "phi", "qwen3:8b", "qwen2.5:1.5b", "gemma:2b", "llama3:latest"]:
                        if preferred in names:
                            return preferred
                    return names[0]
        except Exception:
            pass
        return "phi:latest"

    async def check_health(self) -> dict:
        if DEMO_MODE:
            return {
                "status": "demo",
                "provider": "Demo SLM (deterministic template)",
                "active_model": "None (demo mode)",
                "message": "Demo mode: the language model is simulated by a deterministic template.",
                "slm_available": False
            }
        try:
            res = requests.get(f"{self.url}/api/tags", timeout=1.0)
            if res.status_code == 200:
                models = [m.get("name") for m in res.json().get("models", [])]
                self.active_model = self._auto_detect_model()
                return {
                    "status": "online",
                    "provider": "Ollama SLM",
                    "active_model": self.active_model,
                    "available_models": models,
                    "slm_available": True
                }
        except Exception:
            pass

        return {
            "status": "offline",
            "provider": "Deterministic Telemetry Summarizer",
            "active_model": "None (SLM Offline)",
            "message": "Ollama service unavailable. Deterministic telemetry context fallback active.",
            "slm_available": False
        }

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        if DEMO_MODE:
            return None
        model_name = self._auto_detect_model()
        full_prompt = f"{system_prompt}\n\nUser Question: {prompt}" if system_prompt else prompt

        try:
            loop = asyncio.get_event_loop()
            def _call():
                try:
                    resp = requests.post(
                        f"{self.url}/api/generate",
                        json={
                            "model": model_name,
                            "prompt": full_prompt,
                            "stream": False,
                            "options": {"temperature": 0.2, "num_predict": 300}
                        },
                        timeout=15.0  # 15s timeout for fast 3B/8B local inference
                    )
                    if resp.status_code == 200:
                        return resp.json().get("response", "").strip()
                except Exception as ex:
                    print(f"[OllamaProvider Error] {ex}")
                    return None
                return None

            text = await loop.run_in_executor(None, _call)
            return text
        except Exception as e:
            print(f"[OllamaProvider] Inference Exception: {e}")
            return None
