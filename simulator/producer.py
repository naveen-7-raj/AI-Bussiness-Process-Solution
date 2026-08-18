import json
import time
import random
import uuid
from datetime import datetime
from kafka import KafkaProducer, KafkaAdminClient
from kafka.admin import NewTopic

KAFKA_BROKER = "localhost:9092"
TOPICS = ["orders", "inventory", "warehouse", "logistics"]

def ensure_topics():
    admin = KafkaAdminClient(bootstrap_servers=KAFKA_BROKER)
    existing = admin.list_topics()
    new_topics = []
    for t in TOPICS:
        if t not in existing:
            new_topics.append(NewTopic(name=t, num_partitions=1, replication_factor=1))
    if new_topics:
        admin.create_topics(new_topics=new_topics, validate_only=False)
        print(f"TOPICS CREATED: {', '.join([t.name for t in new_topics])}")
    admin.close()

def random_event(topic: str) -> dict:
    base = {
        "event_id": str(uuid.uuid4()),
        "event_type": f"{topic}_event",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    if topic == "orders":
        base.update({
            "order_id": f"ORD{random.randint(1000, 9999)}",
            "customer_id": f"CUST{random.randint(100, 999)}",
            "total": round(random.uniform(10, 500), 2),
        })
    elif topic == "inventory":
        base.update({
            "warehouse_id": f"WH{random.randint(1,5):02d}",
            "product_id": f"P{random.randint(100, 999)}",
            "quantity": random.randint(1, 1000),
        })
    elif topic == "warehouse":
        base.update({
            "warehouse_id": f"WH{random.randint(1,5):02d}",
            "status": random.choice(["idle", "busy", "maintenance"]),
        })
    elif topic == "logistics":
        base.update({
            "shipment_id": f"SHIP{random.randint(1000, 9999)}",
            "origin": random.choice(["NY", "LA", "CHI"]),
            "destination": random.choice(["TX", "FL", "WA"]),
            "status": random.choice(["in_transit", "delivered", "delayed"]),
        })
    return base

def main():
    ensure_topics()
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    print("[PRODUCER] Started – sending events")
    try:
        while True:
            for topic in TOPICS:
                event = random_event(topic)
                print(f"EVENT CREATED: {event}")
                producer.send(topic, value=event)
                producer.flush()
                print(f"KAFKA PRODUCED to {topic}")
                time.sleep(1)
    except KeyboardInterrupt:
        print("[PRODUCER] Stopped by user")
    finally:
        producer.close()

if __name__ == "__main__":
    main()
