import asyncio
import sys
sys.path.insert(0, '.')

# Clear cache
for mod in list(sys.modules.keys()):
    if 'backend.' in mod:
        del sys.modules[mod]

import asyncpg
from backend.recommendations_engine import generate_recommendations

async def main():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/app_db')
    
    print("=" * 80)
    print("DETERMINISTIC RECOMMENDATION ENGINE TEST")
    print("=" * 80)
    print("\nFetching current warehouse state...")
    
    warehouses = await conn.fetch("SELECT warehouse_id, backlog_orders, avg_processing_time_sec FROM warehouses LIMIT 5")
    print(f"Found {len(warehouses)} warehouses:")
    for wh in warehouses:
        print(f"  - {wh['warehouse_id']}: backlog={wh['backlog_orders']}, processing_time={wh['avg_processing_time_sec']}s")
    
    print("\nGenerating recommendations...")
    recommendations = await generate_recommendations(conn)
    
    print(f"\nGenerated {len(recommendations)} recommendations:\n")
    for i, rec in enumerate(recommendations, 1):
        print(f"--- RECOMMENDATION {i} ---")
        print(rec.to_text())
        print()
    
    await conn.close()

asyncio.run(main())
