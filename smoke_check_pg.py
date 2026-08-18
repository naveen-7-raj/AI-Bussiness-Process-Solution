import asyncio
import asyncpg
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/app_db")

async def check():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        for attempt in range(15):
            row = await conn.fetchrow(
                "SELECT available_quantity, updated_at FROM inventory "
                "WHERE warehouse_id = $1 AND product_id = $2 "
                "ORDER BY updated_at DESC LIMIT 1",
                "WH01", "P001"
            )
            be_row = await conn.fetchrow(
                "SELECT id, event_type, event_timestamp FROM business_events "
                "WHERE event_type = $1 AND event_data->>'warehouse_id' = $2 "
                "ORDER BY id DESC LIMIT 1",
                "inventory_shortage", "WH01"
            )
            pred_row = await conn.fetchrow(
                "SELECT id, prediction_value FROM predictions "
                "WHERE prediction_type = $1 AND warehouse_id = $2 "
                "ORDER BY id DESC LIMIT 1",
                "inventory_shortage", "WH01"
            )
            rec_row = await conn.fetchrow(
                "SELECT id, recommendation_text FROM recommendations "
                "WHERE recommendation_type = $1 AND warehouse_id = $2 "
                "ORDER BY id DESC LIMIT 1",
                "restock", "WH01"
            )
            if row and be_row:
                print(f"  [inventory]       qty={row['available_quantity']} updated={row['updated_at']}")
                print(f"  [business_events] id={be_row['id']} type={be_row['event_type']} ts={be_row['event_timestamp']}")
                if pred_row:
                    print(f"  [predictions]     id={pred_row['id']} value={pred_row['prediction_value']}")
                else:
                    print("  [predictions]     NO ROW YET")
                if rec_row:
                    print(f"  [recommendations] id={rec_row['id']} text={rec_row['recommendation_text'][:60]}")
                else:
                    print("  [recommendations] NO ROW YET")
                return True
            print(f"  attempt {attempt+1}/15 — waiting for consumer...")
            await asyncio.sleep(1)
        return False
    finally:
        await conn.close()

result = asyncio.run(check())
print("POSTGRES CHECK:", "PASS" if result else "FAIL — consumer did not write within 15s")
