from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from ml.preprocessing import FEATURE_COLUMNS, TARGET_COLUMN, build_historical_dataset, preprocess_data, save_historical_dataset

DATA_PATH = Path(__file__).resolve().parent / "data" / "historical_order_delay_data.csv"
MODEL_PATH = Path(__file__).resolve().parent / "saved_model" / "xgb_order_delay_model.joblib"


def train_model() -> tuple[XGBRegressor, dict]:
    historical_df = build_historical_dataset(n_samples=2500, seed=42)
    save_historical_dataset(historical_df, DATA_PATH)

    X, y = preprocess_data(historical_df)
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    model = XGBRegressor(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.5,
        objective="reg:squarederror",
        random_state=42,
        tree_method="hist",
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    metrics = {
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
        "r2": float(r2_score(y_test, predictions)),
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    return model, metrics


if __name__ == "__main__":
    model, metrics = train_model()
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved dataset to: {DATA_PATH}")
    print(f"MAE: {metrics['mae']:.3f} minutes")
    print(f"RMSE: {metrics['rmse']:.3f} minutes")
    print(f"R2: {metrics['r2']:.4f}")
