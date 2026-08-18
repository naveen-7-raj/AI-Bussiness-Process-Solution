import json
import random
import string
import time
from datetime import datetime, timezone
from kafka import KafkaProducer

# Configuration
KAFKA_BOOTSTRAP_SERVERS = ['localhost:9092']
TOPICS = {
    'orders': 'orders',
    'inventory': 'inventory',
    'warehouse': 'warehouse',
    'logistics': 'logistics',
}

# Simulation parameters
WAREHOUSE_COUNT = 5
PRODUCT_COUNT = 20
WAREHOUSE_IDS = [f'WH{str(i).zfill(2)}' for i in range(1, WAREHOUSE_COUNT + 1)]
PRODUCT_IDS = [f'P{str(i).zfill(3)}' for i in range(1, PRODUCT_COUNT + 1)]

# Initialize inventory: each warehouse holds a random stock for each product
inventory = {
    wh: {prod: random.randint(100, 500) for prod in PRODUCT_IDS}
    for wh in WAREHOUSE_IDS
}

# Set to a scenario name to force first event, or None for random mix.
# Options: 'NORMAL', 'DEMAND_SPIKE', 'INVENTORY_SHORTAGE', 'WAREHOUSE_OVERLOAD'
FORCE_SCENARIO = None  # None → realistic random mix

# Helper functions
def generate_order_id() -> str:
    return 'ORD-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()

def pick_random_product() -> str:
    return random.choice(PRODUCT_IDS)

def pick_random_warehouse() -> str:
    return random.choice(WAREHOUSE_IDS)

def create_event(event_type: str, payload: dict) -> dict:
    return {
        'event_type': event_type,
        'timestamp': current_timestamp(),
        **payload,
    }

def publish_event(producer: KafkaProducer, topic: str, event: dict):
    producer.send(topic, json.dumps(event).encode('utf-8'))
    producer.flush()
    print('KAFKA PRODUCED ->', topic, event['event_type'])

# Scenario generators
def generate_normal_event():
    wh = pick_random_warehouse()
    prod = pick_random_product()
    qty = random.randint(1, 5)
    order_id = generate_order_id()
    inventory[wh][prod] = max(0, inventory[wh][prod] - qty)
    order_event = create_event('order_created', {
        'order_id': order_id,
        'warehouse_id': wh,
        'product_id': prod,
        'quantity': qty,
    })
    return [('orders', order_event)]

def generate_demand_spike_event():
    prod = pick_random_product()
    spike_qty = random.randint(10, 30)
    events = []
    for wh in WAREHOUSE_IDS:
        order_id = generate_order_id()
        inventory[wh][prod] = max(0, inventory[wh][prod] - spike_qty)
        ev = create_event('demand_spike', {
            'order_id': order_id,
            'warehouse_id': wh,
            'product_id': prod,
            'quantity': spike_qty,
        })
        events.append(('orders', ev))
    return events

def generate_inventory_shortage_event():
    wh = pick_random_warehouse()
    prod = pick_random_product()
    inventory[wh][prod] = random.randint(0, 5)
    shortage_event = create_event('inventory_shortage', {
        'warehouse_id': wh,
        'product_id': prod,
        'available_quantity': inventory[wh][prod],
    })
    return [('inventory', shortage_event)]

def generate_warehouse_overload_event():
    wh = pick_random_warehouse()
    backlog = random.randint(20, 50)
    processing_time = random.uniform(2.0, 5.0)
    overload_event = create_event('warehouse_overload', {
        'warehouse_id': wh,
        'backlog_orders': backlog,
        'avg_processing_time_sec': round(processing_time, 2),
    })
    return [('warehouse', overload_event)]

SCENARIO_GENERATORS = {
    'NORMAL': generate_normal_event,
    'DEMAND_SPIKE': generate_demand_spike_event,
    'INVENTORY_SHORTAGE': generate_inventory_shortage_event,
    'WAREHOUSE_OVERLOAD': generate_warehouse_overload_event,
}

def select_scenario() -> str:
    # 40% normal, 20% demand spike, 25% inventory shortage, 15% warehouse overload
    choices = (
        ['NORMAL'] * 4
        + ['DEMAND_SPIKE'] * 2
        + ['INVENTORY_SHORTAGE'] * 3
        + ['WAREHOUSE_OVERLOAD'] * 1
    )
    return random.choice(choices)

def main():
    producer = KafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
    forced = FORCE_SCENARIO
    while True:
        scenario = forced if forced else select_scenario()
        forced = None
        print('EVENT CREATED ->', scenario)
        events = SCENARIO_GENERATORS[scenario]()
        for topic_key, event in events:
            publish_event(producer, TOPICS[topic_key], event)
        time.sleep(random.uniform(2, 4))   # faster for demo

if __name__ == '__main__':
    main()
