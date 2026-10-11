import requests
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_test():
    print("=== SLM COPILOT ACCEPTANCE TEST (SECTION 29) ===")

    # 1. Reset Simulation (Healthy State)
    print("\n--- Test 1: Reset Simulation (Healthy State) ---")
    requests.post(f"{BASE_URL}/simulation/reset")
    time.sleep(1)
    res1 = requests.post(f"{BASE_URL}/ai/chat", json={"message": "What is the current issue?"}).json()
    print("AI Response 1:", res1.get("response"))
    print("Source 1:", res1.get("source"))

    # 2. CPU Saturation Scenario
    print("\n--- Test 2: CPU Saturation Scenario ---")
    requests.post(f"{BASE_URL}/simulation/trigger", json={"scenario": "cpu_saturation", "service_name": "checkout-service"})
    time.sleep(1)
    res2 = requests.post(f"{BASE_URL}/ai/chat", json={"message": "What is the current issue?"}).json()
    print("AI Response 2:", res2.get("response"))
    print("Source 2:", res2.get("source"))

    # 3. Memory Leak Scenario
    print("\n--- Test 3: Pod Memory Leak Scenario ---")
    requests.post(f"{BASE_URL}/simulation/trigger", json={"scenario": "memory_leak", "service_name": "checkout-service"})
    time.sleep(1)
    res3 = requests.post(f"{BASE_URL}/ai/chat", json={"message": "What is the current issue?"}).json()
    print("AI Response 3:", res3.get("response"))
    print("Source 3:", res3.get("source"))

    # 4. Pod CrashLoop Scenario
    print("\n--- Test 4: Pod CrashLoop Scenario ---")
    requests.post(f"{BASE_URL}/simulation/trigger", json={"scenario": "pod_crash", "service_name": "checkout-service"})
    time.sleep(1)
    res4 = requests.post(f"{BASE_URL}/ai/chat", json={"message": "What is the current issue?"}).json()
    print("AI Response 4:", res4.get("response"))
    print("Source 4:", res4.get("source"))

if __name__ == "__main__":
    run_test()
