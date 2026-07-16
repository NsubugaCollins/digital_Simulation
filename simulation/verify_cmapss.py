import os
import sys
import pandas as pd
from fastapi.testclient import TestClient
from app import app, load_cmapss_model

def run_verification():
    print("Initializing TestClient for C-MAPSS verification...")
    # Force reload/load model
    load_cmapss_model()
    
    client = TestClient(app)
    
    # 1. Test GET /predictive-maintenance/rul/metrics
    print("\n--- Testing GET /predictive-maintenance/rul/metrics ---")
    response = client.get("/predictive-maintenance/rul/metrics")
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    data = response.json()
    print("Status:", data["status"])
    if data["status"] == "LOADED":
        print("Features:", data["features"])
        print("Metrics for FD001:")
        print(data["metrics"]["FD001"])
    else:
        print("Error: C-MAPSS models not loaded in test environment!")
        sys.exit(1)
        
    # 2. Load some actual test data to use for predicting
    print("\nLoading test data from data/CMAPSSData/test_FD001.txt...")
    data_dir = "data/CMAPSSData"
    if not os.path.exists(data_dir):
        data_dir = "../data/CMAPSSData"
        
    train_file = os.path.join(data_dir, "train_FD001.txt")
    columns = ["unit", "cycle", "setting1", "setting2", "setting3"] + [f"sensor{i}" for i in range(1, 22)]
    train_df = pd.read_csv(train_file, sep=r"\s+", header=None)
    train_df.columns = columns
    
    # Get a healthy engine sample (early cycle of unit 1)
    healthy_row = train_df[(train_df["unit"] == 1) & (train_df["cycle"] == 1)].iloc[0]
    
    # Get a deteriorated engine sample (last cycle of unit 1, which is where it failed/stopped)
    max_cycle_u1 = train_df[train_df["unit"] == 1]["cycle"].max()
    deteriorated_row = train_df[(train_df["unit"] == 1) & (train_df["cycle"] == max_cycle_u1)].iloc[0]
    
    # 3. Test POST /predict/rul with Healthy conditions
    print("\n--- Testing POST /predict/rul (Healthy engine) ---")
    healthy_payload = {
        "subset": "FD001",
        "setting1": float(healthy_row["setting1"]),
        "setting2": float(healthy_row["setting2"]),
        "setting3": float(healthy_row["setting3"]),
    }
    for i in range(1, 22):
        healthy_payload[f"sensor{i}"] = float(healthy_row[f"sensor{i}"])
        
    response = client.post("/predict/rul", json=healthy_payload)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    healthy_pred = response.json()
    print("Healthy engine response:")
    print("  Subset:", healthy_pred["subset"])
    print("  Predicted RUL:", healthy_pred["predictedRUL"])
    
    # 4. Test POST /predict/rul with Deteriorated conditions
    print("\n--- Testing POST /predict/rul (Deteriorated engine) ---")
    deteriorated_payload = {
        "subset": "FD001",
        "setting1": float(deteriorated_row["setting1"]),
        "setting2": float(deteriorated_row["setting2"]),
        "setting3": float(deteriorated_row["setting3"]),
    }
    for i in range(1, 22):
        deteriorated_payload[f"sensor{i}"] = float(deteriorated_row[f"sensor{i}"])
        
    response = client.post("/predict/rul", json=deteriorated_payload)
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    deteriorated_pred = response.json()
    print("Deteriorated engine response:")
    print("  Subset:", deteriorated_pred["subset"])
    print("  Predicted RUL:", deteriorated_pred["predictedRUL"])
    
    # Assert healthy RUL is significantly higher than deteriorated RUL
    assert healthy_pred["predictedRUL"] > deteriorated_pred["predictedRUL"], "Expected healthy RUL to be higher than deteriorated RUL"
    print("\nComparison Check Passed: Healthy RUL > Deteriorated RUL")
    
    # 5. Test POST /train/rul (Retraining)
    # We will trigger the training API to verify end-to-end flow
    print("\n--- Testing POST /train/rul (Re-training models) ---")
    # Note: re-training might take a few seconds since we fit 4 random forest models
    response = client.post("/train/rul")
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    train_data = response.json()
    print("Train status:", train_data["status"])
    print("Metrics of re-trained models:")
    print(train_data["metrics"])
    
    print("\nAll C-MAPSS RUL integration checks passed successfully!")

if __name__ == "__main__":
    run_verification()
