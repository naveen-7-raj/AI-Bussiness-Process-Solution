import asyncio
import sys
sys.path.insert(0, '.')

# Fresh import to get latest code
import importlib
import backend.main
importlib.reload(backend.main)

import asyncpg
from backend.main import process_kafka_event

payload = {
    'event_type': 'inventory_shortage',
    'timestamp': '2026-08-18T10:00:00Z',
    'warehouse_id': 'WH04',
    'product_id': 'P004',
    'available_quantity': 4,
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
        WHERE warehouse_id = 'WH04' AND product_id = 'P004' AND recommendation_type = 'delay_risk'
        ORDER BY created_at DESC 
        LIMIT 1
    """)
    
    if recs:
        rec = recs[0]
        print("RECOMMENDATION TEXT:")
        print(rec['recommendation_text'])
    else:
        print("No delay_risk recommendation found for WH04/P004")
    
    await conn.close()

asyncio.run(main())
