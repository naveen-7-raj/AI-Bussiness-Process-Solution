from __future__ import annotations

from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    recall_score,
    roc_auc_score,
    r2_score,
)
from xgboost import XGBRegressor

DATA_PATH = Path(__file__).resolve().parent / "data" / "processed_uci_retail_data.csv"
MODEL_PATH = Path(__file__).resolve().parent / "saved_model" / "xgb_order_delay_model.joblib"
BACKUP_PATH = Path(__file__).resolve().parent / "saved_model" / "xgb_order_delay_model.joblib.bak"

# 6 Canonical Features matching backend schema
FEATURE_COLUMNS = [
    "inventory_quantity",
    "orders_per_hour",
    "demand_rate",
    "warehouse_load",
    "processing_time",
    "backlog",
]
TARGET_COLUMN = "order_delay"

def train_and_evaluate():
    print(f"Loading processed UCI dataset from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset shape: {df.shape}")

    # Split dataset into chronological splits
    train_df = df[df["split"] == "train"].copy()
    val_df = df[df["split"] == "val"].copy()
    test_df = df[df["split"] == "test"].copy()

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TARGET_COLUMN]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df[TARGET_COLUMN]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TARGET_COLUMN]

    print(f"Train samples:      {len(X_train):,}")
    print(f"Validation samples: {len(X_val):,}")
    print(f"Test samples:       {len(X_test):,}")

    # Initialize XGBoost Regressor
    best_params = {
        "n_estimators": 300,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "reg_lambda": 1.2,
        "objective": "reg:squarederror",
        "random_state": 42,
        "tree_method": "hist",
    }

    model = XGBRegressor(**best_params)
    
    # Train model with early stopping on validation set
    print("\nTraining XGBoost model...")
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    # 1. Regression Predictions
    train_preds = model.predict(X_train)
    val_preds = model.predict(X_val)
    test_preds = model.predict(X_test)

    train_r2 = r2_score(y_train, train_preds)
    val_r2 = r2_score(y_val, val_preds)
    test_r2 = r2_score(y_test, test_preds)

    val_mae = mean_absolute_error(y_val, val_preds)
    test_mae = mean_absolute_error(y_test, test_preds)

    val_rmse = np.sqrt(mean_squared_error(y_val, val_preds))
    test_rmse = np.sqrt(mean_squared_error(y_test, test_preds))

    # 2. Risk Classification Evaluation (Binary: Risk >= 0.40 probability / >= 36 min delay)
    y_test_binary = (y_test >= 36.0).astype(int)
    test_prob = np.clip(test_preds / 90.0, 0.0, 1.0)
    test_pred_binary = (test_prob >= 0.40).astype(int)

    acc = accuracy_score(y_test_binary, test_pred_binary)
    prec = precision_score(y_test_binary, test_pred_binary, zero_division=0)
    rec = recall_score(y_test_binary, test_pred_binary, zero_division=0)
    f1 = f1_score(y_test_binary, test_pred_binary, zero_division=0)
    auc = roc_auc_score(y_test_binary, test_prob)
    cm = confusion_matrix(y_test_binary, test_pred_binary)

    print("\n=================== MODEL EVALUATION METRICS ===================")
    print(f"Train R2 Score:       {train_r2:.4f}")
    print(f"Validation R2 Score:  {val_r2:.4f}")
    print(f"Test R2 Score:        {test_r2:.4f}")
    print(f"Validation MAE:       {val_mae:.3f} minutes")
    print(f"Test MAE:             {test_mae:.3f} minutes")
    print(f"Test RMSE:            {test_rmse:.3f} minutes")
    print("----------------------------------------------------------------")
    print(f"Test Classification Accuracy: {acc*100:.2f}%")
    print(f"Test Precision:             {prec:.4f}")
    print(f"Test Recall:                {rec:.4f}")
    print(f"Test F1 Score:              {f1:.4f}")
    print(f"Test ROC-AUC Score:         {auc:.4f}")
    print("Confusion Matrix:\n", cm)
    print("================================================================")

    # Save model to model directory
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"\nSaved updated model artifact to: {MODEL_PATH}")

if __name__ == "__main__":
    train_and_evaluate()
