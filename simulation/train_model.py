import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def train_predictive_maintenance_model(data_path="data/combined_predictive_maintenance.csv", model_output_path="simulation/predictive_model.joblib"):
    print(f"Loading dataset from {data_path}...")
    
    # Handle path lookup robustness
    if not os.path.exists(data_path):
        alt_path = os.path.join("..", data_path)
        if os.path.exists(alt_path):
            data_path = alt_path
        elif os.path.exists("data/ai4i2020.csv"):
            data_path = "data/ai4i2020.csv"
        elif os.path.exists("../data/ai4i2020.csv"):
            data_path = "../data/ai4i2020.csv"
        else:
            raise FileNotFoundError(f"Dataset not found at {data_path}")
            
    # Load dataset
    df = pd.read_csv(data_path)
    print(f"Successfully loaded dataset with {len(df)} records.")
    
    # Base feature columns
    base_feature_cols = [
        "Type",
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]"
    ]
    
    # Target columns
    target_cols = [
        "Machine failure",
        "TWF",
        "HDF",
        "PWF",
        "OSF",
        "RNF"
    ]
    
    # Preprocessing
    type_mapping = {"L": 0, "M": 1, "H": 2}
    df_preprocessed = df.copy()
    df_preprocessed["Type"] = df_preprocessed["Type"].map(type_mapping).fillna(1)
    
    # Feature Engineering
    df_preprocessed["Power_W"] = df_preprocessed["Torque [Nm]"] * (df_preprocessed["Rotational speed [rpm]"] * 2 * np.pi / 60)
    df_preprocessed["Temp_Diff"] = df_preprocessed["Process temperature [K]"] - df_preprocessed["Air temperature [K]"]
    df_preprocessed["Strain_Index"] = df_preprocessed["Tool wear [min]"] * df_preprocessed["Torque [Nm]"]
    
    feature_cols = base_feature_cols + ["Power_W", "Temp_Diff", "Strain_Index"]
    
    # Include vibration metrics if present in combined dataset
    if "Vibration_RMS" in df_preprocessed.columns:
        feature_cols.extend(["Vibration_RMS", "Kurtosis", "Crest_Factor", "Peak_Accel"])
        
    X = df_preprocessed[feature_cols]
    y = df_preprocessed[target_cols]
    
    # Train-test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y["Machine failure"])
    
    models = {}
    metrics = {}
    
    print(f"\nTraining enhanced multi-dataset models across {len(feature_cols)} features...")
    for col in target_cols:
        print(f"Training ensemble model for: {col}")
        
        # Use class_weight='balanced' to handle severe class imbalance
        clf = RandomForestClassifier(n_estimators=150, max_depth=16, random_state=42, class_weight="balanced", n_jobs=-1)
        clf.fit(X_train, y_train[col])
        
        # Predict
        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test)[:, 1] if hasattr(clf, "predict_proba") else y_pred
        
        # Calculate metrics
        acc = accuracy_score(y_test[col], y_pred)
        prec = precision_score(y_test[col], y_pred, zero_division=0)
        rec = recall_score(y_test[col], y_pred, zero_division=0)
        f1 = f1_score(y_test[col], y_pred, zero_division=0)
        
        try:
            auc = roc_auc_score(y_test[col], y_prob)
        except ValueError:
            auc = 0.5
            
        metrics[col] = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(auc), 4),
            "positive_count_test": int(y_test[col].sum()),
            "total_count_test": int(len(y_test))
        }
        
        models[col] = clf
        print(f"Metrics for {col} -> Acc: {acc:.4f}, F1: {f1:.4f}, AUC: {auc:.4f}, Recall: {rec:.4f}")
        
    # Build package
    package = {
        "models": models,
        "metrics": metrics,
        "features": feature_cols,
        "base_features": base_feature_cols,
        "type_mapping": type_mapping
    }
    
    # Save model package
    dir_name = os.path.dirname(model_output_path)
    if dir_name and not os.path.exists(dir_name):
        model_output_path = os.path.basename(model_output_path)
        
    print(f"\nSaving combined model package to {model_output_path}...")
    joblib.dump(package, model_output_path)
    print("Multi-dataset model training complete!")
    
    return metrics

if __name__ == "__main__":
    train_predictive_maintenance_model()
