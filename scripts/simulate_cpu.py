import time
import requests

API_URL = "http://localhost:8000/api/v1/simulation/trigger"

def run():
    print("[Simulator] Injecting CPU Saturation Spike (95% load) on checkout-service...")
    try:
        res = requests.post(API_URL, json={"scenario": "cpu_spike", "service_name": "checkout-service"})
        print("[Simulator] Server Response:", res.json())
    except Exception as e:
        print("[Simulator] Simulation triggered locally:", e)

if __name__ == "__main__":
    run()
