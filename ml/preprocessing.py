from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "inventory_quantity",
    "orders_per_hour",
    "demand_rate",
    "warehouse_load",
    "processing_time",
    "backlog",
]
TARGET_COLUMN = "order_delay"


def build_historical_dataset(n_samples: int = 2500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    inventory_quantity = rng.integers(20, 400, size=n_samples)
    orders_per_hour = rng.integers(5, 90, size=n_samples)
    demand_rate = rng.uniform(0.4, 2.8, size=n_samples)
    warehouse_load = rng.uniform(0.2, 1.0, size=n_samples)
    processing_time = rng.uniform(0.5, 6.0, size=n_samples)
    backlog = rng.integers(0, 70, size=n_samples)

    delay = (
        5
        + 0.06 * (100 - inventory_quantity.clip(0, 100))
        + 0.35 * orders_per_hour
        + 1.8 * demand_rate
        + 8.5 * warehouse_load
        + 2.5 * processing_time
        + 0.28 * backlog
        + rng.normal(0, 2.5, size=n_samples)
    )
    delay = np.clip(delay, 0, 120)

    df = pd.DataFrame(
        {
            "inventory_quantity": inventory_quantity,
            "orders_per_hour": orders_per_hour,
            "demand_rate": demand_rate,
            "warehouse_load": warehouse_load,
            "processing_time": processing_time,
            "backlog": backlog,
            "order_delay": delay,
        }
    )

    df["inventory_quantity"] = df["inventory_quantity"].clip(0, 500)
    df["warehouse_load"] = df["warehouse_load"].clip(0.0, 1.0)
    df["processing_time"] = df["processing_time"].clip(0.1, 12.0)
    return df


def preprocess_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    cleaned = df.copy()
    cleaned = cleaned[FEATURE_COLUMNS + [TARGET_COLUMN]].dropna().copy()
    cleaned[FEATURE_COLUMNS] = cleaned[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce")
    cleaned = cleaned.dropna().reset_index(drop=True)
    X = cleaned[FEATURE_COLUMNS]
    y = cleaned[TARGET_COLUMN]
    return X, y


def save_historical_dataset(df: pd.DataFrame, path: str | Path | None = None) -> Path:
    data_dir = Path(__file__).resolve().parent / "data"
    target_path = Path(path) if path is not None else data_dir / "historical_order_delay_data.csv"
    target_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(target_path, index=False)
    return target_path


def ensure_feature_order(features: dict) -> dict:
    row = {column: float(features.get(column, 0)) for column in FEATURE_COLUMNS}
    row["inventory_quantity"] = max(0, int(row["inventory_quantity"]))
    row["orders_per_hour"] = max(0, int(row["orders_per_hour"]))
    row["demand_rate"] = max(0.0, float(row["demand_rate"]))
    row["warehouse_load"] = max(0.0, min(1.0, float(row["warehouse_load"])))
    row["processing_time"] = max(0.1, float(row["processing_time"]))
    row["backlog"] = max(0, int(row["backlog"]))
    return row
