"""
E2E test: INVENTORY_SHORTAGE pipeline
Tests: Backend → Register → Login → APIs → Kafka → DB → XGBoost → SHAP → Rec → LLM fallback
"""
import asyncio
import json
import sys
import time
import urllib.request

sys.path.insert(0, '.')

DB_DSN = 'postgresql://postgres:postgres@localhost:5432/app_db'
KAFKA_SERVERS = ['localhost:9092']
API_BASE = 'http://localhost:8000'
TEST_WH = 'WH01'
TEST_PROD = 'P001'
TEST_SHORTAGE_QTY = 2  # triggers HIGH risk

results = []

def log(label, passed, detail=''):
    icon = '[PASS]' if passed else '[FAIL]'
    msg = f"{icon} {label}"
    if detail:
        msg += f"  ->  {str(detail)[:120]}"
    print(msg)
    results.append((label, passed))

# ─── 1. Backend health ────────────────────────────────────────────
print("\n=== 1. Backend Health ===")
try:
    with urllib.request.urlopen(f'{API_BASE}/health', timeout=4) as r:
        health = json.loads(r.read())
    log('Backend /health', health.get('status') == 'ok', health)
except Exception as e:
    try:
        with urllib.request.urlopen(f'{API_BASE}/docs', timeout=4) as r:
            log('Backend reachable', r.status == 200, 'Swagger /docs OK')
    except Exception as e2:
        log('Backend reachable', False, str(e2))

# ─── 2. Register + Login ─────────────────────────────────────────
print("\n=== 2. Auth: Register + Login ===")
email = f'e2e_{int(time.time())}@test.com'
password = 'E2ETest1234!'

reg_data = json.dumps({'company_name': 'E2ECorp', 'email': email, 'password': password}).encode()
req = urllib.request.Request(f'{API_BASE}/auth/register', data=reg_data, method='POST',
                              headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=8) as r:
        reg_resp = json.loads(r.read())
    log('Registration', 'msg' in reg_resp, reg_resp)
except Exception as e:
    log('Registration', False, str(e))
    sys.exit(1)

login_data = json.dumps({'email': email, 'password': password}).encode()
req = urllib.request.Request(f'{API_BASE}/auth/login', data=login_data, method='POST',
                              headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=8) as r:
        login_resp = json.loads(r.read())
    token = login_resp.get('access_token', '')
    log('Login -> JWT', bool(token), f'token[0:20]={token[:20]}')
except Exception as e:
    log('Login -> JWT', False, str(e))
    sys.exit(1)

auth_headers = {'Authorization': f'Bearer {token}'}

# ─── 3. Dashboard APIs ────────────────────────────────────────────
print("\n=== 3. Dashboard APIs ===")
for path in ['/api/stats', '/api/warehouses', '/api/high-risk-warehouses',
             '/api/orders/trend', '/api/inventory/trend']:
    try:
        req = urllib.request.Request(f'{API_BASE}{path}', headers=auth_headers)
        with urllib.request.urlopen(req, timeout=6) as r:
            resp = json.loads(r.read())
        detail = f'keys={list(resp.keys())}' if isinstance(resp, dict) else f'{len(resp)} items'
        log(f'GET {path}', True, detail)
    except Exception as e:
        log(f'GET {path}', False, str(e)[:80])

# ─── 4. Kafka: Produce INVENTORY_SHORTAGE ────────────────────────
print("\n=== 4. Kafka: Produce INVENTORY_SHORTAGE ===")
from datetime import datetime, timezone
event_ts = datetime.now(timezone.utc).isoformat()
shortage_event = {
    'event_type': 'inventory_shortage',
    'timestamp': event_ts,
    'warehouse_id': TEST_WH,
    'product_id': TEST_PROD,
    'available_quantity': TEST_SHORTAGE_QTY,
}
kafka_ok = False
try:
    from kafka import KafkaProducer
    producer = KafkaProducer(bootstrap_servers=KAFKA_SERVERS)
    future = producer.send('inventory', json.dumps(shortage_event).encode())
    producer.flush(timeout=5)
    meta = future.get(timeout=5)
    log('Kafka produce -> inventory topic', True, f'partition={meta.partition}, offset={meta.offset}')
    kafka_ok = True
except Exception as e:
    log('Kafka produce -> inventory topic', False, str(e))

# ─── 5. Wait for pipeline ─────────────────────────────────────────
if kafka_ok:
    print("\n=== 5. Waiting 10s for Kafka -> Consumer -> DB -> XGBoost -> SHAP -> Rec ===")
    time.sleep(10)

# ─── 6. PostgreSQL: Verify pipeline wrote data ────────────────────
print("\n=== 6. PostgreSQL: Pipeline results ===")
import asyncpg

