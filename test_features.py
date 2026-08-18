import sys
sys.path.insert(0, '.')
from ml.predict import predict_delay

features = {
    'inventory_quantity': 2,
    'orders_per_hour': 60,
    'demand_rate': 2.5,
    'warehouse_load': 0.9,
    'processing_time': 5.8,
    'backlog': 45,
}

result = predict_delay(features)
print("PREDICTION:", result)
