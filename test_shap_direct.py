import sys
sys.path.insert(0, '.')
from ml.predict import get_feature_explanations

features = {
    'inventory_quantity': 2,
    'orders_per_hour': 58,
    'demand_rate': 2.4,
    'warehouse_load': 0.87,
    'processing_time': 5.7,
    'backlog': 49
}

print("Testing get_feature_explanations...")
result = get_feature_explanations(features)
print("RESULT:", result)
print("LENGTH:", len(result))
