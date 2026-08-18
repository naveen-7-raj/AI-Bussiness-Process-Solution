import sys
sys.path.insert(0, '.')
from ml.predict import predict_delay

features = {
    'inventory_quantity': 3,
    'orders_per_hour': 55,
    'demand_rate': 2.3,
    'warehouse_load': 0.85,
    'processing_time': 5.5,
    'backlog': 48,
}

result = predict_delay(features)
print("FULL RESULT:")
print(result)
