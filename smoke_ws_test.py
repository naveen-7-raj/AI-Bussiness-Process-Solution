"""
Smoke test: Recommendation → WebSocket → React Dashboard
Steps:
1. Connect a WebSocket client to ws://127.0.0.1:8000/api/ws
2. Trigger INVENTORY_SHORTAGE via Kafka
3. Wait up to 20s to receive the broadcast
4. Verify payload contains: risk=HIGH, recommendation, root_cause
"""
import asyncio
import json
import sys
import websockets

WS_URL = "ws://127.0.0.1:8000/api/ws"

async def ws_smoke_test():
    results = {}

    # ── Step 1: WebSocket handshake ──────────────────────────────────────────
    try:
        async with websockets.connect(WS_URL, open_timeout=8) as ws:
            print(f"  [WebSocket]   Connected to {WS_URL}")
            results["WebSocket connect"] = True

            # ── Step 2: Trigger INVENTORY_SHORTAGE via Kafka ─────────────────
            import json as _json
            from kafka import KafkaProducer
            producer = KafkaProducer(
                bootstrap_servers=["localhost:9092"],
                request_timeout_ms=5000,
            )
            event = {
                "event_type": "inventory_shortage",
                "timestamp": "2026-08-18T16:10:00+00:00",
                "warehouse_id": "WH02",
                "product_id": "P002",
                "available_quantity": 2,
            }
            future = producer.send("inventory", _json.dumps(event).encode())
            producer.flush(timeout=10)
            meta = future.get(timeout=10)
            print(f"  [Kafka]       Produced event to {meta.topic} offset={meta.offset}")
            results["Kafka produce"] = True

            # ── Step 3: Wait for broadcast ───────────────────────────────────
            print("  [WebSocket]   Waiting for broadcast (up to 20s)...")
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=20)
                msg = json.loads(raw)
                print(f"  [WebSocket]   Received message keys: {list(msg.keys())}")
                results["WebSocket receive"] = True

                # ── Step 4: Validate payload ─────────────────────────────────
                risk = msg.get("risk", "")
                recommendation = msg.get("recommendation", "")
                root_cause = msg.get("root_cause", "")
                event_name = msg.get("event", "")

                print(f"  [Payload]     event={event_name}")
                print(f"  [Payload]     risk={risk}")
                print(f"  [Payload]     recommendation={recommendation[:80]}")
                print(f"  [Payload]     root_cause={root_cause[:80]}")

                results["risk=HIGH"] = risk.upper() == "HIGH"
                results["has recommendation"] = bool(recommendation)
                results["has root_cause"] = bool(root_cause)

            except asyncio.TimeoutError:
                print("  [WebSocket]   TIMEOUT — no broadcast received in 20s")
                results["WebSocket receive"] = False

    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"  [WebSocket]   ERROR: {type(e).__name__}: {e}")
        results["WebSocket connect"] = False

    return results

results = asyncio.run(ws_smoke_test())

print()
print("=" * 52)
print("SMOKE TEST RESULTS  —  Recommendation→WS→Dashboard")
print("=" * 52)
for stage, ok in results.items():
    status = "PASS" if ok else "FAIL"
    print(f"  {stage:<28} {status}")

all_pass = all(results.values())
print()
print(f"OVERALL: {'PASS' if all_pass else 'FAIL'}")
sys.exit(0 if all_pass else 1)
