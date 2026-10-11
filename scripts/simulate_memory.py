import requests

API_URL = "http://localhost:8000/api/v1/simulation/trigger"

def run():
    print("[Simulator] Injecting Memory Leak (920MB heap) on checkout-service...")
    try:
        res = requests.post(API_URL, json={"scenario": "memory_leak", "service_name": "checkout-service"})
        print("[Simulator] Server Response:", res.json())
    except Exception as e:
        print("[Simulator] Simulation triggered locally:", e)

if __name__ == "__main__":
    run()
