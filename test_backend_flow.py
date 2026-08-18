import asyncio
import sys
sys.path.insert(0, '.')

from ml.predict import predict_delay
from backend.main import build_ml_feature_row
import asyncpg

payload = {
    'event_type': 'inventory_shortage',
    'timestamp': '2026-08-18T10:01:00Z',
    'warehouse_id': 'WH04',
    'product_id': 'P005',
    'available_quantity': 2,
    'orders_per_hour': 58,
    'demand_rate': 2.4,
    'warehouse_load': 0.87,
    'processing_time': 5.7,
    'backlog_orders': 49,
}

async def main():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/app_db')
    features = await build_ml_feature_row(conn, payload)
    print("FEATURES:", features)
    
    prediction = predict_delay(features)
    print("\nPREDICTION:", prediction)
    
    event_type = 'inventory_shortage'
    if event_type == "inventory_shortage":
        available_quantity = int(payload.get("available_quantity", 0))
        if available_quantity <= 5:
            prediction["delay_probability"] = max(float(prediction.get("delay_probability", 0.0)), 0.91)
            prediction["risk_level"] = "high"
            prediction["predicted_delay_minutes"] = max(float(prediction.get("predicted_delay_minutes", 0.0)), 82.0)
    
    print("\nAFTER OVERRIDE:", prediction)
    print("EXPLANATIONS:", prediction.get("explanations", []))
    
    await conn.close()

asyncio.run(main())
