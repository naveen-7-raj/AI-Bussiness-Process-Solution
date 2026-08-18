import asyncio
import sys
sys.path.insert(0, '.')

# Clear module cache to get fresh imports
for mod in list(sys.modules.keys()):
    if 'ml.' in mod or 'backend' in mod:
        del sys.modules[mod]

import asyncpg
from backend.main import process_kafka_event
import time

payload = {
    'event_type': 'inventory_shortage',
    'timestamp': f'2026-08-18T{int(time.time()%86400/3600):02d}:{int((time.time()%3600)/60):02d}:00Z',
    'warehouse_id': 'WH05',
    'product_id': 'P006',
    'available_quantity': 2,
    'orders_per_hour': 60,
    'demand_rate': 2.5,
    'warehouse_load': 0.9,
    'processing_time': 6.0,
    'backlog_orders': 50,
}

async def main():
    print(f"Processing event with timestamp: {payload['timestamp']}")
    await process_kafka_event('inventory', payload)
    
    await asyncio.sleep(0.5)  # Give it a moment
    
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/app_db')
    
    recs = await conn.fetch("""
        SELECT recommendation_text, created_at 
        FROM recommendations 
        WHERE warehouse_id = 'WH05' AND product_id = 'P006' AND recommendation_type = 'delay_risk'
        ORDER BY created_at DESC 
        LIMIT 1
    """)
    
    if recs:
        rec = recs[0]
        print(f"\nFOUND RECOMMENDATION (created: {rec['created_at']}):")
        print("TEXT:")
        print(rec['recommendation_text'])
    else:
        print("NO RECOMMENDATION FOUND")
    
    await conn.close()

asyncio.run(main())
