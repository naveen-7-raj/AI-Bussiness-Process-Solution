import sys
sys.path.insert(0, '.')
from ml.predict import predict_delay

features = {
    'inventory_quantity': 2,
    'orders_per_hour': 58,
    'demand_rate': 2.4,
    'warehouse_load': 0.87,
    'processing_time': 5.7,
    'backlog': 49
}

print("Testing predict_delay...")
result = predict_delay(features)
print("FULL RESULT:")
print(f"  risk_level: {result['risk_level']}")
print(f"  delay_probability: {result['delay_probability']}")
print(f"  explanations count: {len(result.get('explanations', []))}")
if result.get('explanations'):
    print("  EXPLANATIONS:")
    for exp in result['explanations']:
        print(f"    - {exp['feature']}: {exp['direction']}")
else:
    print("  NO EXPLANATIONS")
