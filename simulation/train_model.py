import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def train_predictive_maintenance_model(data_path="data/ai4i2020.csv", model_output_path="simulation/predictive_model.joblib"):
    print(f"Loading dataset from {data_path}...")
    
    # Handle path lookup robustness
    if not os.path.exists(data_path):
        alternative_path = os.path.join("..", data_path)
        if os.path.exists(alternative_path):
            data_path = alternative_path
        else:
            raise FileNotFoundError(f"Dataset not found at {data_path} or {alternative_path}")
            
    # Load dataset
    df = pd.read_csv(data_path)
    
    # Feature columns
    feature_cols = [
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
    # Map Type: L (Low) -> 0, M (Medium) -> 1, H (High) -> 2
    type_mapping = {"L": 0, "M": 1, "H": 2}
    df_preprocessed = df.copy()
    df_preprocessed["Type"] = df_preprocessed["Type"].map(type_mapping)
    
    X = df_preprocessed[feature_cols]
    y = df_preprocessed[target_cols]
    
    # Train-test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y["Machine failure"])
    
    models = {}
    metrics = {}
    
    print("\nTraining models for each target...")
    for col in target_cols:
        print(f"Training RandomForestClassifier for: {col}")
        
        # Use class_weight='balanced' to handle severe class imbalance
        clf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight="balanced")
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
            auc = 0.5  # If only one class is present in test set
            
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
        
        print(f"Metrics for {col} -> F1: {metrics[col]['f1_score']:.4f}, AUC: {metrics[col]['roc_auc']:.4f}, Recall: {metrics[col]['recall']:.4f}")
        
    # Build package
    package = {
        "models": models,
        "metrics": metrics,
        "features": feature_cols,
        "type_mapping": type_mapping
    }
    
    # Save model package
    # Fix output path robustness
    dir_name = os.path.dirname(model_output_path)
    if dir_name and not os.path.exists(dir_name):
        # If running from simulation directory, save locally
        model_output_path = os.path.basename(model_output_path)
        
    print(f"\nSaving model package to {model_output_path}...")
    joblib.dump(package, model_output_path)
    print("Model packaging complete!")
    
    return metrics

if __name__ == "__main__":
    train_predictive_maintenance_model()
