"""
Integration verification for the SECOM defect prediction endpoints.

Tests:
  1. GET  /predictive-maintenance/secom/metrics  — model loaded, metrics present
  2. POST /predict/secom  (known-pass row)        — defectProbability should be low
  3. POST /predict/secom  (known-fail row)        — defectProbability should be higher than pass
  4. POST /train/secom                            — retraining succeeds and returns metrics
"""
import os
import sys
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from app import app, load_secom_model


def _load_secom_rows(data_dir: str):
    """Return (pass_sensors, fail_sensors) as lists of 590 floats / None."""
    features_path = os.path.join(data_dir, "secom.data")
    labels_path   = os.path.join(data_dir, "secom_labels.data")

    X = pd.read_csv(features_path, sep=" ", header=None, na_values="NaN")
    labels_df = pd.read_csv(labels_path, sep=" ", header=None)
    y = labels_df[0].values  # -1 = pass, 1 = fail

    # Pick first available pass and fail row
    pass_idx = int(np.where(y == -1)[0][0])
    fail_idx = int(np.where(y == 1)[0][0])

    def row_to_payload(idx):
        row = X.iloc[idx].tolist()
        return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else v
                for v in row]

    return row_to_payload(pass_idx), row_to_payload(fail_idx)


def run_verification():
    print("=" * 60)
    print("SECOM Defect Prediction — Integration Verification")
    print("=" * 60)

    # Force-load model
    load_secom_model()
    client = TestClient(app)

    # ------------------------------------------------------------------
    # 1. GET /predictive-maintenance/secom/metrics
    # ------------------------------------------------------------------
    print("\n--- [1] GET /predictive-maintenance/secom/metrics ---")
    resp = client.get("/predictive-maintenance/secom/metrics")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "LOADED", f"Model not loaded: {data}"

    print(f"  Status          : {data['status']}")
    print(f"  Features used   : {data['nFeaturesUsed']}")
    m = data["metrics"]
    print(f"  Accuracy        : {m['accuracy']}")
    print(f"  Precision       : {m['precision']}")
    print(f"  Recall          : {m['recall']}")
    print(f"  F1-Score        : {m['f1_score']}")
    print(f"  ROC-AUC         : {m['roc_auc']}")

    # ------------------------------------------------------------------
    # Load actual SECOM rows from disk
    # ------------------------------------------------------------------
    data_dir = "data/secom"
    if not os.path.exists(data_dir):
        data_dir = "../data/secom"
    print(f"\nLoading sample rows from '{data_dir}' ...")
    pass_sensors, fail_sensors = _load_secom_rows(data_dir)
    print(f"  Pass row index  : first -1 row  ({sum(1 for v in pass_sensors if v is not None)} non-null sensors)")
    print(f"  Fail row index  : first  1 row  ({sum(1 for v in fail_sensors if v is not None)} non-null sensors)")

    # ------------------------------------------------------------------
    # 2. POST /predict/secom — known-pass row (balanced mode, default)
    # ------------------------------------------------------------------
    print("\n--- [2] POST /predict/secom (known-pass wafer, mode=balanced) ---")
    resp = client.post("/predict/secom?mode=balanced", json={"sensors": pass_sensors})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    pass_pred = resp.json()
    print(f"  Defect Predicted    : {pass_pred['defectPredicted']}")
    print(f"  Defect Probability  : {pass_pred['defectProbability']}")
    print(f"  Features Used       : {pass_pred['nFeaturesUsed']}")
    print(f"  Mode                : {pass_pred['mode']}")
    print(f"  Threshold Used      : {pass_pred['thresholdUsed']}")
    assert pass_pred["mode"] == "balanced"

    # ------------------------------------------------------------------
    # 3. POST /predict/secom — known-fail row (balanced mode)
    # ------------------------------------------------------------------
    print("\n--- [3] POST /predict/secom (known-fail wafer, mode=balanced) ---")
    resp = client.post("/predict/secom?mode=balanced", json={"sensors": fail_sensors})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    fail_pred = resp.json()
    print(f"  Defect Predicted    : {fail_pred['defectPredicted']}")
    print(f"  Defect Probability  : {fail_pred['defectProbability']}")
    print(f"  Features Used       : {fail_pred['nFeaturesUsed']}")
    print(f"  Mode                : {fail_pred['mode']}")
    print(f"  Threshold Used      : {fail_pred['thresholdUsed']}")

    assert fail_pred["defectProbability"] >= pass_pred["defectProbability"], (
        f"Expected fail row defect probability ({fail_pred['defectProbability']}) "
        f">= pass row ({pass_pred['defectProbability']})"
    )
    print("\n  ✓ Comparison check: fail defect probability >= pass defect probability")

    # ------------------------------------------------------------------
    # 3b. POST /predict/secom — known-fail row (precision mode)
    # ------------------------------------------------------------------
    print("\n--- [3b] POST /predict/secom (known-fail wafer, mode=precision) ---")
    resp = client.post("/predict/secom?mode=precision", json={"sensors": fail_sensors})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    fail_prec = resp.json()
    print(f"  Defect Predicted    : {fail_prec['defectPredicted']}")
    print(f"  Defect Probability  : {fail_prec['defectProbability']}")
    print(f"  Mode                : {fail_prec['mode']}")
    print(f"  Threshold Used      : {fail_prec['thresholdUsed']}")
    assert fail_prec["mode"] == "precision"
    assert fail_prec["thresholdUsed"] >= fail_pred["thresholdUsed"], (
        "precision-mode threshold should be >= balanced-mode threshold"
    )
    print("  ✓ precision-mode threshold is higher than balanced-mode threshold")

    # ------------------------------------------------------------------
    # 4. POST /train/secom — retrain and reload
    # ------------------------------------------------------------------
    print("\n--- [4] POST /train/secom (re-training) ---")
    resp = client.post("/train/secom")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    train_data = resp.json()
    assert train_data["status"] == "SUCCESS", f"Training not successful: {train_data}"
    print(f"  Status  : {train_data['status']}")
    m = train_data["metrics"]
    print(f"  Balanced threshold  : {m['threshold']}")
    print(f"  Precision threshold : {m['precision_mode_threshold']}")
    print(f"  Precision @ prec-thr: {m['precision_mode_precision']}")
    assert m["precision_mode_precision"] >= 0.45, (
        f"Expected precision-mode precision >= 45%, got {m['precision_mode_precision']}"
    )

    print("\n" + "=" * 60)
    print("All SECOM integration checks passed successfully! ✓")
    print("=" * 60)



if __name__ == "__main__":
    run_verification()
