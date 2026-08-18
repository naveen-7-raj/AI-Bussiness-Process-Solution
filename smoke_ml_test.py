"""
Smoke test: PostgreSQL → XGBoost → SHAP → Recommendation
Uses the existing INVENTORY_SHORTAGE data (WH01/P001 qty=3) from PostgreSQL.
"""
import asyncio
import asyncpg
import os
import sys

# ── paths so backend imports work ────────────────────────────────────────────
sys.path.insert(0, ".")
sys.path.insert(0, "backend")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/app_db")

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

results = {}

# ─── 1. PostgreSQL: read the current business state ──────────────────────────
async def read_pg_state():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        inv = await conn.fetchrow(
            "SELECT available_quantity FROM inventory WHERE warehouse_id=$1 AND product_id=$2",
            "WH01", "P001"
        )
        wh = await conn.fetchrow(
            "SELECT backlog_orders, avg_processing_time_sec FROM warehouses WHERE warehouse_id=$1",
            "WH01"
        )
        return inv, wh
    finally:
        await conn.close()

try:
    inv, wh = asyncio.run(read_pg_state())
    if inv is None:
        raise RuntimeError("No inventory row found for WH01/P001 — run the simulator first")

    qty = int(inv["available_quantity"])
    backlog = int(wh["backlog_orders"]) if wh else 12
    proc_time = float(wh["avg_processing_time_sec"]) if wh else 2.5

    print(f"  [PostgreSQL]  inventory qty={qty}, backlog={backlog}, proc_time={proc_time}")
    results["PostgreSQL"] = True
except Exception as e:
    print(f"  [PostgreSQL]  ERROR: {e}")
    results["PostgreSQL"] = False

# ─── Build feature row (mirrors backend.build_ml_feature_row logic) ──────────
if results.get("PostgreSQL"):
    warehouse_load = min(1.0, max(0.2, backlog / 100.0)) if backlog > 0 else 0.2
    demand_rate    = max(0.25, min(3.0, qty / 10.0)) if qty > 0 else 1.5
    orders_per_hour = max(1, int(qty * 0.75)) if qty > 0 else 12

    if proc_time <= 0:
        proc_time = 2.5

    features = {
        "inventory_quantity": max(0, qty),
        "orders_per_hour":    max(1, orders_per_hour),
        "demand_rate":        max(0.1, demand_rate),
        "warehouse_load":     max(0.0, min(1.0, warehouse_load)),
        "processing_time":    max(0.1, proc_time),
        "backlog":            max(0, backlog),
    }
    print(f"  [Features]    {features}")

# ─── 2. XGBoost prediction ────────────────────────────────────────────────────
try:
    from ml.predict import predict_delay
    result = predict_delay(features)
    delay_prob  = result["delay_probability"]
    risk_level  = result["risk_level"]
    delay_mins  = result["predicted_delay_minutes"]
    explanations = result["explanations"]

    print(f"  [XGBoost]     delay_probability={delay_prob}, risk={risk_level}, delay_mins={delay_mins}")

    # Force high risk for qty ≤ 5 (mirrors backend override)
    if qty <= 5:
        delay_prob = max(delay_prob, 0.91)
        risk_level = "high"
        delay_mins = max(delay_mins, 82.0)
        print(f"  [XGBoost]     Override applied (qty<=5): delay_probability={delay_prob}, risk=high")

    results["XGBoost"] = True
except Exception as e:
    import traceback; traceback.print_exc()
    print(f"  [XGBoost]     ERROR: {e}")
    results["XGBoost"] = False

# ─── 3. SHAP explanations ────────────────────────────────────────────────────
try:
    from ml.predict import get_feature_explanations
    if risk_level == "high":
        shap_exps = get_feature_explanations(features)
        if not shap_exps:
            raise RuntimeError("SHAP returned empty explanations for a high-risk event")
        for exp in shap_exps:
            print(f"  [SHAP]        {exp['feature']}: contribution={exp['contribution']:.4f} ({exp['direction']})")
        results["SHAP"] = True
    else:
        print(f"  [SHAP]        Skipped (risk={risk_level}, not high) — OK by design")
        results["SHAP"] = True
except Exception as e:
    import traceback; traceback.print_exc()
    print(f"  [SHAP]        ERROR: {e}")
    results["SHAP"] = False

# ─── 4. Recommendation ───────────────────────────────────────────────────────
async def get_recommendation():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        from recommendations_engine import generate_recommendations
        recs = await generate_recommendations(conn)
        matching = [r for r in recs if r.target_warehouse == "WH01" or r.source_warehouse == "WH01"]
        return recs, matching
    finally:
        await conn.close()

try:
    recs, matching = asyncio.run(get_recommendation())
    if matching:
        best = matching[0]
        print(f"  [Recommendation] {best.recommended_action} — {best.reason}")
    elif recs:
        # No WH01-specific rec, but engine ran without error
        print(f"  [Recommendation] Engine returned {len(recs)} recs (none for WH01 specifically — OK)")
    else:
        print(f"  [Recommendation] Engine returned 0 recommendations (no shortage/overload detected yet)")
    results["Recommendation"] = True
except Exception as e:
    import traceback; traceback.print_exc()
    print(f"  [Recommendation] ERROR: {e}")
    results["Recommendation"] = False

# ─── Summary ─────────────────────────────────────────────────────────────────
print()
print("=" * 50)
print("SMOKE TEST RESULTS")
print("=" * 50)
for stage, ok in results.items():
    status = PASS if ok else FAIL
    print(f"  {stage:<20} {status}")

all_pass = all(results.values())
print()
print(f"OVERALL: {'PASS' if all_pass else 'FAIL'}")
sys.exit(0 if all_pass else 1)
