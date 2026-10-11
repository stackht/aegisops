import os

# AegisOps is a demonstration build. With DEMO_MODE=true (the default) every external system is simulated:
#   - the Kubernetes cluster (scaling, restarts and rollbacks are simulated and only change the demo database)
#   - the small language model (explanations come from a deterministic template, Ollama is never called)
# Set DEMO_MODE=false only if a real Kubernetes configuration and an Ollama server are available.
DEMO_MODE = os.getenv("DEMO_MODE", "true").strip().lower() in ("1", "true", "yes", "on")
