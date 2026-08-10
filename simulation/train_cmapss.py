import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor, ExtraTreesRegressor, VotingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Informative sensors (excluding flat sensors: 1, 5, 10, 16, 18, 19)
INFORMATIVE_SENSORS = [f"sensor{i}" for i in [2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 20, 21]]

def build_temporal_features(df, is_multi_regime=False):
    """
    Computes rolling temporal features (mean, std, delta over window=5)
    ON THE FULL TIME SERIES per engine unit BEFORE taking final cycle.
    """
    df = df.copy()
    feature_cols = ["setting1", "setting2", "setting3"] + INFORMATIVE_SENSORS
    
    # 1. Compute rolling mean and rolling std (window=5) per engine unit
    for col in INFORMATIVE_SENSORS:
        df[f"{col}_roll_mean"] = df.groupby("unit")[col].transform(lambda x: x.rolling(window=5, min_periods=1).mean())
        df[f"{col}_roll_std"]  = df.groupby("unit")[col].transform(lambda x: x.rolling(window=5, min_periods=1).std()).fillna(0.0)
        df[f"{col}_delta5"]    = df.groupby("unit")[col].diff(5).fillna(0.0)
        
    return df

def train_cmapss_models(data_dir="data/CMAPSSData", model_output_path="simulation/cmapss_models.joblib"):
    print(f"Checking C-MAPSS data in {data_dir}...")
    
    if not os.path.exists(data_dir):
        alt = os.path.join("..", data_dir)
        if os.path.exists(alt):
            data_dir = alt
        else:
            raise FileNotFoundError(f"C-MAPSS data directory not found at {data_dir}")
            
    subsets = ["FD001", "FD002", "FD003", "FD004"]
    columns = ["unit", "cycle", "setting1", "setting2", "setting3"] + [f"sensor{i}" for i in range(1, 22)]
    
    models = {}
    metrics = {}
    
    for sub in subsets:
        train_file = os.path.join(data_dir, f"train_{sub}.txt")
        test_file = os.path.join(data_dir, f"test_{sub}.txt")
        rul_file = os.path.join(data_dir, f"RUL_{sub}.txt")
        
        if not (os.path.exists(train_file) and os.path.exists(test_file) and os.path.exists(rul_file)):
            print(f"Skipping {sub} — dataset files missing.")
            continue
            
        print(f"\n--- Advanced Temporal Training for C-MAPSS Dataset: {sub} ---")
        
        # 1. Load Train Data & compute RUL Target (Piece-wise linear capped at 125)
        train_df = pd.read_csv(train_file, sep=r"\s+", header=None)
        train_df.columns = columns
        
        max_cycles = train_df.groupby("unit")["cycle"].max().to_dict()
        train_df["RUL"] = train_df["unit"].map(max_cycles) - train_df["cycle"]
        train_df["RUL"] = train_df["RUL"].clip(upper=125)
        
        # 2. Build rolling temporal features ON FULL TRAIN TIMESERIES
        train_df = build_temporal_features(train_df, is_multi_regime=(sub in ["FD002", "FD004"]))
        feature_cols = [c for c in train_df.columns if c not in ["unit", "cycle", "RUL"]]
        
        X_train = train_df[feature_cols]
        y_train = train_df["RUL"]
        
        # 3. Fit High-Performance Stacking Ensemble (HistGradientBoosting + RandomForest + ExtraTrees)
        print(f"Fitting Ensemble Regressor for {sub} across {len(feature_cols)} temporal features...")
        hgb = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.04, max_depth=12, random_state=42)
        rf  = RandomForestRegressor(n_estimators=120, max_depth=16, random_state=42, n_jobs=-1)
        et  = ExtraTreesRegressor(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
        
        reg = VotingRegressor(estimators=[('hgb', hgb), ('rf', rf), ('et', et)])
        reg.fit(X_train, y_train)
        
        # 4. Evaluate on Test Dataset ON FULL TEST TIMESERIES BEFORE EXTRACTING LAST CYCLE
        test_df = pd.read_csv(test_file, sep=r"\s+", header=None)
        test_df.columns = columns
        
        test_df = build_temporal_features(test_df, is_multi_regime=(sub in ["FD002", "FD004"]))
        
        # Extract features from the final cycle of each test engine unit
        last_cycles = test_df.groupby("unit").last().reset_index()
        X_test = last_cycles[feature_cols]
        
        rul_df = pd.read_csv(rul_file, sep=r"\s+", header=None)
        true_ruls = rul_df[0].values
        
        predicted_ruls = reg.predict(X_test)
        
        rmse = np.sqrt(mean_squared_error(true_ruls, predicted_ruls))
        mae = mean_absolute_error(true_ruls, predicted_ruls)
        r2 = r2_score(true_ruls, predicted_ruls)
        
        print(f"✨ {sub} High-Performance Metrics -> RMSE: {rmse:.2f}, MAE: {mae:.2f}, R2: {r2:.4f}")
        
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
    
    dir_name = os.path.dirname(model_output_path)
    if dir_name and not os.path.exists(dir_name):
        model_output_path = os.path.basename(model_output_path)
        
    print(f"\nSaving high-performance model package to {model_output_path}...")
    joblib.dump(package, model_output_path)
    print("Advanced temporal C-MAPSS training complete!")

if __name__ == "__main__":
    train_cmapss_models()
