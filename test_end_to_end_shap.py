import asyncio
import sys
import asyncpg
sys.path.insert(0, '.')
from backend.main import process_kafka_event

payload = {
    'event_type': 'inventory_shortage',
    'timestamp': '2026-08-18T01:00:00Z',
    'warehouse_id': 'WH02',
    'product_id': 'P002',
    'available_quantity': 2,
    'orders_per_hour': 60,
    'demand_rate': 2.5,
    'warehouse_load': 0.9,
    'processing_time': 5.8,
    'backlog_orders': 45,
}

async def main():
    await process_kafka_event('inventory', payload)
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/app_db')
    
    recs = await conn.fetch("""
        SELECT warehouse_id, product_id, recommendation_type, recommendation_text, created_at 
        FROM recommendations 
        WHERE recommendation_type = 'delay_risk' AND warehouse_id = 'WH02' AND product_id = 'P002'
        ORDER BY created_at DESC 
        LIMIT 1
    """)
    
    if recs:
        rec = recs[0]
        print("WAREHOUSE:", rec['warehouse_id'])
        print("PRODUCT:", rec['product_id'])
        print("\nRECOMMENDATION TEXT:")
        print(rec['recommendation_text'])
    else:
        print("No recommendation found for WH02/P002")
    
    await conn.close()

asyncio.run(main())
