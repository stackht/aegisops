import requests

API_URL = "http://localhost:8000/api/v1/simulation/trigger"

def run():
    print("[Simulator] Injecting Pod CrashLoop (Exit code 137) on checkout-service...")
    try:
        res = requests.post(API_URL, json={"scenario": "pod_crash", "service_name": "checkout-service"})
        print("[Simulator] Server Response:", res.json())
    except Exception as e:
        print("[Simulator] Simulation triggered locally:", e)

if __name__ == "__main__":
    run()
