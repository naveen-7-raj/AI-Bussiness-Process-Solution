import asyncio
import sys
sys.path.insert(0, '.')

# Clear module cache
for mod in list(sys.modules.keys()):
    if 'ml.' in mod or 'backend' in mod:
        del sys.modules[mod]

import asyncpg
from backend.main import process_kafka_event
import time

payload = {
    'event_type': 'inventory_shortage',
    'timestamp': f'2026-08-18T{int(time.time()%86400/3600):02d}:{int((time.time()%3600)/60):02d}:00Z',
    'warehouse_id': 'WH06',
    'product_id': 'P007',
    'available_quantity': 2,
    'orders_per_hour': 60,
    'demand_rate': 2.5,
    'warehouse_load': 0.9,
    'processing_time': 6.0,
    'backlog_orders': 50,
}

async def main():
    print("Running test...")
    await process_kafka_event('inventory', payload)
    await asyncio.sleep(0.5)
    print("Test complete.")

asyncio.run(main())
