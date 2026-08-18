from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.preprocessing import FEATURE_COLUMNS, TARGET_COLUMN, build_historical_dataset, preprocess_data

MODEL_PATH = Path(__file__).resolve().parent / "saved_model" / "xgb_order_delay_model.joblib"


def evaluate_model() -> dict:
    df = build_historical_dataset(n_samples=2500, seed=7)
    X, y = preprocess_data(df)

    model = joblib.load(MODEL_PATH)
    test_predictions = model.predict(X)

    metrics = {
        "mae": float(mean_absolute_error(y, test_predictions)),
        "rmse": float(np.sqrt(mean_squared_error(y, test_predictions))),
        "r2": float(r2_score(y, test_predictions)),
    }
    return metrics


if __name__ == "__main__":
    metrics = evaluate_model()
    print("Model evaluation:")
    print(f"MAE: {metrics['mae']:.3f} minutes")
    print(f"RMSE: {metrics['rmse']:.3f} minutes")
    print(f"R2: {metrics['r2']:.4f}")
