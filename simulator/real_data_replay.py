from __future__ import annotations

import sys
import json
import time
import argparse
from pathlib import Path
import pandas as pd
from kafka import KafkaProducer, KafkaAdminClient
from kafka.admin import NewTopic

KAFKA_BROKER = "localhost:9092"
TOPICS = ["orders", "inventory", "warehouse", "logistics"]

DATA_PATH = Path(__file__).resolve().parent.parent / "ml" / "data" / "processed_uci_retail_data.csv"

COUNTRY_WH_MAP = {
    "United Kingdom": "WH01",
    "Germany": "WH02",
    "France": "WH03",
    "EIRE": "WH04",
    "Spain": "WH05",
    "Netherlands": "WH02",
    "Belgium": "WH03",
    "Switzerland": "WH04",
    "Portugal": "WH05",
    "Australia": "WH01",
}

def ensure_topics():
    try:
        admin = KafkaAdminClient(bootstrap_servers=KAFKA_BROKER)
        existing = admin.list_topics()
        new_topics = [
            NewTopic(name=t, num_partitions=1, replication_factor=1)
            for t in TOPICS if t not in existing
        ]
        if new_topics:
            admin.create_topics(new_topics=new_topics, validate_only=False)
            print(f"[REPLAY] Kafka topics created: {', '.join([t.name for t in new_topics])}")
        admin.close()
    except Exception as e:
        print(f"[REPLAY] Kafka topic check warning: {e}")

def map_warehouse(country: str, stock_code: str) -> str:
    if country in COUNTRY_WH_MAP:
        return COUNTRY_WH_MAP[country]
    # Deterministic fallback based on stock code hash
    wh_idx = (sum(ord(c) for c in str(stock_code)) % 5) + 1
    return f"WH{wh_idx:02d}"

def run_real_data_replay(speed: float = 100.0, max_events: int = 1000):
    print(f"\n============================================================")
    print(f" NEXORA REAL DATA EVENT REPLAY SYSTEM")
    print(f" Source Dataset: UCI Online Retail II ({DATA_PATH.name})")
    print(f" Speed Multiplier: {speed}x | Max Replay Events: {max_events}")
    print(f"============================================================\n")

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Processed dataset not found at {DATA_PATH}. Run preprocessing first.")

    ensure_topics()

    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BROKER,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        print("[REPLAY] Connected to Kafka Producer successfully.")
    except Exception as e:
        print(f"[REPLAY] Kafka connection failed: {e}")
        return

    print("[REPLAY] Loading historical dataset in chronological order...")
    df = pd.read_csv(DATA_PATH)
    df["invoice_date"] = pd.to_datetime(df["invoice_date"])
    df.sort_values("invoice_date", inplace=True)
    df.reset_index(drop=True, inplace=True)

    records = df.head(max_events).to_dict(orient="records")
    print(f"[REPLAY] Starting replay of {len(records):,} chronological transactions...")

    base_delay = 0.5 / max(1.0, speed)

    for idx, row in enumerate(records, 1):
        country = str(row.get("country_encoded", "United Kingdom"))
        stock = str(row.get("stock_code", "P001"))
        wh_id = map_warehouse(country, stock)
        
        qty = int(row.get("quantity", 1))
        is_cancellation = int(row.get("cancellation_indicator", 0)) == 1
        
        event_type = "order_cancelled" if is_cancellation else ("demand_spike" if qty > 20 else "order_created")

        event_payload = {
            "event_type": event_type,
            "order_id": str(row.get("invoice_no", f"INV-{idx}")),
            "warehouse_id": wh_id,
            "product_id": f"P{str(stock)[:4].zfill(3)}",
            "quantity": abs(qty),
            "unit_price": float(row.get("unit_price", 2.5)),
            "total_value": float(row.get("total_value", 5.0)),
            "country": country,
            "timestamp": str(row.get("invoice_date")),
            "inventory_quantity": int(row.get("inventory_quantity", 100)),
            "orders_per_hour": int(row.get("orders_per_hour", 12)),
            "demand_rate": float(row.get("demand_rate", 1.0)),
            "warehouse_load": float(row.get("warehouse_load", 0.5)),
            "processing_time": float(row.get("processing_time", 2.5)),
            "backlog_orders": int(row.get("backlog", 10)),
            "replay_source": "UCI Online Retail II Real Telemetry"
        }

        # Send to primary topic 'orders'
        producer.send("orders", value=event_payload)
        
        # Send inventory shortage trigger if stock is depleted
        if event_payload["inventory_quantity"] <= 10:
            inv_event = {
                "event_type": "inventory_shortage",
                "warehouse_id": wh_id,
                "product_id": event_payload["product_id"],
                "available_quantity": event_payload["inventory_quantity"],
                "timestamp": str(row.get("invoice_date")),
                "replay_source": "UCI Online Retail II Real Telemetry"
            }
            producer.send("inventory", value=inv_event)

        producer.flush()

        if idx % 50 == 0 or idx == len(records):
            print(f"[REPLAY] Replayed {idx}/{len(records)} events | Current Invoice: {event_payload['order_id']} | Hub: {wh_id}")

        time.sleep(base_delay)

    print("\n[REPLAY] Event Replay completed successfully.")
    producer.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nexora Real Data Event Replay Engine")
    parser.add_argument("--mode", type=str, choices=["real", "demo"], default="real", help="Simulation mode: real or demo")
    parser.add_argument("--speed", type=float, default=100.0, help="Replay speed multiplier: 1.0 (realtime), 10.0, 100.0")
    parser.add_argument("--events", type=int, default=500, help="Number of historical events to replay")
    
    args = parser.parse_args()
    
    if args.mode == "demo":
        from simulator.erp_simulator import main as run_demo
        print("[MODE] Launching existing demo simulation engine...")
        run_demo()
    else:
        run_real_data_replay(speed=args.speed, max_events=args.events)
