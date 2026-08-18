import asyncio
import sys
sys.path.insert(0, '.')
from ml.predict import predict_delay

features = {
    'inventory_quantity': 1,
    'orders_per_hour': 50,
    'demand_rate': 2.2,
    'warehouse_load': 0.8,
    'processing_time': 6.5,
    'backlog': 50,
}

result = predict_delay(features)
print("PREDICTION RESULT:", result)
print("\nEXPLANATIONS:")
for exp in result.get('explanations', []):
    print(f"  - {exp['feature']}: {exp['direction']} risk (value: {exp['value']:.2f}, contribution: {exp['contribution']:.4f})")
