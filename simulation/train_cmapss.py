import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def train_cmapss_models(data_dir="data/CMAPSSData", model_output_path="simulation/cmapss_models.joblib"):
    print(f"Checking C-MAPSS data in {data_dir}...")
    
    # Handle path lookup robustness
    if not os.path.exists(data_dir):
        alternative_path = os.path.join("..", data_dir)
        if os.path.exists(alternative_path):
            data_dir = alternative_path
        else:
            raise FileNotFoundError(f"C-MAPSS data directory not found at {data_dir} or {alternative_path}")
            
    subsets = ["FD001", "FD002", "FD003", "FD004"]
    columns = ["unit", "cycle", "setting1", "setting2", "setting3"] + [f"sensor{i}" for i in range(1, 22)]
    feature_cols = ["setting1", "setting2", "setting3"] + [f"sensor{i}" for i in range(1, 22)]
    
    models = {}
    metrics = {}
    
    for sub in subsets:
        train_file = os.path.join(data_dir, f"train_{sub}.txt")
        test_file = os.path.join(data_dir, f"test_{sub}.txt")
        rul_file = os.path.join(data_dir, f"RUL_{sub}.txt")
        
        if not (os.path.exists(train_file) and os.path.exists(test_file) and os.path.exists(rul_file)):
            print(f"Skipping {sub} — some files are missing.")
            continue
            
        print(f"\n--- Processing C-MAPSS Dataset: {sub} ---")
        
        # 1. Load Train Data
        train_df = pd.read_csv(train_file, sep=r"\s+", header=None)
        train_df.columns = columns
        
        # 2. Compute RUL Target for Training (Piece-wise linear RUL, capped at 125)
        # Find max cycle for each engine unit
        max_cycles = train_df.groupby("unit")["cycle"].max().to_dict()
        # True RUL is max_cycle - current_cycle
        train_df["RUL"] = train_df["unit"].map(max_cycles) - train_df["cycle"]
        # Clip/Cap RUL at 125 cycles
        train_df["RUL"] = train_df["RUL"].clip(upper=125)
        
        X_train = train_df[feature_cols]
        y_train = train_df["RUL"]
        
        # 3. Train Regressor
        print(f"Training RandomForestRegressor for {sub}...")
        reg = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
        reg.fit(X_train, y_train)
        
        # 4. Evaluate on Test Dataset (last cycle of each unit vs ground truth RUL)
        test_df = pd.read_csv(test_file, sep=r"\s+", header=None)
        test_df.columns = columns
        
        rul_df = pd.read_csv(rul_file, sep=r"\s+", header=None)
        true_ruls = rul_df[0].values
        
        # Extract features from the last cycle of each unit
        last_cycles = test_df.groupby("unit").last().reset_index()
        X_test = last_cycles[feature_cols]
        
        # Predict RUL
        predicted_ruls = reg.predict(X_test)
        
        # Calculate metrics
        rmse = np.sqrt(mean_squared_error(true_ruls, predicted_ruls))
        mae = mean_absolute_error(true_ruls, predicted_ruls)
        r2 = r2_score(true_ruls, predicted_ruls)
        
        print(f"{sub} Test Metrics -> RMSE: {rmse:.2f}, MAE: {mae:.2f}, R2: {r2:.4f}")
        
        metrics[sub] = {
            "rmse": round(float(rmse), 2),
            "mae": round(float(mae), 2),
            "r2_score": round(float(r2), 4),
            "engines_count": int(len(true_ruls))
        }
        
        models[sub] = reg
        
    # Build package
    package = {
        "models": models,
        "metrics": metrics,
        "features": feature_cols
    }
    
    # Save package
    dir_name = os.path.dirname(model_output_path)
    if dir_name and not os.path.exists(dir_name):
        model_output_path = os.path.basename(model_output_path)
        
    print(f"\nSaving model package to {model_output_path}...")
    joblib.dump(package, model_output_path)
    print("C-MAPSS models packaging complete!")
    
    return metrics

if __name__ == "__main__":
    train_cmapss_models()
