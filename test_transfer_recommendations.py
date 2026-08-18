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
    print("TESTING INVENTORY TRANSFER RECOMMENDATIONS")
    print("=" * 80)
    
    print("\nCurrent Inventory State:")
    inv = await conn.fetch(
        "SELECT warehouse_id, product_id, available_quantity FROM inventory WHERE warehouse_id IN ('WH_TEST_03', 'WH_TEST_04') ORDER BY warehouse_id"
    )
    for row in inv:
        print(f"  {row['warehouse_id']}/{row['product_id']}: {row['available_quantity']} units")
    
    print("\nGenerating recommendations...\n")
    recommendations = await generate_recommendations(conn)
    
    # Filter for transfer recommendations
    transfer_recs = [r for r in recommendations if r.source_warehouse and r.target_warehouse]
    
    if transfer_recs:
        print(f"TRANSFER RECOMMENDATIONS ({len(transfer_recs)}):\n")
        for rec in transfer_recs:
            print(rec.to_text())
            print()
    else:
        print("No transfer recommendations generated.")
    
    all_recs = [r for r in recommendations if not (r.source_warehouse and r.target_warehouse)]
    if all_recs:
        print(f"\nOTHER RECOMMENDATIONS ({len(all_recs)}):\n")
        for rec in all_recs[:3]:  # Limit to 3 for brevity
            print(f"  - {rec.recommended_action} at {rec.target_warehouse or rec.source_warehouse}")
    
    await conn.close()

asyncio.run(main())
