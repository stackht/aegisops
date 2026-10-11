import os
import requests
import asyncio
from typing import Optional, Dict, Any, List

class LLMProvider:
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        raise NotImplementedError

    async def check_health(self) -> dict:
        raise NotImplementedError


class OllamaProvider(LLMProvider):
    def __init__(self):
        self.url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model = os.getenv("MODEL_NAME", "qwen2.5:1.5b")

    async def check_health(self) -> dict:
        try:
            res = requests.get(f"{self.url}/api/tags", timeout=0.5)
            if res.status_code == 200:
                models = [m.get("name") for m in res.json().get("models", [])]
                return {
                    "status": "online",
                    "provider": "Ollama",
                    "configured_model": self.model,
                    "available_models": models
                }
        except Exception:
            pass
        return {
            "status": "offline",
            "provider": "Ollama",
            "configured_model": self.model,
            "message": "Ollama service unavailable. Deterministic fallback active."
        }

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        try:
            loop = asyncio.get_event_loop()
            def _call():
                try:
                    resp = requests.post(
                        f"{self.url}/api/generate",
                        json={"model": self.model, "prompt": full_prompt, "stream": False},
                        timeout=1.5
                    )
                    if resp.status_code == 200:
                        return resp.json().get("response", "").strip()
                except Exception:
                    return None
                return None

            text = await loop.run_in_executor(None, _call)
            return text
        except Exception as e:
            print(f"[OllamaProvider] Exception: {e}")
            return None


class OptionalCloudProvider(LLMProvider):
    def __init__(self):
        self.provider_name = os.getenv("LLM_PROVIDER", "ollama").lower()
        self.grok_key = os.getenv("GROK_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")

    async def check_health(self) -> dict:
        if self.grok_key:
            return {"status": "online", "provider": "Grok API"}
        elif self.openai_key:
            return {"status": "online", "provider": "OpenAI API"}
        return {"status": "disabled", "provider": "Cloud Provider (Not Configured)"}

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        return None
