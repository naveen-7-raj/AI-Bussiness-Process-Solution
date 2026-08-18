import asyncio
import sys
sys.path.insert(0, '.')

# Fresh import
import importlib
if 'ml.predict' in sys.modules:
    del sys.modules['ml.predict']
if 'backend.main' in sys.modules:
    del sys.modules['backend.main']

import asyncpg
from backend.main import process_kafka_event

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
    await process_kafka_event('inventory', payload)
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/app_db')
    
    recs = await conn.fetch("""
        SELECT recommendation_text, created_at 
        FROM recommendations 
        WHERE warehouse_id = 'WH04' AND product_id = 'P005' AND recommendation_type = 'delay_risk'
        ORDER BY created_at DESC 
        LIMIT 1
    """)
    
    if recs:
        rec = recs[0]
        print("RECOMMENDATION TEXT:")
        print(rec['recommendation_text'])
    
    await conn.close()

asyncio.run(main())
