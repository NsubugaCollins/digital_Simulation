import sys
from fastapi.testclient import TestClient
from app import app, load_model

def run_verification():
    print("Initializing TestClient...")
    # Force reload/load model
    load_model()
    
    client = TestClient(app)
    
    # 1. Test /predictive-maintenance/metrics GET endpoint
    print("\n--- Testing GET /predictive-maintenance/metrics ---")
    response = client.get("/predictive-maintenance/metrics")
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    data = response.json()
    print("Status:", data["status"])
    if data["status"] == "LOADED":
        print("Features:", data["features"])
        print("Machine failure F1-score:", data["metrics"]["Machine failure"]["f1_score"])
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
    response = client.post("/predict", json=normal_payload)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    pred_data = response.json()
    print("Normal Conditions response:")
    print("  Machine Failure Predicted:", pred_data["machineFailurePredicted"])
    print("  Machine Failure Probability:", pred_data["machineFailureProbability"])
    print("  Predicted Failure Modes:", pred_data["failureModesPredicted"])
    
    # Assert normal condition has low probability of failure
    assert pred_data["machineFailureProbability"] < 0.5, "Expected failure probability to be low for normal conditions"
    
    # 3. Test /predict POST endpoint with FAILURE conditions (High Tool Wear + High Torque)
    print("\n--- Testing POST /predict (Failure-prone Conditions) ---")
    failure_payload = {
        "type": "L",
        "airTemperature": 304.0,
        "processTemperature": 310.0,
        "rotationalSpeed": 2800.0,
        "torque": 75.0,
        "toolWear": 240.0
    }
    response = client.post("/predict", json=failure_payload)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    fail_pred_data = response.json()
    print("Failure-prone Conditions response:")
    print("  Machine Failure Predicted:", fail_pred_data["machineFailurePredicted"])
    print("  Machine Failure Probability:", fail_pred_data["machineFailureProbability"])
    print("  Predicted Failure Modes:", fail_pred_data["failureModesPredicted"])
    print("  Failure Modes Probabilities:", fail_pred_data["failureModesProbability"])
    
    # Assert failure condition has high probability of failure
    assert fail_pred_data["machineFailureProbability"] > 0.5, "Expected failure probability to be high for failure-prone conditions"
    
    # 4. Test /train POST endpoint
    print("\n--- Testing POST /train (Re-training Model) ---")
    # We will trigger the training API to verify end-to-end flow
    response = client.post("/train")
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    train_data = response.json()
    print("Train status:", train_data["status"])
    print("Metrics of re-trained model for Machine failure:")
    print(train_data["metrics"]["Machine failure"])
    
    print("\nAll integration checks passed successfully!")

if __name__ == "__main__":
    run_verification()
