import asyncio
import sys
import asyncpg
sys.path.insert(0, '.')
from backend.main import process_kafka_event

payload = {
    'event_type': 'inventory_shortage',
    'timestamp': '2026-08-18T02:00:00Z',
    'warehouse_id': 'WH03',
    'product_id': 'P003',
    'available_quantity': 3,
    'orders_per_hour': 55,
    'demand_rate': 2.3,
    'warehouse_load': 0.85,
    'processing_time': 5.5,
    'backlog_orders': 48,
}

async def main():
    await process_kafka_event('inventory', payload)
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/app_db')
    
    recs = await conn.fetch("""
        SELECT recommendation_text, created_at 
        FROM recommendations 
        WHERE warehouse_id = 'WH03' AND product_id = 'P003' AND recommendation_type = 'delay_risk'
        ORDER BY created_at DESC 
        LIMIT 1
    """)
    
    if recs:
        rec = recs[0]
        print("RECOMMENDATION TEXT:")
        print(rec['recommendation_text'])
    else:
        print("No recommendation found")
    
    await conn.close()

asyncio.run(main())
