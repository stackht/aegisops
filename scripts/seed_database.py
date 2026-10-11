import os
import sys
import datetime

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database.connection import SessionLocal, engine, Base
from backend.app.database.models import (
    User, Service, Node, Pod, KnowledgeDocument, CloudCost, Deployment, PipelineRun
)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    print("Creating database tables if not exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Users
        if db.query(User).count() == 0:
            print("Seeding Users...")
            users = [
                User(
                    username="admin",
                    email="admin@aiops.local",
                    hashed_password=pwd_context.hash("admin123"),
                    role="Admin"
                ),
                User(
                    username="devops_lead",
                    email="devops@aiops.local",
                    hashed_password=pwd_context.hash("devops123"),
                    role="DevOps"
                ),
                User(
                    username="dev_user",
                    email="developer@aiops.local",
                    hashed_password=pwd_context.hash("dev123"),
                    role="Developer"
                ),
                User(
                    username="viewer_user",
                    email="viewer@aiops.local",
                    hashed_password=pwd_context.hash("viewer123"),
                    role="Viewer"
                ),
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Services
        if db.query(Service).count() == 0:
            print("Seeding Microservices...")
            services = [
                Service(name="checkout-service", namespace="default", health_status="HEALTHY", current_cpu_usage=24.5, current_memory_usage=180.0, current_latency_ms=45.0, current_error_rate=0.01, replicas_desired=3, replicas_ready=3),
                Service(name="payment-service", namespace="default", health_status="HEALTHY", current_cpu_usage=32.0, current_memory_usage=210.0, current_latency_ms=65.0, current_error_rate=0.005, replicas_desired=2, replicas_ready=2),
                Service(name="auth-service", namespace="default", health_status="HEALTHY", current_cpu_usage=15.0, current_memory_usage=120.0, current_latency_ms=25.0, current_error_rate=0.00, replicas_desired=2, replicas_ready=2),
                Service(name="inventory-service", namespace="default", health_status="HEALTHY", current_cpu_usage=18.0, current_memory_usage=150.0, current_latency_ms=35.0, current_error_rate=0.002, replicas_desired=2, replicas_ready=2),
                Service(name="notification-service", namespace="default", health_status="HEALTHY", current_cpu_usage=10.0, current_memory_usage=90.0, current_latency_ms=15.0, current_error_rate=0.00, replicas_desired=1, replicas_ready=1),
            ]
            db.add_all(services)
            db.commit()

        # 3. Seed Nodes & Pods
        if db.query(Node).count() == 0:
            print("Seeding Nodes...")
            nodes = [
                Node(name="minikube-node-1", status="Ready", cpu_capacity_cores=8.0, memory_capacity_bytes=34359738368, cpu_usage_pct=28.4, memory_usage_pct=42.1),
                Node(name="minikube-node-2", status="Ready", cpu_capacity_cores=8.0, memory_capacity_bytes=34359738368, cpu_usage_pct=31.2, memory_usage_pct=38.5),
            ]
            db.add_all(nodes)
            db.commit()

        if db.query(Pod).count() == 0:
            print("Seeding Pods...")
            svc_map = {s.name: s.id for s in db.query(Service).all()}
            pods = [
                Pod(name="checkout-service-7f89d-abc1", service_id=svc_map.get("checkout-service"), node_name="minikube-node-1", status="Running", restart_count=0, cpu_usage_pct=22.0, memory_usage_mb=185.0),
                Pod(name="checkout-service-7f89d-abc2", service_id=svc_map.get("checkout-service"), node_name="minikube-node-2", status="Running", restart_count=0, cpu_usage_pct=25.0, memory_usage_mb=175.0),
                Pod(name="payment-service-5c64b-xyz1", service_id=svc_map.get("payment-service"), node_name="minikube-node-1", status="Running", restart_count=0, cpu_usage_pct=30.0, memory_usage_mb=215.0),
                Pod(name="payment-service-5c64b-xyz2", service_id=svc_map.get("payment-service"), node_name="minikube-node-2", status="Running", restart_count=0, cpu_usage_pct=34.0, memory_usage_mb=205.0),
                Pod(name="auth-service-4d89a-qwe1", service_id=svc_map.get("auth-service"), node_name="minikube-node-1", status="Running", restart_count=0, cpu_usage_pct=15.0, memory_usage_mb=120.0),
            ]
            db.add_all(pods)
            db.commit()

        # 4. Seed Knowledge Documents (for RAG)
        if db.query(KnowledgeDocument).count() == 0:
            print("Seeding RAG Knowledge Base...")
            docs = [
                KnowledgeDocument(
                    title="Runbook: CPU Overload Mitigation in Payment Service",
                    category="RUNBOOK",
                    content="When CPU usage in payment-service exceeds 85% for more than 2 minutes, check for downstream latency or memory starvation. Recommended action: horizontal auto-scaling from N to N+2 replicas or restarting unhealthy pod instances.",
                    tags=["payment-service", "cpu", "scaling", "hpa"]
                ),
                KnowledgeDocument(
                    title="Runbook: OOMKilled & Memory Leak Troubleshooting",
                    category="RUNBOOK",
                    content="If a pod is terminated with OOMKilled status (exit code 137), analyze memory usage slope. Increase pod memory request/limit in deployment specification, or issue pod restart to temporarily release leaked heap buffer.",
                    tags=["memory", "oomkilled", "k8s", "restart"]
                ),
                KnowledgeDocument(
                    title="Kubernetes Troubleshooting: Cascading Service Latency",
                    category="K8S_DOC",
                    content="High error rates in checkout-service are frequently caused by upstream timeout degradation in payment-service or database lock contention. Always inspect payment-service CPU and connection pool metrics when checkout latency spikes.",
                    tags=["checkout-service", "latency", "cascading", "rca"]
                ),
                KnowledgeDocument(
                    title="Runbook: Deployment Rollback Procedures",
                    category="RUNBOOK",
                    content="If a newly deployed image tag introduces elevated HTTP 5xx errors or pod crashloops, trigger deployment rollback via `kubectl rollout undo deployment/<service-name>`. Policy allows auto-rollback for high severity incidents.",
                    tags=["deployment", "rollback", "ci-cd"]
                ),
            ]
            db.add_all(docs)
            db.commit()

        # 5. Seed Cloud Costs Baseline
        if db.query(CloudCost).count() == 0:
            print("Seeding Cloud Costs...")
            today = datetime.datetime.utcnow()
            costs = [
                CloudCost(provider="AWS", service_name="EKS Compute Cluster", resource_id="eks-prod-cluster-01", daily_cost=145.50, currency="USD", is_anomaly=False, recorded_date=today),
                CloudCost(provider="AWS", service_name="RDS PostgreSQL", resource_id="rds-db-primary", daily_cost=88.20, currency="USD", is_anomaly=False, recorded_date=today),
                CloudCost(provider="GCP", service_name="Cloud Storage Bucket", resource_id="gcp-logs-archive", daily_cost=12.40, currency="USD", is_anomaly=False, recorded_date=today),
                CloudCost(provider="AWS", service_name="EC2 Payment Worker Group", resource_id="i-098a12bc4d5e", daily_cost=240.00, currency="USD", is_anomaly=True, anomaly_score=0.89, recorded_date=today),
            ]
            db.add_all(costs)
            db.commit()

        # 6. Seed Deployments & Pipeline Runs
        if db.query(Deployment).count() == 0:
            print("Seeding Deployments...")
            deployments = [
                Deployment(service_name="payment-service", version="v1.4.2", deployed_by="github-actions", deployed_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=15), status="SUCCESS"),
                Deployment(service_name="checkout-service", version="v2.1.0", deployed_by="devops-john", deployed_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2), status="SUCCESS"),
            ]
            db.add_all(deployments)
            db.commit()

        if db.query(PipelineRun).count() == 0:
            print("Seeding CI/CD Pipeline Runs...")
            pipelines = [
                PipelineRun(pipeline_name="payment-service-ci", commit_sha="a1b2c3d4", branch="main", build_duration_sec=95.0, tests_passed=38, tests_failed=0, failure_probability=0.04, risk_assessment="LOW", status="SUCCESS"),
                PipelineRun(pipeline_name="checkout-service-ci", commit_sha="f9e8d7c6", branch="feature/new-checkout", build_duration_sec=140.0, tests_passed=42, tests_failed=2, failure_probability=0.72, risk_assessment="HIGH", status="FAILED"),
            ]
            db.add_all(pipelines)
            db.commit()

        print("Database seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
