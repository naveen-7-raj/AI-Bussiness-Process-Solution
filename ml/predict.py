from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap

from ml.preprocessing import FEATURE_COLUMNS, ensure_feature_order

MODEL_PATH = Path(__file__).resolve().parent / "saved_model" / "xgb_order_delay_model.joblib"
_model = None
_explainer = None


def load_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Saved model not found at {MODEL_PATH}. Run training first.")
        _model = joblib.load(MODEL_PATH)
    return _model


def load_explainer():
    """Load SHAP TreeExplainer once and cache it."""
    global _explainer
    if _explainer is None:
        model = load_model()
        _explainer = shap.TreeExplainer(model)
    return _explainer


def get_feature_explanations(features: dict) -> list[dict]:
    """
    Calculate SHAP values and return top 3 contributing features.
    Returns list of dicts with feature_name, value, and contribution.
    """
    try:
        cleaned = ensure_feature_order(features)
        row = pd.DataFrame([cleaned], columns=FEATURE_COLUMNS)
        
        explainer = load_explainer()
        shap_values = explainer.shap_values(row)
        
        if shap_values is None:
            print("[SHAP] shap_values is None")
            return []
        
        shap_array = shap_values if isinstance(shap_values, np.ndarray) else np.array(shap_values)
        if shap_array.ndim == 1:
            shap_array = shap_array.reshape(1, -1)
        
        feature_contributions = []
        for i, col in enumerate(FEATURE_COLUMNS):
            shap_val = float(shap_array[0, i])
            feature_contributions.append({
                "feature": col,
                "value": float(row[col].iloc[0]),
                "contribution": abs(shap_val),
                "direction": "increases" if shap_val > 0 else "decreases"
            })
        
        top_features = sorted(feature_contributions, key=lambda x: x["contribution"], reverse=True)[:3]
        
        return top_features
    except Exception as e:
        print(f"[SHAP] Explanation generation failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return []


def predict_delay(features: dict) -> dict:
    model = load_model()
    cleaned = ensure_feature_order(features)
    row = pd.DataFrame([cleaned], columns=FEATURE_COLUMNS)
    predicted_delay = float(model.predict(row)[0])
    probability = float(np.clip(predicted_delay / 90.0, 0.0, 1.0))

    if probability >= 0.70:
        risk_level = "high"
    elif probability >= 0.40:
        risk_level = "medium"
    else:
        risk_level = "low"

    explanations = get_feature_explanations(features) if risk_level == "high" else []

    return {
        "delay_probability": round(probability, 4),
        "risk_level": risk_level,
        "predicted_delay_minutes": round(predicted_delay, 2),
        "explanations": explanations,
    }
