import sys
import os
from fastapi.testclient import TestClient

os.environ["SIMULATION_API_KEY"] = "test_key"
from app import app, load_model

def run_verification():
    print("Initializing TestClient for ML Verification...")
    load_model()
    
    client = TestClient(app)
    headers = {"X-API-Key": "test_key"}
    
    # 1. Test /predictive-maintenance/metrics GET endpoint
    print("\n--- Testing GET /predictive-maintenance/metrics ---")
    response = client.get("/predictive-maintenance/metrics", headers=headers)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    data = response.json()
    print("Status:", data["status"])
    if data["status"] == "LOADED":
        print("Features:", data["features"])
        print("Machine failure F1-score:", data["metrics"]["Machine failure"]["f1_score"])
        print("Machine failure Accuracy:", data["metrics"]["Machine failure"]["accuracy"])
    else:
        print("Error: Model not loaded in test environment!")
        sys.exit(1)
        
    # 2. Test /predict POST endpoint with NORMAL conditions
    print("\n--- Testing POST /predict (Normal Conditions) ---")
    normal_payload = {
        "type": "L",
        "airTemperature": 298.1,
        "processTemperature": 308.1,
        "rotationalSpeed": 1410.0,
        "torque": 45.0,
        "toolWear": 10.0
    }
    response = client.post("/predict", json=normal_payload, headers=headers)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    pred_data = response.json()
    print("Normal Conditions response:")
    print("  Machine Failure Predicted:", pred_data["machineFailurePredicted"])
    print("  Machine Failure Probability:", pred_data["machineFailureProbability"])
    
    # 3. Test /predict POST endpoint with FAILURE conditions
    print("\n--- Testing POST /predict (Failure-prone Conditions) ---")
    failure_payload = {
        "type": "L",
        "airTemperature": 304.0,
        "processTemperature": 313.8,
        "rotationalSpeed": 1200.0,
        "torque": 70.0,
        "toolWear": 230.0
    }
    response = client.post("/predict", json=failure_payload, headers=headers)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    pred_data_fail = response.json()
    print("Failure-prone Conditions response:")
    print("  Machine Failure Predicted:", pred_data_fail["machineFailurePredicted"])
    print("  Machine Failure Probability:", pred_data_fail["machineFailureProbability"])
    print("  Predicted Failure Modes:", pred_data_fail["failureModesPredicted"])
    
    print("\nAll Multi-Dataset ML verification checks passed successfully!")

if __name__ == "__main__":
    run_verification()
