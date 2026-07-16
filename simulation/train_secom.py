import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report,
    precision_recall_curve
)


def train_secom_model(
    data_dir: str = "data/secom",
    model_output_path: str = "simulation/secom_model.joblib",
) -> dict:
    """
    Advanced training pipeline for the SECOM semiconductor defect dataset.

    Steps
    -----
    1. Load secom.data + secom_labels.data.
    2. Drop sensor columns with > 50 % missing values.
    3. Drop constant/low-variance features (variance < 1e-4).
    4. Correlation filtering (drop duplicate features with |r| > 0.90).
    5. Stratified 80/20 train/test split.
    6. Median-impute and standard-scale.
    7. Train Calibrated RandomForest (isotonic, cv=3) for well-calibrated probabilities.
    8. Compute TWO decision thresholds:
       - 'balanced'  : maximises F1-score   → best overall detection performance.
       - 'precision' : first threshold where precision >= 50 %
                       → primary/autonomous decision mode (low false-alarm rate).
    9. Serialize complete inference package.
    """
    print(f"Checking SECOM data in '{data_dir}' ...")

    # Resolve path (handles running from project root OR simulation/ directory)
    if not os.path.exists(data_dir):
        alt = os.path.join("..", data_dir)
        if os.path.exists(alt):
            data_dir = alt
        else:
            raise FileNotFoundError(
                f"SECOM data directory not found at '{data_dir}' or '{alt}'"
            )

    features_path = os.path.join(data_dir, "secom.data")
    labels_path   = os.path.join(data_dir, "secom_labels.data")

    # 1. Load raw data
    print("Loading features ...")
    X_raw = pd.read_csv(features_path, sep=" ", header=None, na_values="NaN")
    print(f"  Raw shape: {X_raw.shape}")

    print("Loading labels ...")
    labels_df = pd.read_csv(labels_path, sep=" ", header=None)
    y_raw = labels_df[0].values

    # 2. Remap labels: -1 → 0 (pass), 1 → 1 (fail)
    y = np.where(y_raw == 1, 1, 0).astype(int)
    n_fail = int(y.sum())
    n_pass = int((y == 0).sum())
    print(f"  Class distribution — Pass (0): {n_pass}, Fail (1): {n_fail} "
          f"({100 * n_fail / len(y):.1f} % failure rate)")

    # 3. Drop columns with > 50% NaNs
    nan_frac = X_raw.isnull().mean()
    keep_mask = nan_frac <= 0.50
    X_filtered = X_raw.loc[:, keep_mask]
    print(f"  Dropped {X_raw.shape[1] - X_filtered.shape[1]} columns with >50% NaN")

    # 4. Drop near-constant columns (variance < 1e-4)
    # Fill NaNs temporarily with median for variance check
    temp_imp = SimpleImputer(strategy="median")
    temp_X = pd.DataFrame(temp_imp.fit_transform(X_filtered), columns=X_filtered.columns)
    variances = temp_X.var()
    low_var_mask = variances >= 1e-4
    X_filtered = X_filtered.loc[:, low_var_mask]
    print(f"  Dropped {low_var_mask.shape[0] - X_filtered.shape[1]} low-variance columns")

    # 5. Drop highly correlated columns (|r| > 0.90)
    # Drop correlation duplicates based on temporary imputed data
    temp_X_filtered = temp_X.loc[:, low_var_mask]
    corr_matrix = temp_X_filtered.corr().abs()
    upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
    to_drop = [col for col in upper_tri.columns if any(upper_tri[col] > 0.90)]
    X_filtered = X_filtered.drop(columns=to_drop)
    feature_cols = X_filtered.columns.tolist()
    print(f"  Dropped {len(to_drop)} highly correlated duplicate columns")
    print(f"  Final features retained: {len(feature_cols)}")

    # 6. Stratified train/test split
    X_tr_raw, X_te_raw, y_train, y_test = train_test_split(
        X_filtered.values, y, test_size=0.20, random_state=42, stratify=y
    )

    # 7. Median imputation
    print("Imputing missing values with median strategy ...")
    imputer = SimpleImputer(strategy="median")
    X_train_imp = imputer.fit_transform(X_tr_raw)
    X_test_imp  = imputer.transform(X_te_raw)

    # 8. Standard scaling
    print("Standard-scaling features ...")
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_imp)
    X_test  = scaler.transform(X_test_imp)

    # 9. Train Calibrated Random Forest classifier
    print("Training calibrated RandomForest classifier ...")
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=6,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )

    # Use CalibratedClassifierCV with 3-fold cross-validation
    clf = CalibratedClassifierCV(estimator=rf, method="isotonic", cv=3)
    clf.fit(X_train, y_train)

    # 10. Compute probability scores and the full PR curve
    y_prob = clf.predict_proba(X_test)[:, 1]
    precision_vals, recall_vals, thresholds = precision_recall_curve(y_test, y_prob)
    safe_thresholds = np.append(thresholds, 1.0)   # len matches precision_vals / recall_vals

    # ── Threshold A: maximise F1 (balanced mode) ──────────────────────────────
    f1_scores = 2 * precision_vals * recall_vals / (precision_vals + recall_vals + 1e-8)
    best_idx        = int(np.argmax(f1_scores))
    threshold_f1    = float(safe_thresholds[best_idx])

    # ── Threshold B: first point where precision >= 50 % (precision mode) ─────
    prec50_mask = precision_vals >= 0.50
    if prec50_mask.any():
        prec50_idx    = int(np.argmax(prec50_mask))
        threshold_p50 = float(safe_thresholds[prec50_idx])
    else:
        # Fall back to highest achievable precision threshold
        threshold_p50 = float(safe_thresholds[-2])   # second-to-last (before 1.0)
        print("  [Warning] Precision >= 50% not achievable; using max-precision threshold.")

    # ── Evaluate both thresholds ───────────────────────────────────────────────
    roc_auc = roc_auc_score(y_test, y_prob)

    def _eval(thr, label):
        y_pred = (y_prob >= thr).astype(int)
        p = precision_score(y_test, y_pred, zero_division=0)
        r = recall_score(y_test, y_pred, zero_division=0)
        f = f1_score(y_test, y_pred, zero_division=0)
        a = accuracy_score(y_test, y_pred)
        print(f"\n[{label}] threshold = {thr:.4f}")
        print(f"  Accuracy  : {a:.4f}")
        print(f"  Precision : {p:.4f}")
        print(f"  Recall    : {r:.4f}")
        print(f"  F1-Score  : {f:.4f}")
        print(f"  ROC-AUC   : {roc_auc:.4f}")
        print(classification_report(y_test, y_pred, target_names=["Pass", "Fail"]))
        return a, p, r, f

    acc_b, prec_b, rec_b, f1_b = _eval(threshold_f1,  "BALANCED  — max F1")
    acc_p, prec_p, rec_p, f1_p = _eval(threshold_p50, "PRECISION — ≥50% prec")

    metrics = {
        # ---- balanced mode (default) ----
        "accuracy":         round(float(acc_b),  4),
        "precision":        round(float(prec_b), 4),
        "recall":           round(float(rec_b),  4),
        "f1_score":         round(float(f1_b),   4),
        "roc_auc":          round(float(roc_auc),4),
        "threshold":        round(threshold_f1,  4),
        # ---- precision mode ----
        "precision_mode_threshold": round(threshold_p50, 4),
        "precision_mode_precision": round(float(prec_p), 4),
        "precision_mode_recall":    round(float(rec_p),  4),
        "precision_mode_f1":        round(float(f1_p),   4),
        # ---- dataset stats ----
        "n_samples":        int(len(y)),
        "n_features_kept":  int(len(feature_cols)),
        "n_fail":           int(n_fail),
        "n_pass":           int(n_pass),
    }

    # 11. Serialize full inference pipeline (both thresholds included)
    package = {
        "model":               clf,
        "imputer":             imputer,
        "scaler":              scaler,
        "feature_cols":        feature_cols,
        "threshold":           threshold_f1,    # balanced mode (default)
        "threshold_precision": threshold_p50,   # precision mode (≥50% precision)
        "metrics":             metrics,
    }

    # Resolve output path
    out_path = model_output_path
    dir_name = os.path.dirname(out_path)
    if dir_name and not os.path.exists(dir_name):
        out_path = os.path.basename(out_path)

    print(f"\nSaving SECOM model package to '{out_path}' ...")
    joblib.dump(package, out_path)
    print("SECOM model packaging complete!")

    return metrics


if __name__ == "__main__":
    train_secom_model()
