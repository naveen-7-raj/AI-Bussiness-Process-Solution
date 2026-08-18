# Model Explainability with SHAP

This document explains how the XGBoost order delay prediction model provides explainability using SHAP (SHapley Additive exPlanations).

## What is SHAP?

SHAP values explain the contribution of each feature to a model's prediction. For each prediction, SHAP calculates:
- How much each input feature pushes the prediction up or down
- The magnitude of that contribution
- Whether the feature increases or decreases risk

## How It Works in This System

### Prediction Flow
```
Kafka Event (inventory_shortage)
    ↓
Extract Business State (current inventory, backlog, processing time)
    ↓
Feed to XGBoost Model
    ↓
Get Prediction (delay_probability, risk_level)
    ↓
IF risk_level == HIGH:
    ├─ Calculate SHAP Values
    ├─ Extract Top 3 Contributing Features
    └─ Store Explanation with Prediction
```

### Example: High-Risk Shortage Event

**Input Features:**
- available_quantity: 1 (critical low!)
- orders_per_hour: 65 (high demand)
- warehouse_load: 0.95 (nearly full)
- processing_time: 7.0 (slow processing)
- backlog: 55 (backed up)

**Model Output:**
```
Prediction: delay_probability = 0.91 (HIGH RISK)

SHAP Explanations (Top Factors):
1. Orders Per Hour (65) → increases risk
2. Backlog (55) → increases risk
3. Processing Time (7.0) → increases risk
```

This tells the business: "*Orders are piling up, processing is slow, and we're almost out of stock.*"

## Key Advantages

✅ **Transparent**: No black box - see exactly why a prediction was made  
✅ **Trustworthy**: Based on model internals, not AI hallucination  
✅ **Actionable**: Top factors show where to intervene  
✅ **Persistent**: Explanations stored with every HIGH-risk prediction  

## Database Storage

High-risk predictions are stored in two tables:

### `predictions` table
- Stores the numeric prediction: `delay_probability`
- Can be aggregated for trends and patterns

### `recommendations` table  
- Stores human-readable explanation with:
  - Risk assessment
  - Top 3 SHAP feature contributions
  - Actual values for each feature
  - Direction of impact (increases/decreases risk)

## Example Query

To see all high-risk predictions with explanations:

```sql
SELECT 
    warehouse_id,
    product_id,
    prediction_value,
    recommendation_text,
    created_at
FROM recommendations
WHERE recommendation_type = 'delay_risk'
ORDER BY created_at DESC
LIMIT 10;
```

Output shows explanations like:
```
Risk level HIGH at WH01: delay_probability=0.91

SHAP Feature Contributions (Top Factors):
1. Processing Time: increases risk (value: 7.00)
2. Backlog: increases risk (value: 55.00)
3. Orders Per Hour: increases risk (value: 65.00)
```

## Performance Considerations

- SHAP explanations computed **only for HIGH-risk predictions** (not for low/medium)
- Explainer model loaded **once and cached** in memory
- Minimal overhead: ~5-10ms per prediction calculation
- Suitable for real-time Kafka event processing

## No Model Retraining

- Model predictions remain the same (XGBoost delay estimation)
- SHAP only provides *interpretation layer* 
- Saved model at `ml/saved_model/xgb_order_delay_model.joblib` is unchanged
- Training pipeline remains in `ml/train.py`

## Implementation Files

- `ml/predict.py` - SHAP integration and explanation generation
- `backend/main.py` - Explanation storage with predictions
- `backend/requirements.txt` - SHAP dependency
