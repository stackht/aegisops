import os
from typing import List, Dict, Any

from backend.app.config import DEMO_MODE


class KubernetesAdapter:
    """
    Kubernetes API adapter. In demo mode (default) every operation is simulated; with DEMO_MODE=false
    and a kubeconfig it talks to a real Minikube/kind cluster.
    """

    def __init__(self):
        self.k8s_client = None
        self.apps_api = None
        self.is_connected = False
        if DEMO_MODE:
            print("[KubernetesAdapter] DEMO_MODE: Kubernetes operations are simulated.")
        else:
            self._init_k8s()

    def _init_k8s(self):
        try:
            from kubernetes import client, config
            in_cluster = os.getenv("KUBERNETES_IN_CLUSTER", "false").lower() == "true"
            if in_cluster:
                config.load_incluster_config()
                self.is_connected = True
            else:
                kubeconfig_path = os.path.expanduser(os.getenv("KUBERNETES_CONFIG", "~/.kube/config"))
                if os.path.exists(kubeconfig_path):
                    config.load_kube_config(config_file=kubeconfig_path)
                    self.is_connected = True

            if self.is_connected:
                self.apps_api = client.AppsV1Api()
                print("[KubernetesAdapter] Connected to live Kubernetes Cluster!")
        except Exception as e:
            print(f"[KubernetesAdapter] Live cluster unavailable ({e}). Running in simulation mode.")

    def scale_deployment(self, namespace: str, deployment_name: str, replicas: int) -> dict:
        if self.is_connected and self.apps_api:
            try:
                body = {"spec": {"replicas": replicas}}
                self.apps_api.patch_namespaced_deployment_scale(
                    name=deployment_name, namespace=namespace, body=body
                )
                return {"success": True, "message": f"Successfully scaled {deployment_name} to {replicas} replicas via K8s API."}
            except Exception as e:
                return {"success": False, "message": f"K8s scaling error: {str(e)}"}

        return {
            "success": True,
            "message": f"[Simulated K8s] Scaled deployment '{deployment_name}' in namespace '{namespace}' to {replicas} replicas."
        }

    def restart_pod(self, namespace: str, pod_name: str) -> dict:
        if self.is_connected:
            try:
                from kubernetes import client
                core_api = client.CoreV1Api()
                core_api.delete_namespaced_pod(name=pod_name, namespace=namespace)
                return {"success": True, "message": f"Successfully deleted pod {pod_name} to trigger restart."}
            except Exception as e:
                return {"success": False, "message": f"K8s pod restart error: {str(e)}"}

        return {
            "success": True,
            "message": f"[Simulated K8s] Pod '{pod_name}' in namespace '{namespace}' deleted to initiate auto-restart."
        }

    def rollback_deployment(self, namespace: str, deployment_name: str, revision: str = "previous") -> dict:
        if self.is_connected and self.apps_api:
            return {
                "success": False,
                "message": "Rollback on a live cluster is not wired to the Kubernetes API in this build (use kubectl rollout undo)."
            }

        return {
            "success": True,
            "message": f"[Simulated K8s] Rolled back deployment '{deployment_name}' in namespace '{namespace}' to the {revision} revision."
        }