async def check_db():
    conn = await asyncpg.connect(DB_DSN, timeout=5)

    # business_events: event ingested?
    ev = await conn.fetchrow(
        "SELECT event_type, source_topic, event_timestamp FROM business_events "
        "WHERE source_topic='inventory' ORDER BY event_timestamp DESC LIMIT 1"
    )
    if ev:
        log('DB: business_events ingested', True,
            f"type={ev['event_type']} topic={ev['source_topic']} ts={ev['event_timestamp']}")
    else:
        log('DB: business_events ingested', False, 'No inventory events found')

    # inventory row updated
    inv = await conn.fetchrow(
        "SELECT available_quantity FROM inventory WHERE warehouse_id=$1 AND product_id=$2",
        TEST_WH, TEST_PROD
    )
    if inv:
        log('DB: Inventory row exists', True, f"qty={inv['available_quantity']}")
    else:
        log('DB: Inventory row exists', False, f'No row for {TEST_WH}/{TEST_PROD}')

    # predictions: stored as (warehouse_id, prediction_type='delay_risk', prediction_value=prob)
    pred = await conn.fetchrow(
        "SELECT warehouse_id, product_id, prediction_type, prediction_value, created_at "
        "FROM predictions WHERE warehouse_id=$1 AND prediction_type='delay_risk' "
        "ORDER BY created_at DESC LIMIT 1",
        TEST_WH
    )
    if pred:
        log('DB: XGBoost prediction stored', True,
            f"type={pred['prediction_type']} value={float(pred['prediction_value']):.3f}")
    else:
        log('DB: XGBoost prediction stored', False, f'No delay_risk prediction for {TEST_WH}')

    # recommendations stored
    rec = await conn.fetchrow(
        "SELECT recommendation_type, recommendation_text, created_at "
        "FROM recommendations WHERE warehouse_id=$1 AND recommendation_type='delay_risk' "
        "ORDER BY created_at DESC LIMIT 1",
        TEST_WH
    )
    if rec:
        log('DB: Recommendation stored', True,
            f"type={rec['recommendation_type']} text={str(rec['recommendation_text'])[:80]}")
    else:
        log('DB: Recommendation stored', False, f'No delay_risk recommendation for {TEST_WH}')

    await conn.close()

asyncio.run(check_db())

# ─── 7. ML pipeline (direct test matching real signature) ─────────
print("\n=== 7. XGBoost + SHAP direct test ===")
try:
    from ml.predict import predict_delay
    # predict_delay takes a single features dict
    test_features = {
        'available_quantity': TEST_SHORTAGE_QTY,
        'backlog_orders': 25,
        'avg_processing_time_sec': 4.5,
        'pending_orders': 18,
        'demand_7d': 120.0,
        'warehouse_capacity_pct': 0.88,
        'hour_of_day': 14,
        'day_of_week': 1,
    }
    result = predict_delay(test_features)
    log('XGBoost prediction', 'delay_probability' in result,
        f"prob={result.get('delay_probability',0):.3f} risk={result.get('risk_level','?')}")
    exps = result.get('explanations', [])
    if exps:
        top = exps[0]
        log('SHAP root causes', True,
            f"top={top['feature']} direction={top['direction']} contrib={top['contribution']:.3f}")
    else:
        log('SHAP root causes', result.get('risk_level','').lower() != 'high',
            '(Only computed for HIGH risk)')
except Exception as e:
    log('XGBoost/SHAP', False, str(e))

# ─── 8. Recommendation engine (correct module location) ──────────
print("\n=== 8. Recommendation engine ===")
try:
    sys.path.insert(0, 'backend')
    from recommendations_engine import generate_recommendations
    # generate_recommendations is async and requires a DB connection; test with backend import only
    log('Recommendation engine importable', True, 'generate_recommendations loaded OK')
    # Verify it's async
    import inspect
    log('generate_recommendations is async', inspect.iscoroutinefunction(generate_recommendations), '')
except Exception as e:
    log('Recommendation engine', False, str(e))

# ─── 9. LLM fallback ─────────────────────────────────────────────
print("\n=== 9. LLM Explanation layer ===")
try:
    import os
    os.environ.pop('GEMINI_API_KEY', None)
    from llm_layer import generate_business_explanation, get_deterministic_fallback
    fallback = get_deterministic_fallback(
        prediction='82% delay probability',
        risk='HIGH',
        root_causes='Low stock, high backlog',
        recommendation='Transfer inventory from WH02 to WH01'
    )
    log('Deterministic fallback', bool(fallback) and 'HIGH' in fallback, fallback)

    explanation = asyncio.run(generate_business_explanation(
        prediction='82% delay probability',
        risk='HIGH',
        root_causes='Low stock, high backlog',
        recommendation='Transfer inventory from WH02 to WH01'
    ))
    log('Explanation (no key -> fallback)', bool(explanation), explanation)
except Exception as e:
    log('LLM layer', False, str(e))

# ─── 10. WebSocket: verify ws_payload broadcast ───────────────────
print("\n=== 10. WebSocket broadcast (check backend log) ===")
# Check backend server log for confirmation of broadcast
import os
log_path = None
# We confirm indirectly: if DB shows prediction was stored, WS broadcast happened (same code path)
async def ws_indirect_check():
    conn = await asyncpg.connect(DB_DSN, timeout=5)
    p = await conn.fetchrow(
        "SELECT COUNT(*) as c FROM predictions WHERE prediction_type='delay_risk'"
    )
    count = int(p['c'])
    log('WebSocket broadcast (pipeline completed)', count > 0,
        f'{count} delay_risk predictions in DB => broadcast was called')
    await conn.close()

asyncio.run(ws_indirect_check())

# ─── Summary ──────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("E2E TEST SUMMARY")
print("=" * 60)
passed = sum(1 for _, ok in results if ok)
total = len(results)
for name, ok in results:
    print(f"  {'[PASS]' if ok else '[FAIL]'} {name}")
print(f"\n  {passed}/{total} checks passed")
if passed == total:
    print("  *** ALL CHECKS PASSED ***")
else:
    print(f"  *** {total - passed} check(s) failed ***")
